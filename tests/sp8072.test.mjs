import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateSp8072,SP8072_DEFAULTS,normalizeSp8072,sp8072CurveIntegral,sp8072Interpolate,sp8072Directivity,sp8072PowerSumDb,sp8072FlowPoint} from '../js/sp8072-physics.js';
import {SP8072_CURVES,SP8072_DEFLECTORS} from '../js/sp8072-data.js';
import {sp8072Calculator,sp8072WorkbenchDefinition,sp8072VisibleKeys,parseSp8072Measurements,sp8072ReportText} from '../js/sp8072-tool.js';
import {engineeringAnalysisRegistry} from '../js/engineering-workbenches.js';
import {assertEngineeringResult} from '../js/engineering-results.js';
import {lineChartSvg} from '../js/charts.js';
import {createEngineeringToolProject,normalizeEngineeringToolProject} from '../js/workbench-runtime.js';
import {displayEngineeringResult,fromDisplayNumber,toDisplayNumber} from '../js/unit-system.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/sp8072-benchmarks.json',import.meta.url)));
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b} by ${a-b}`);
for(const benchmark of fixture.cases)test(`SP8072 independent reference: ${benchmark.id}`,()=>{
  const s=calculateSp8072(benchmark.inputs);close(s.acousticPower,benchmark.expected.acousticPower,1e-6);close(s.overallDb,benchmark.expected.overallDb,benchmark.toleranceDb);
  if(benchmark.expected.coreLength)close(s.coreLength,benchmark.expected.coreLength);
  if(benchmark.expected.axialFraction)close(s.axialFraction,benchmark.expected.axialFraction);
  s.bands.forEach((b,i)=>{close(b.splDb,benchmark.expected.bands[i].splDb,benchmark.toleranceDb);close(b.sourceWatts,benchmark.expected.bands[i].sourceWatts,.001);});
});
test('SP8072 power-law integration has exact constant, inverse-x and quadratic limits',()=>{
  close(sp8072CurveIntegral([[1,0],[10,0]],1,10),9);
  close(sp8072CurveIntegral([[1,0],[10,-10]],1,10),Math.log(10));
  close(sp8072CurveIntegral([[1,0],[10,20]],1,10),333);
  close(sp8072CurveIntegral([[1,0],[10,0]],.1,20),9);
  close(sp8072PowerSumDb([100,100]),103.01029995663981);
});
test('SP8072 digitization domains fail rather than silently extrapolate position/directivity',()=>{
  close(sp8072Interpolate(SP8072_CURVES.apparentOpen.points,.1,true),17);
  close(sp8072Directivity(.04,60),3.7);
  assert.throws(()=>sp8072Interpolate(SP8072_CURVES.apparentOpen.points,2,true),/domain/);
  assert.throws(()=>sp8072Directivity(.001,60),/Strouhal/);
  assert.throws(()=>sp8072Directivity(.04,10,'edge'),/20–180/);
  close(sp8072Directivity(.001,60,'edge'),1);
});
test('SP8072 band power / pressure variance closes to selected-band overall without tail renormalization',()=>{
  for(const method of ['apparent','distributed']){
    const s=calculateSp8072({method});
    close(s.overallDb,10*Math.log10(s.bands.reduce((sum,b)=>sum+b.pressureSquared,0)/4e-10));
    close(s.selectedSourceWatts,s.bands.reduce((sum,b)=>sum+b.sourceWatts,0),1e-6);
    close(s.selectedSourceWatts,s.sources.reduce((sum,p)=>sum+p.totalSourceWatts,0),1e-6);
    close(s.overallDb,sp8072PowerSumDb(s.sources.filter(p=>p.selectedOverallDb!==null).map(p=>p.selectedOverallDb)));
    assert.ok(s.sourceFraction<1&&s.sourceFraction>0);
    if(method==='distributed')assert.ok(s.axialFraction<1);
    close(calculateSp8072({method,thrust:2e6}).overallDb-s.overallDb,10*Math.log10(2));
  }
});
test('SP8072 dry recovery, exact incremental water reduction, and all supported combined configurations',()=>{
  for(const d of SP8072_DEFLECTORS.filter(d=>!d.requiresCustom)){
    const preset=sp8072Calculator.syncPreset({deflector:d.id},'deflector'),base={...preset,deflector:d.id};
    const dry=calculateSp8072(base),zero=calculateSp8072({...base,water:'source-scenario',waterFlow:20000,waterReduction:0});
    close(dry.overallDb,zero.overallDb);
    const wet=calculateSp8072({...base,water:'source-scenario',waterFlow:20000,waterReduction:10,waterProvenance:'Diagnostic incremental 10 dB relative to the same reference configuration'});
    close(wet.overallDb,dry.overallDb-10);close(wet.selectedSourceWatts/dry.selectedSourceWatts,.1);
    close(calculateSp8072({...wet.inputs,water:'dry'}).overallDb,dry.overallDb);
  }
  assert.throws(()=>calculateSp8072({water:'source-scenario',waterReduction:6}),/waterProvenance/);
  assert.throws(()=>calculateSp8072({water:'source-scenario',waterCurve:'20,1\n30,2',waterProvenance:'test'}),/domain/);
});
test('SP8072 separates power allocation, source path shielding, and surface loading',()=>{
  const base=calculateSp8072({method:'distributed',directivity:'isotropic'});
  const shield=calculateSp8072({...base.inputs,shieldStartD:0,shieldEndD:1000,shieldDb:8});
  close(shield.overallDb,base.overallDb-8);close(shield.selectedSourceWatts,base.selectedSourceWatts);
  const surface=calculateSp8072({...base.inputs,surfaceDb:6});close(surface.overallDb,base.overallDb+6);close(surface.selectedSourceWatts,base.selectedSourceWatts);
  const reflected=calculateSp8072({...base.inputs,reflectionDb:6});close(reflected.overallDb,base.overallDb+6);close(reflected.selectedSourceWatts,base.selectedSourceWatts);
  const reflectedResult=sp8072Calculator.compute({...base.inputs,reflectionDb:6});
  assert.doesNotMatch(reflectedResult.values[0].note,/free-field/);
  assert.match(reflectedResult.values[0].note,/entered path corrections/);
  for(let i=0;i<surface.bands.length;i++)close(surface.bands[i].freeFieldDb,base.bands[i].splDb);
  const twin=calculateSp8072({method:'distributed',deflector:'twin',turn:0,bendRadiusD:0,directivity:'isotropic'});
  close(twin.selectedSourceWatts,base.selectedSourceWatts,1e-6);close(twin.overallDb,base.overallDb);
  assert.throws(()=>calculateSp8072({shieldDb:5}),/distributed method/);
});
test('SP8072 inactive curve drafts permit handbook and dry recovery, while active invalid curves fail',()=>{
  const drafts={customSpectrum:'invalid',customAxial:'invalid',customLocal:'invalid',waterCurve:'invalid'};
  close(calculateSp8072(drafts).overallDb,calculateSp8072({}).overallDb);
  close(calculateSp8072({...drafts,method:'distributed'}).overallDb,calculateSp8072({method:'distributed'}).overallDb);
  assert.throws(()=>calculateSp8072({...drafts,sourceBasis:'custom'}),/customSpectrum/);
  assert.throws(()=>calculateSp8072({...drafts,sourceBasis:'custom',method:'distributed'}),/customAxial/);
  assert.throws(()=>calculateSp8072({...drafts,water:'source-scenario',waterProvenance:'Diagnostic draft'}),/waterCurve/);
});
test('SP8072 continuous geometry and branch direction match explicit coordinates',()=>{
  const v={...SP8072_DEFAULTS,deflector:'open',standOffD:4,bendRadiusD:0,turn:90};
  const p=sp8072FlowPoint(17,1,v);close(p.position[0],13);close(p.position[2],-4);close(p.direction[0],1);
  const arc={...v,bendRadiusD:2};const entry=sp8072FlowPoint(4,1,arc),exit=sp8072FlowPoint(4+Math.PI,1,arc);close(entry.position[0],0);close(exit.position[0],2);close(exit.position[2],-6);
  const b=fixture.cases[0].inputs;assert.throws(()=>calculateSp8072({...b,receiverY:0,receiverZ:-17}),/minimumRangeD/);
  assert.throws(()=>calculateSp8072({deflector:'covered'}),/distributed method/);
  assert.throws(()=>calculateSp8072({velocity:3700}),/similarity/);
  assert.throws(()=>calculateSp8072({engines:1.5}),/integers/);
  assert.throws(()=>calculateSp8072({receiverX:''}),/finite number/);
  assert.throws(()=>calculateSp8072({fmin:400,fmax:20}),/fmin/);
});
test('SP8072 distributed quadrature converges to the independent continuous reference',()=>{
  const b=fixture.cases.at(-1),e=b.expected.overallDb;
  const coarse=Math.abs(calculateSp8072({...b.inputs,slices:16}).overallDb-e),fine=Math.abs(calculateSp8072({...b.inputs,slices:256}).overallDb-e);
  assert.ok(fine<coarse/20);assert.ok(fine<.002);
});
test('SP8072 linear 1-Hz bins retain units and reject silent band caps',()=>{
  const s=calculateSp8072({band:'linear',linearWidth:1,fmin:20,fmax:40});assert.equal(s.bands.length,21);s.bands.forEach(b=>close(b.bandwidth,1));
  assert.throws(()=>calculateSp8072({band:'linear',linearWidth:1,fmin:20,fmax:400}),/128 bands/);
});
test('SP8072 SI/English round trips, result schema, retained baseline and study identity',()=>{
  const registry={'nasa-sp8072':sp8072Calculator},project=createEngineeringToolProject(sp8072WorkbenchDefinition,registry),result=sp8072Calculator.compute({});
  assertEngineeringResult(result);const displayed=displayEngineeringResult(result,'English');
  close(displayed.values[0].value,result.values[0].value);close(fromDisplayNumber(toDisplayNumber(1.5,'m','English'),'m','English'),1.5);
  const restored=normalizeEngineeringToolProject(sp8072WorkbenchDefinition,registry,JSON.parse(JSON.stringify(project)));sp8072WorkbenchDefinition.validateImportData(restored);sp8072WorkbenchDefinition.validateImportedProject(restored);
  assert.throws(()=>sp8072WorkbenchDefinition.validateImportData({schema:'other'}),/version 1/);
  assert.throws(()=>normalizeEngineeringToolProject(sp8072WorkbenchDefinition,registry,{schema:'sau-engineering-tool',version:2}),/version/);
  project.baseline={result,values:result.values};const html=engineeringAnalysisRegistry['nasa-sp8072'].render(project);assert.match(html,/Retained baseline spectrum/);assert.doesNotMatch(html,/\bundefined\b/);
  const visible=sp8072VisibleKeys({inputs:SP8072_DEFAULTS});assert.ok(!visible.includes('waterReduction')&&!visible.includes('slices'));
});
test('SP8072 source files, offline cache and generated standalone contain the complete independent route',()=>{
  const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8'),worker=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
  assert.match(html,/const __sp8072=\(\(\)=>\{/);assert.match(html,/nasa-sp8072/);assert.match(html,/No hidden normalization/);
  for(const file of ['data','physics','tool'])assert.ok(worker.includes(`./js/sp8072-${file}.js`));
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(match[1]),'Standalone script parses without module imports');
});
test('SP8072 microphone predictions use full XYZ ranges and preserve the analytical main receiver',()=>{
  const benchmark=fixture.cases[0],result=sp8072Calculator.compute({...benchmark.inputs,measurementLocations:'[[0,20,0],[0,10,0]]'});
  assertEngineeringResult(result);
  const [m1,m2,m3]=result.measurementLocations;
  close(m1.overallDb,benchmark.expected.overallDb);close(m3.overallDb,m1.overallDb);
  // Independent Fig. 14 knots: 17 m at St=.1, 11.5 m at St=.2.
  // Only Y changes: spherical spreading scales each band's pressure energy by r_old²/r_new².
  const expected=benchmark.expected.bands.map((b,i)=>b.splDb+10*Math.log10((10**2+[17,11.5][i]**2)/(20**2+[17,11.5][i]**2)));
  m2.bands.forEach((b,i)=>close(b.splDb,expected[i]));close(m2.overallDb,sp8072PowerSumDb(expected));
  for(const m of result.measurementLocations)close(m.overallDb,10*Math.log10(m.bands.reduce((sum,b)=>sum+b.pressureSquared,0)/4e-10));
  close(result.values[0].value,m1.overallDb);
  assert.deepEqual(result.plots[0].traces.find(t=>t.name.startsWith('M2')).y,m2.bands.map(b=>b.splDb));
  assert.deepEqual(result.tables[0].rows[1].slice(1,4),[0,20,0]);
  const diagram=sp8072WorkbenchDefinition.renderDiagram({nativeResult:result,project:{unitSystem:'SI'}});
  assert.match(diagram,/sp8072-engine-body/);assert.match(diagram,/Top view · XY/);assert.match(diagram,/aria-label="M2 predicted measurement location"/);assert.match(diagram,/predictions, not measured data/);
});
test('SP8072 invalid comparison receivers are isolated and malformed location lists fail explicitly',()=>{
  const base=fixture.cases[0].inputs,result=sp8072Calculator.compute({...base,measurementLocations:'[[0,0,-17],[0,10,0]]'});
  close(result.values[0].value,fixture.cases[0].expected.overallDb);
  assert.match(result.measurementLocations[1].error,/minimumRangeD/);
  assert.equal(result.measurementLocations[1].overallDb,null);
  assert.ok(!result.plots[0].traces.some(t=>t.name.startsWith('M2')));
  assert.match(result.assumptions.warnings.join(' '),/M2 prediction unavailable/);
  assert.equal(result.measurementLocations[2].error,null);
  for(const invalid of ['oops','null','[[1,2]]','[["1",2,3]]','[[100001,0,0]]','[[0,0,0],[1,1,1],[2,2,2]]'])assert.throws(()=>parseSp8072Measurements(invalid),/measurementLocations/);
  assert.deepEqual(parseSp8072Measurements(''),[]);
  assert.equal(sp8072Calculator.compute({...base,measurementLocations:''}).measurementLocations.length,1);
});
test('SP8072 saved location inputs restore and English geometry retains SI prediction coordinates',()=>{
  const registry={'nasa-sp8072':sp8072Calculator},project=createEngineeringToolProject(sp8072WorkbenchDefinition,registry);
  project.inputs['nasa-sp8072'].measurementLocations='[[-40,15,25]]';
  const restored=normalizeEngineeringToolProject(sp8072WorkbenchDefinition,registry,JSON.parse(JSON.stringify(project)));
  sp8072WorkbenchDefinition.validateImportedProject(restored);
  const result=sp8072Calculator.compute(restored.inputs['nasa-sp8072']);
  assert.deepEqual(result.measurementLocations[1].position,[-40,15,25]);
  const english=sp8072WorkbenchDefinition.renderDiagram({nativeResult:result,project:{unitSystem:'English'}});
  assert.match(english,/X -131.2 ft/);assert.match(english,/Y 49.21 ft/);
  assert.match(english,new RegExp(result.measurementLocations[1].overallDb.toFixed(2)));
  const old=JSON.parse(readFileSync(new URL('../docs/sp8072/example-study.json',import.meta.url)));
  close(sp8072Calculator.compute(old.inputs['nasa-sp8072']).values[0].value,127.06875418001745);
  const exported=JSON.parse(JSON.stringify(result));
  assert.deepEqual(exported.measurementLocations[1].position,[-40,15,25]);
  close(exported.measurementLocations[1].overallDb,result.measurementLocations[1].overallDb);
  assert.match(sp8072ReportText(result,{result}),/M2: \(-40, 15, 25\) m; OASPL/);
  assert.match(lineChartSvg(result.plots[0]),/M2 · Predicted external pressure/);
  const narrow=sp8072Calculator.compute({fmin:40,fmax:80,band:'octave'});
  const svg=lineChartSvg(narrow.plots[0]);
  assert.match(svg,/data-axis-label="x-major" data-axis-value="40"/);
  assert.match(svg,/data-axis-label="x-major" data-axis-value="80"/);
});
