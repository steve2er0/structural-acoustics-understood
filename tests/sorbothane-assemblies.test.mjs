import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SORBOTHANE_BUSHING_CATALOG } from '../js/sorbothane-data.js';
import { SORBOTHANE_ASSEMBLY_PARTS, sorbothaneAssemblyBillOfMaterials } from '../js/sorbothane-assemblies.js';
import { DEFAULT_SORBOTHANE_CONFIG, SORBOTHANE_UNITS, normalizeSorbothaneConfig, staticPreloadState, analyzeSorbothaneIsolation, isolationMountCoordinates, isolationMountStiffnesses, assembleRigidBodyStiffness, rigidBodyMassMatrix, rigidBodyResponseAtFrequency, runDesignGrid, screenSorbothaneCatalog, screenSorbothaneCatalogAsync } from '../js/sorbothane-analysis.js';
import { generateNastranIsolationBdf } from '../js/nastran-isolation-export.js';
import { catalogScreenResult, engineeringReport, renderSorbothaneExplorerResult, renderSorbothaneIsolationWorkbench, sorbothaneExplorerVariableDefaults } from '../js/sorbothane-isolation.js';

const { INCH, LBF, LB } = SORBOTHANE_UNITS;
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(actual), Math.abs(expected)), `${actual} != ${expected}`);
const fixture = () => {
  const config = normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG);
  config.uncertainty.enabled = false;
  config.component.massKg = 25 * LB;
  config.mounts.count = 8;
  config.assemblies.enabled = true;
  config.assemblies.assignments = Array(8).fill('A');
  for (const group of Object.values(config.assemblies.groups)) Object.assign(group, {
    topProductNumber: '0510005-70-10', bottomProductNumber: '0510001-70-10',
    topCount: 1, bottomCount: 1, compressionPct: 15,
    boltDiameterM: .25 * INCH, holeDiameterM: .47 * INCH, gripThicknessM: .12 * INCH
  });
  return config;
};

test('bushing catalog transcribes all 15 records and five drawing dimensions without hardness scaling', () => {
  assert.equal(SORBOTHANE_BUSHING_CATALOG.length, 15);
  assert.equal(SORBOTHANE_ASSEMBLY_PARTS.length, 147);
  assert.equal(new Set(SORBOTHANE_BUSHING_CATALOG.map(item=>item.productNumber)).size, 15);
  for (const item of SORBOTHANE_BUSHING_CATALOG) {
    assert.deepEqual(Object.keys(item.dimensions), ['A','B','C','D','E']);
    assert.ok(item.odIn > item.sleeveOdIn && item.sleeveOdIn > item.idIn);
    assert.ok(item.overallHeightIn > item.flangeThicknessIn);
    assert.equal(item.sourcePage, 6);
    assert.equal(item.provenance, 'manufacturer-published');
  }
  assert.deepEqual(SORBOTHANE_BUSHING_CATALOG.find(item=>item.productNumber==='0510005-70-10').ratedLoadLb, [24,60]);
  assert.deepEqual(SORBOTHANE_BUSHING_CATALOG.find(item=>item.productNumber==='0510030-50-10').ratedLoadLb, [.75,1.75]);
});

test('assembly mode is opt-in and disabled assembly settings cannot change legacy mechanics', () => {
  const original = normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG);
  original.uncertainty.enabled = false;
  const changed = structuredClone(original);
  changed.assemblies.groups.A.topProductNumber = '0510005-70-10';
  changed.assemblies.groups.A.radialMode = 'user';
  changed.assemblies.groups.A.radialRateLbfPerIn = 9999;
  const baseline = analyzeSorbothaneIsolation(original,{skipResponse:true,skipUncertainty:true});
  const actual = analyzeSorbothaneIsolation(changed,{skipResponse:true,skipUncertainty:true});
  for (const key of ['modes','preload','toneResults','peakResults','passes']) assert.deepEqual(actual[key],baseline[key]);
});

