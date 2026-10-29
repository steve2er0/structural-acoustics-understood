import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeSorbothaneConfig, randomVibrationClearance, analyzeSorbothaneIsolation,
  screenSorbothaneCatalog, screenSorbothaneCatalogAsync, screenParkerLordCatalog } from '../js/sorbothane-analysis.js';
import { catalogScreenResult, applySorbothaneCatalogCandidate } from '../js/sorbothane-isolation.js';

const I = .0254;
const filters = { geometry:'washer', odRange:[.99,1.01], idRange:[.44,.46], thicknessRange:[.12,.13], stackRange:[1,1] };
const fixture = () => {
  const c = normalizeSorbothaneConfig();
  c.uncertainty.enabled = false;
  Object.assign(c.analysis, { lateralModeMinimumHz:[.1,.1], modeAcceptBandHz:[.1,1e6], resonanceLimitDb:100, tones:[] });
  c.damping = {mode:'manual-q',effectiveQ:6};
  c.environment.random = {enabled:true,axis:'x',points:[[10,.009],[100,.005],[2000,.005]],peakFactor:3,gapsM:[.018*I,.018*I,.1*I],checkClearance:true};
  return c;
};
const identities = screen => screen.recommendations.map(candidate => [candidate.item?.productNumber ?? candidate.candidateId, candidate.stackCount, candidate.score, candidate.pass]);

test('catalog PSD checks every input but never removes, reorders or disables a result, even when clearance enforcement is enabled', () => {
  const c = fixture(), original = structuredClone(c), noPsd = structuredClone(c);
  noPsd.environment.random = {...noPsd.environment.random,enabled:false,checkClearance:false};
  const before = screenSorbothaneCatalog(noPsd, filters), after = screenSorbothaneCatalog(c, filters);
  assert.deepEqual(identities(after),identities(before));
  assert.deepEqual(after.exclusions,before.exclusions);
  assert.equal(after.clearanceAdvisory.mode,'flag-only');
  assert.equal(after.clearanceAdvisory.evaluatedCount,after.recommendations.length+after.nearMisses.length);
  assert.ok(after.clearanceAdvisory.flaggedCount > 0);
  const firm = after.recommendations.find(candidate=>candidate.item.durometer===70);
  const soft = after.recommendations.find(candidate=>candidate.item.durometer===50);
  assert.ok(firm && soft);
  assert.equal(firm.clearanceAdvisory.cases[0].boxClearancePass,true);
  assert.equal(firm.clearanceAdvisory.cases[1].boxClearancePass,false,'Y violation is found even though X is selected');
  assert.ok(soft.clearanceAdvisory.cases[1].maximumPct>20);
  assert.equal(soft.pass,true,'dynamic compression >20% is a flag, not a catalog rejection');
  assert.equal(soft.config.environment.random.checkClearance,true);
  assert.deepEqual(applySorbothaneCatalogCandidate(c,soft).environment.random,c.environment.random);
  assert.equal(analyzeSorbothaneIsolation(soft.config,{skipResponse:true,skipUncertainty:true}).passes,false,'current-design enforcement still works');
  for(const candidate of after.recommendations) {
    assert.deepEqual(candidate.clearanceAdvisory.cases.map(result=>result.axis),['x','y','z']);
    for(const result of candidate.clearanceAdvisory.cases) {
      const direct=randomVibrationClearance({...candidate.config,environment:{...candidate.config.environment,random:{...candidate.config.environment.random,axis:result.axis}}});
      assert.equal(result.maximumPct,Math.max(...direct.locations.flatMap(location=>(location.sides??[]).map(side=>side.maximumPct))));
      assert.equal(result.displacementPsdM2PerHz,undefined);
    }
  }
  assert.deepEqual(c,original);
  const html = catalogScreenResult(after,null,'all');
  assert.match(html,/flags never exclude, reorder, or disable/);
  assert.match(html,/TRAVEL Y/); assert.match(html,/COMP &gt;20%/);
  assert.match(html,/Manual Q = 6 active/);
  assert.match(html,/Max box travel X \/ Y \/ Z \(in\)/);
  assert.equal((html.match(/data-sorbo-catalog-use=/g)||[]).length,after.recommendations.length+1);
});

test('async catalog review matches sync, reports monotonic three-axis progress and can cancel during flags', async () => {
  const c=fixture(), progress=[];
  const result=await screenSorbothaneCatalogAsync(c,filters,{yieldControl:async()=>{},onProgress:event=>progress.push(event)});
  assert.deepEqual(result,screenSorbothaneCatalog(c,filters));
  assert.ok(progress.some(event=>event.stage==='clearance-flags'&&event.completed>0));
  assert.equal(progress.at(-1).percent,100);
  assert.ok(progress.every((event,i)=>!i||event.percent>=progress[i-1].percent));
  let cancel=false;
  assert.equal(await screenSorbothaneCatalogAsync(c,filters,{yieldControl:async()=>{},shouldCancel:()=>cancel,onProgress:event=>{if(event.stage==='clearance-flags')cancel=true;}}),null);
});