test('assembly configuration normalization and JSON round-trip retain leg assignments, parts, counts and fit dimensions', () => {
  const config = fixture();
  config.assemblies.assignments[4] = 'B';
  const normalized = normalizeSorbothaneConfig(JSON.parse(JSON.stringify(config)));
  assert.deepEqual(normalized.assemblies, config.assemblies);
  normalized.assemblies.groups.B.topCount = 99;
  normalized.assemblies.groups.B.boltDiameterM = -1;
  normalized.assemblies.groups.B.topProductNumber = 'not-a-part';
  const clamped = normalizeSorbothaneConfig(normalized);
  assert.equal(clamped.assemblies.groups.B.topCount, 8);
  assert.equal(clamped.assemblies.groups.B.boltDiameterM, 0);
  assert.equal(clamped.assemblies.groups.B.topProductNumber, 'current-element');
});

test('mixed static solution closes all six force and moment equations with offset CG and acceleration', () => {
  const config = fixture();
  config.assemblies.assignments = ['A','B','B','A','A','B','B','A'];
  Object.assign(config.assemblies.groups.B, { topProductNumber:'0510015-50-10',bottomProductNumber:'0510015-50-10' });
  config.component.cgM = [.2*INCH, -.1*INCH, 1.7*INCH];
  config.environment.accelerationG = [.1, -.15, .2];
  const state = staticPreloadState(config);
  assert.equal(state.converged, true);
  assert.ok(Math.max(...state.residual.map(Math.abs)) < 1e-5);
  const force = [0,0,0], moment = [0,0,0];
  state.mounts.forEach(mount=>{
    const [x,y,z] = mount.positionM, [fx,fy,fz] = mount.reactionN;
    [fx,fy,fz].forEach((v,i)=>force[i]+=v);
    moment[0]+=y*fz-z*fy; moment[1]+=z*fx-x*fz; moment[2]+=x*fy-y*fx;
    close(mount.payloadN, mount.lowerLoadN-mount.upperLoadN);
  });
  const weight=config.component.massKg*9.80665;
  force.forEach((value,index)=>close(value,weight*[.1,-.15,1.2][index]));
  moment.forEach(value=>close(value,0));
});

test('stiffer mixed legs attract more payload instead of receiving an imposed equal mass share', () => {
  const config=fixture();
  config.assemblies.assignments=['A','B','B','A','A','B','B','A'];
  Object.assign(config.assemblies.groups.A,{topProductNumber:'0510825-70-10',bottomProductNumber:'0510825-70-10'});
  Object.assign(config.assemblies.groups.B,{topProductNumber:'0510825-30-10',bottomProductNumber:'0510825-30-10'});
  const state=staticPreloadState(config);
  const a=state.mounts.filter(m=>m.group==='A').reduce((sum,m)=>sum+m.payloadN,0);
  const b=state.mounts.filter(m=>m.group==='B').reduce((sum,m)=>sum+m.payloadN,0);
  assert.ok(a > 3*b, `${a} should substantially exceed ${b}`);
  close(a+b,config.component.massKg*9.80665);
});

test('an asymmetric upper/lower assembly uses a common clamp force, not equal compression or summed capacity', () => {
  const config=fixture();
  config.assemblies.groups.A.preloadMode='force';
  config.assemblies.groups.A.preloadN=30*LBF;
  const state=staticPreloadState(config);
  assert.equal(state.converged,true);
  const mount=state.mounts[0];
  close(mount.profile.preloadN,30*LBF);
  assert.notEqual(mount.profile.top.nominalPct,mount.profile.bottom.nominalPct);
  assert.deepEqual(mount.topItem.ratedLoadLb,[24,60]);
  assert.deepEqual(mount.bottomItem.ratedLoadLb,[15,35]);
  assert.ok(state.assemblyChecks.find(c=>c.id==='load-0-upper').detail.includes('24–60'));
  assert.ok(state.assemblyChecks.find(c=>c.id==='load-0-lower').detail.includes('15–35'));
});

test('bushing flange approximation remains REVIEW even when geometry and installed load checks pass', () => {
  const config=fixture();
  const result=analyzeSorbothaneIsolation(config,{skipResponse:true,skipUncertainty:true});
  assert.equal(result.preload.converged,true);
  assert.ok(result.preload.assemblyChecks.filter(c=>c.code==='FIT').every(c=>c.pass));
  assert.equal(result.preload.catalogCompliant,true);
  assert.equal(result.preload.compressionCompliant,true);
  assert.equal(result.passes,false);
  assert.equal(result.preload.assemblyChecks.find(c=>c.id==='model-A').pass,false);
  assert.match(result.warnings.join(' '),/No catalog radial rate is assumed/);
});

test('bore interference, sleeve reach, invalid bushing stacks and zero radial input have explicit review flags', () => {
  const config=fixture();
  Object.assign(config.assemblies.groups.A,{boltDiameterM:.28*INCH,gripThicknessM:.2*INCH,topCount:2,radialMode:'user',radialRateLbfPerIn:0});
  const state=staticPreloadState(config);
  for (const id of ['fit-A-upper-bolt','fit-A-sleeves','fit-A-upper-stack','radial-A']) assert.equal(state.assemblyChecks.find(c=>c.id===id).pass,false);
  assert.match(state.assemblyChecks.find(c=>c.id==='radial-A').detail,/used temporarily/);
  assert.ok(isolationMountStiffnesses(config,100).every(m=>m.kxNPerM>0));
});

test('mixed complex stiffness is symmetric, positive in storage and retains different directional loss factors', () => {
  const config=fixture();
  config.assemblies.groups.A.bottomProductNumber='0510015-30-10';
  const result=assembleRigidBodyStiffness(config,120);
  assert.equal(result.mounts.length,8);
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){close(result.matrix[i][j],result.matrix[j][i]);close(result.lossMatrix[i][j],result.lossMatrix[j][i]);}
  result.matrix.forEach((row,i)=>assert.ok(row[i]>0));
  const mount=result.mounts[0];
  assert.ok(Math.abs(mount.lossNPerM[0]/mount.kxNPerM-mount.lossNPerM[2]/mount.kzNPerM)>1e-4);
});

test('flat-part assemblies also flag metal bolt interference and an unsupported bearing footprint', () => {
  const config=fixture();
  Object.assign(config.assemblies.groups.A,{topProductNumber:'0510001-70-10',bottomProductNumber:'0510001-70-10',holeDiameterM:.2*INCH});
  let state=staticPreloadState(config);
  assert.equal(state.assemblyChecks.find(c=>c.id==='fit-A-bolt-hole').pass,false);
  config.assemblies.groups.A.holeDiameterM=1.1*INCH;
  state=staticPreloadState(config);
  assert.equal(state.assemblyChecks.find(c=>c.id==='fit-A-upper-footprint').pass,false);
  config.assemblies.groups.A.holeDiameterM=.6*INCH;
  state=staticPreloadState(config);
  assert.equal(state.assemblyChecks.find(c=>c.id==='bearing-face-A-upper').pass,false);
});

test('mixed base response satisfies the assembled complex dynamic-stiffness equations', () => {
  const config=fixture(), f=123, omega=2*Math.PI*f;
  const stiffness=assembleRigidBodyStiffness(config,f), mass=rigidBodyMassMatrix(config).matrix;
  const response=rigidBodyResponseAtFrequency(config,f,'x');
  const relative=response.complex.map((value,i)=>({re:value.re-(i===0?1:0),im:value.im}));
  for(let i=0;i<6;i++){
    let re=0,im=0;
    for(let j=0;j<6;j++){
      const a=stiffness.matrix[i][j]-omega**2*mass[i][j], b=stiffness.lossMatrix[i][j];
      re+=a*relative[j].re-b*relative[j].im; im+=a*relative[j].im+b*relative[j].re;
    }
    close(re,omega**2*mass[i][0],1e-6);close(im,0,1e-6);
  }
});