test('catalog flags run with the shared checkbox off; invalid, missing gaps and disabled environments are never false passes', () => {
  const c=fixture(); c.environment.random.checkClearance=false;
  c.environment.random.gapsM=[0,0,0];
  c.environment.random.points=[[10,0],[100,0]];
  const noGaps=screenSorbothaneCatalog(c,filters);
  assert.ok(noGaps.recommendations.length);
  assert.ok(noGaps.recommendations.every(candidate=>candidate.clearanceAdvisory.cases.every(result=>result.compressionPass===true&&result.boxClearancePass===null)));
  assert.match(catalogScreenResult(noGaps),/GAPS NOT SET/);
  c.environment.random.points=[[100,.01],[10,.01]];
  const invalid=screenSorbothaneCatalog(c,filters);
  assert.equal(invalid.passingPartCount,noGaps.passingPartCount);
  assert.ok(invalid.recommendations.every(candidate=>candidate.clearanceAdvisory.cases.every(result=>!result.valid)));
  assert.match(catalogScreenResult(invalid),/INPUT \/ MODEL ERROR/);
  c.environment.random.enabled=false;
  const disabled=screenSorbothaneCatalog(c,filters);
  assert.equal(disabled.passingPartCount,noGaps.passingPartCount);
  assert.match(catalogScreenResult(disabled),/PSD NOT CHECKED/);
  c.environment.random.enabled=true;
  const empty=screenSorbothaneCatalog(c,{...filters,odRange:[10,11]});
  assert.equal(empty.clearanceAdvisory.enabled,true,'no retained candidates must not imply the PSD is disabled');
  assert.doesNotMatch(catalogScreenResult(empty),/No enabled PSD was available/);
});

test('paired recommendations retain compact records, flag all axes and preserve mixed hardware application', async () => {
  const c=fixture(); c.assemblies.enabled=true; c.assemblies.assignments=Array(8).fill('A');
  Object.assign(c.assemblies.groups.A,{topProductNumber:'0510880-70-10',bottomProductNumber:'0510880-70-10',topCount:1,bottomCount:1,compressionPct:15,boltDiameterM:.25*I,holeDiameterM:.47*I,gripThicknessM:.12*I});
  const pairFilters={topGeometry:'ring',bottomGeometry:'ring',odRange:[1.99,2.01],idRange:[.49,.51],thicknessRange:[.49,.51],stackRange:[1,1]};
  const before=structuredClone(c); before.environment.random.enabled=false; before.environment.random.checkClearance=false;
  const reference=screenSorbothaneCatalog(before,pairFilters),progress=[];
  const result=await screenSorbothaneCatalogAsync(c,pairFilters,{yieldControl:async()=>{},onProgress:event=>progress.push(event)});
  assert.ok(result.recommendations.length+result.nearMisses.length>0);
  assert.deepEqual(identities(result),identities(reference));
  for(const candidate of [...result.recommendations,...result.nearMisses]) {
    assert.equal(candidate.clearanceAdvisory.cases.length,3);
    assert.deepEqual(applySorbothaneCatalogCandidate(c,candidate).environment.random,c.environment.random);
    if(candidate.pass) {assert.equal(candidate.summaryOnly,true);assert.equal(candidate.config,undefined);}
  }
  assert.ok(progress.some(event=>event.stage==='clearance-flags'));
  assert.ok(progress.every((event,i)=>!i||event.percent>=progress[i-1].percent));
});

test('LORD catalog keeps travel-flagged results but never claims unknown pad compression passes', () => {
  const c=fixture(); c.isolator.kind='parker-lord-am'; c.isolator.productNumber='AM-006-1';
  c.environment.random.points=[[10,0],[100,0]];
  const screen=screenParkerLordCatalog(c,{family:'AM-006',mountsPerPointRange:[1,1]});
  assert.ok(screen.recommendations.length);
  for(const candidate of screen.recommendations)assert.ok(candidate.clearanceAdvisory.cases.every(result=>result.compressionPass===null));
  assert.match(catalogScreenResult(screen),/COMP N\/A/);
});

test('standalone includes advisory catalog rendering and progress stage', () => {
  const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
  assert.match(html,/Catalog PSD checks · flags only/);
  assert.match(html,/clearance-flags/);
  assert.match(html,/catalogScreen: true/);
});