test('mixed BDF gives every CBUSH its own per-leg storage and directional loss property', () => {
  const config=fixture();
  config.assemblies.assignments=['A','B','B','A','A','B','B','A'];
  Object.assign(config.assemblies.groups.B,{topProductNumber:'0510825-50-10',bottomProductNumber:'0510825-50-10'});
  const model=generateNastranIsolationBdf(config);
  assert.equal(model.counts.pbush,8);
  assert.equal((model.deck.match(/^PBUSH,/gm)??[]).length,8);
  assert.equal((model.deck.match(/^CBUSH,/gm)??[]).length,8);
  assert.equal(new Set(model.deck.split('\n').filter(line=>line.startsWith('CBUSH,')).map(line=>line.split(',')[2])).size,8);
  const expected=isolationMountStiffnesses(config,model.isolators.referenceFrequencyHz);
  model.isolators.supportProperties.forEach((property,index)=>{
    close(property.rates[2],expected[index].kzNPerM*INCH/LBF);
    close(property.lossFactors[0],expected[index].lossNPerM[0]/expected[index].kxNPerM);
  });
  assert.match(model.warnings.join(' '),/Each leg has its own PBUSH/);
});

test('BOM counts upper/lower parts at all assigned legs and keeps bushing/washer identity separate', () => {
  const config=fixture();
  config.assemblies.assignments[7]='B';
  config.assemblies.groups.B.topProductNumber='0510825-70-10';
  config.assemblies.groups.B.bottomCount=2;
  const bom=sorbothaneAssemblyBillOfMaterials(config);
  assert.equal(bom.find(i=>i.productNumber==='0510005-70-10').quantity,7);
  assert.equal(bom.find(i=>i.productNumber==='0510001-70-10').quantity,9);
  assert.equal(bom.find(i=>i.productNumber==='0510825-70-10').quantity,1);
});

test('mixed-system hero and BDF reference use the most Z-participating mode instead of a classification fallback', () => {
  const config=fixture();
  config.component.massKg=10*LB;
  config.assemblies.assignments=['A','A','A','A','B','B','B','B'];
  Object.assign(config.assemblies.groups.B,{topProductNumber:'0510825-70-10',bottomProductNumber:'0510825-70-10'});
  const analysis=analyzeSorbothaneIsolation(config,{skipResponse:true,skipUncertainty:true});
  const legacy=analysis.modes.find(mode=>mode.dominantIndex===2)??analysis.modes[2];
  assert.notEqual(legacy.number,analysis.verticalModeResult.modeNumber,'fixture must exercise coupled Z motion rather than a pure bounce classification');
  const html=renderSorbothaneIsolationWorkbench(config,{}, {},analysis);
  const expected=Number(analysis.verticalModeResult.frequencyHz.toFixed(1)).toString();
  assert.ok(html.includes(`data-sorbo-hero-mode>${expected} Hz`));
  close(generateNastranIsolationBdf(config,analysis).isolators.referenceFrequencyHz,analysis.verticalModeResult.frequencyHz);
  close(generateNastranIsolationBdf(config).isolators.referenceFrequencyHz,analysis.verticalModeResult.frequencyHz);
});

test('assembly matrix varies real group settings, retains hardware assignments and exposes model/fit/load criteria', () => {
  const config=fixture(), snapshot=structuredClone(config);
  const ranges=sorbothaneExplorerVariableDefaults(config);
  assert.ok(ranges.assemblyCompressionA && !ranges.thickness);
  const grid=runDesignGrid(config,{xVariable:'assemblyCompressionA',yVariable:'mass',xRange:[12,18],yRange:[20,30],gridSize:3});
  assert.equal(grid.cells.flat().length,9);
  assert.ok(grid.cells.flat().every(cell=>!cell.pass&&cell.failures.some(check=>check.code==='MODEL')));
  assert.equal(grid.cells[1][0].config.assemblies.groups.A.compressionPct,12);
  assert.notEqual(grid.cells[1][0].analysis.preload.preloadN,grid.cells[1][2].analysis.preload.preloadN);
  assert.deepEqual(config,snapshot);
  const html=renderSorbothaneExplorerResult(grid);
  assert.match(html,/Mixed Sorbothane assemblies/);
  assert.match(html,/No catalog radial rate is assumed/);
});

test('assembly catalog screening replaces only the selected group/side and preserves REVIEW candidates', async () => {
  const config=fixture(), snapshot=structuredClone(config), progress=[];
  const filters={geometry:'bushing',odRange:[.99,1.01],idRange:[.279,.281],thicknessRange:[.189,.191],stackRange:[1,3],assemblyGroup:'A',assemblySide:'top'};
  const result=await screenSorbothaneCatalogAsync(config,filters,{batchSize:1,yieldControl:async()=>{},onProgress:event=>progress.push(event.percent)});
  assert.equal(result.eligiblePartCount,3);
  assert.equal(result.combinationCount,3,'bushings are never blindly stacked');
  assert.equal(result.recommendations.length,0);
  assert.equal(result.nearMisses.length,3);
  for(const item of result.nearMisses){assert.equal(item.config.assemblies.groups.A.bottomProductNumber,snapshot.assemblies.groups.A.bottomProductNumber);assert.equal(item.config.assemblies.groups.A.topProductNumber,item.item.productNumber);assert.equal(item.config.assemblies.groups.A.topCount,1);assert.equal(item.pass,false);}
  assert.deepEqual(result.assemblyTarget,{group:'A',side:'top'});
  assert.equal(progress.at(-1),100);
  assert.deepEqual(config,snapshot);
  assert.throws(()=>screenSorbothaneCatalog(config,{...filters,assemblyGroup:'B'}),/Assign at least one leg/);
});

test('assembly sweeps reject unused groups and invalid rates and preserve a force-driven current-design reference', () => {
  const config=fixture();
  const unused=runDesignGrid(config,{xVariable:'assemblyCompressionB',yVariable:'mass',xRange:[12,18],yRange:[20,30],gridSize:3});
  assert.ok(unused.cells.flat().every(cell=>!cell.pass && /No legs are assigned/.test(cell.failures[0].detail)));
  const invalid=runDesignGrid(config,{xVariable:'assemblyRadialA',yVariable:'mass',xRange:[-10,0],yRange:[20,30],gridSize:3});
  assert.ok(invalid.cells.flat().every(cell=>!cell.pass && /positive user rates/.test(cell.failures[0].detail)));
  config.assemblies.groups.A.preloadMode='force';
  config.assemblies.groups.A.preloadN=30*LBF;
  const nominal=staticPreloadState(config).mounts[0].profile.bottom.nominalPct;
  const grid=runDesignGrid(config,{xVariable:'assemblyCompressionA',yVariable:'mass',xRange:[nominal-.1,nominal+.1],yRange:[24,26],gridSize:3});
  assert.equal(grid.cells[1][1].isReference,true);
  close(grid.cells[1][1].analysis.preload.preloadN,30*LBF);
});

test('assembly screening load range, clamp and quantity refer to the candidate part rather than unrelated legs', () => {
  const config=fixture();
  config.assemblies.assignments=['A','A','A','A','B','B','B','B'];
  Object.assign(config.assemblies.groups.B,{topProductNumber:'0510825-70-10',bottomProductNumber:'0510825-70-10'});
  const filters={geometry:'bushing',odRange:[.99,1.01],idRange:[.279,.281],thicknessRange:[.189,.191],stackRange:[1,1],assemblyGroup:'A',assemblySide:'top'};
  const screen=screenSorbothaneCatalog(config,filters);
  const candidate=screen.nearMisses.find(item=>item.item.productNumber==='0510005-70-10');
  assert.ok(candidate);
  const actual=candidate.analysis.preload.mounts.filter(m=>m.group==='A').map(m=>m.upperLoadN/LBF);
  close(candidate.installedLoadRangeLb[0],Math.min(...actual));
  close(candidate.installedLoadRangeLb[1],Math.max(...actual));
  assert.equal(candidate.totalElementCount,4);
  assert.ok(candidate.analysis.preload.mounts.some(m=>m.group==='B'&&m.upperLoadN/LBF>candidate.installedLoadRangeLb[1]*2));
  close(candidate.nominalPreloadN,candidate.analysis.preload.mounts[0].profile.preloadN);
  const b=screenSorbothaneCatalog(config,{geometry:'ring',odRange:[1.99,2.01],idRange:[.49,.51],thicknessRange:[.49,.51],stackRange:[1,1],assemblyGroup:'B',assemblySide:'bottom'});
  const selected=b.nearMisses.find(item=>item.item.productNumber==='0510825-70-10');
  assert.ok(selected);
  close(selected.nominalPreloadN,selected.analysis.preload.mounts.find(m=>m.group==='B').profile.preloadN);
  assert.notEqual(selected.nominalPreloadN,selected.analysis.preload.preloadN);
  assert.equal(selected.totalElementCount,8);
});

test('assembly UI and report expose complete geometry, active assignments, BOM and model limitations', () => {
  const config=fixture(), analysis=analyzeSorbothaneIsolation(config,{skipResponse:true,skipUncertainty:true});
  const html=renderSorbothaneIsolationWorkbench(config,{}, {},analysis);
  assert.match(html,/data-assembly-enable checked/);
  assert.match(html,/data-assembly-path="assemblies.groups.A.topProductNumber"/);
  assert.equal((html.match(/data-assembly-path="assemblies.assignments./g)??[]).length,8);
  assert.match(html,/Bushing cross-section with catalog dimensions A B C D E/);
  assert.match(html,/147 manufacturer records/);
  assert.match(html,/data-catalog-screen="assemblySide"/);
  assert.match(html,/No equal mass split is imposed/);
  assert.match(html,/Calculated clamp force/);
  assert.match(html,/data-assembly-force value="[^"]+" disabled/);
  const report=engineeringReport(analysis);
  assert.match(report,/### Bill of materials/);
  assert.match(report,/0510005-70-10: 8 parts/);
  assert.match(report,/REVIEW: Group A bushing model/);
  assert.doesNotMatch(report,/8 identical mounts/);
});

test('passing flat-part mixed assemblies recommend only the screened slot, not an identical part at every leg', () => {
  const config=fixture();
  config.assemblies.assignments=['A','A','A','A','B','B','B','B'];
  config.assemblies.groups.A.topProductNumber='0510001-70-10';
  config.assemblies.groups.A.holeDiameterM=.44*INCH;
  Object.assign(config.assemblies.groups.B,{topProductNumber:'0510825-70-10',bottomProductNumber:'0510825-70-10'});
  Object.assign(config.analysis,{lateralModeMinimumHz:[.1,.1],modeAcceptBandHz:[.1,1e6],resonanceBandHz:[1,400],resonanceLimitDb:100,tones:[]});
  const screen=screenSorbothaneCatalog(config,{geometry:'ring',odRange:[1.99,2.01],idRange:[.49,.51],thicknessRange:[.49,.51],stackRange:[1,1],assemblyGroup:'B',assemblySide:'top'});
  assert.ok(screen.recommendations.some(item=>item.item.productNumber==='0510825-70-10'));
  const html=catalogScreenResult(screen);
  assert.match(html,/Assembly B, upper side · 1 per assigned leg/);
  assert.doesNotMatch(html,/per side at each mount/);
});

test('mixed-assembly Monte Carlo propagates through independent X Y and Z envelopes', () => {
  const config=fixture();
  config.uncertainty.enabled=true;
  config.uncertainty.samples=8;
  config.analysis.frequencyPoints=41;
  const result=analyzeSorbothaneIsolation(config);
  assert.equal(result.uncertainty.samples,8);
  for(const axis of ['x','y','z']){
    const band=result.uncertainty.directionalBands[axis];
    assert.equal(band.lowerDb.length,41);
    band.lowerDb.forEach((value,index)=>assert.ok(Number.isFinite(value)&&band.upperDb[index]>=value));
  }
});

test('standalone synchronization and offline cache include assembly model and editor dependencies', () => {
  const standalone=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
  assert.match(standalone,/const __sorbothaneAssemblies=/);
  assert.match(standalone,/const __sorbothaneAssemblyUi=/);
  for(const file of ['sorbothane-assemblies.js','sorbothane-assembly-ui.js'])assert.ok(worker.includes(file));
});
