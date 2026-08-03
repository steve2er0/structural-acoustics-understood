import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sections as baseSections, toolCatalog, demos as baseDemos, caseNotes as baseCaseNotes } from '../js/data.js';
import { extraToolCatalog } from '../js/extra-data.js';
import { calculatorRegistry } from '../js/calculators.js';
import { extraCalculatorRegistry } from '../js/extra-calculators.js';
import { acs519Sections, acs519ToolCatalog, acs519Demos, acs519CaseNotes } from '../js/acs519-data.js';
import { acs519CalculatorRegistry } from '../js/acs519-calculators.js';
import { workflowExpansionSections, workflowExpansionToolCatalog, workflowExpansionDemos, workflowExpansionCaseNotes } from '../js/workflow-expansion-data.js';
import { workflowExpansionCalculatorRegistry } from '../js/workflow-expansion-calculators.js';
import { programExpansionSections, programExpansionToolCatalog, programExpansionDemos, programExpansionCaseNotes } from '../js/program-expansion-data.js';
import { programExpansionCalculatorRegistry } from '../js/program-expansion-calculators.js';
import { seaParameterSections, seaParameterToolCatalog, seaParameterDemos, seaParameterCaseNotes } from '../js/sea-parameters-data.js';
import { seaParameterCalculatorRegistry } from '../js/sea-parameters-calculators.js';
import {
  clfMechanismState,
  equipmentLoadingState,
  equivalentPowerInjectionState,
  installedFairingSeaState,
  modalDensityAtlasState,
  seaParameterWorkbenchState,
  seaResponseRecoveryState,
  tblConvectionState
} from '../js/sea-parameters-physics.js';
import {
  nonstationaryEnvironmentState,
  mimoTestState,
  acousticTreatmentState,
  sourceIdentificationState,
  hybridMethodState,
  vibroacousticFatigueState,
  missionTimelineState,
  credibilityState,
  capstoneState,
  noiseControlPathState,
  psychoacousticState,
  noiseMetricsState,
  acousticMeasurementState,
  canonicalSourceState,
  sourceGeometryState,
  fanDuctState,
  outdoorPropagationState,
  barrierDiffractionState,
  roomFieldState,
  enclosureDesignState,
  absorberResonatorState,
  tunedAbsorberIsolationState
} from '../js/program-expansion-physics.js';
import {
  modelTestCorrelationState,
  branchingSeaState,
  transferPathState,
  requirementsFlowdownState,
  nonlinearJointState,
  uncertaintySensitivityState,
  milesValidityState,
  extremeResponseState
} from '../js/workflow-expansion-physics.js';
import {
  SEA_MEDIA,
  doubleWindowSeaState,
  pistonRadiationState,
  orthotropicPanelState,
  seaValidityState,
  doublePanelSeaState,
  khiePatchState,
  pipeNoiseState,
  waveMatchingState,
  drivenRadiationState,
  soundIntensityProbeState,
  dynamicStressEnvironmentState,
  launchAcousticSourceState,
  qualificationTestState,
  seaNetworkState,
  wetTankDynamicsState
} from '../js/acs519-physics.js';
import { jointAcceptance, spatialCoherence, supportedDemoIds } from '../js/demos.js';
import { assertDemoTakeawayRegistry, buildDemoTakeaway, demoTakeawayRegistry } from '../js/demo-takeaways.js';
import { assertEngineeringResult, engineeringResultToText } from '../js/engineering-results.js';
import {
  experimentalSeaInverse,
  honeycombCoincidenceFrequency,
  honeycombPreset,
  honeycombWaveState,
  inhomogeneousEnergyStudy,
  junctionTransmissionState,
  seaForwardEnergies,
  wavenumberTransmissionStudy
} from '../js/honeycomb-paper.js';
import {
  clfIdentificationUncertainty,
  couplingPowerState,
  forwardClfExperiment,
  identifyClfExperiment,
  twoSubsystemEnergyBalance
} from '../js/sea-coupling.js';

const sections=[...baseSections,...acs519Sections,...workflowExpansionSections,...programExpansionSections,...seaParameterSections];
const catalog=[...toolCatalog,...extraToolCatalog,...acs519ToolCatalog,...workflowExpansionToolCatalog,...programExpansionToolCatalog,...seaParameterToolCatalog];
const registry={...calculatorRegistry,...extraCalculatorRegistry,...acs519CalculatorRegistry,...workflowExpansionCalculatorRegistry,...programExpansionCalculatorRegistry,...seaParameterCalculatorRegistry};
const demos=[...baseDemos,...acs519Demos,...workflowExpansionDemos,...programExpansionDemos,...seaParameterDemos];
const caseNotes=[...baseCaseNotes,...acs519CaseNotes,...workflowExpansionCaseNotes,...programExpansionCaseNotes,...seaParameterCaseNotes];
const defaults=id=>Object.fromEntries(registry[id].inputs.map(f=>[f.key,f.default]));
const metric=(result,label)=>result.values.find(x=>x.label===label)?.value;
const close=(actual,expected,rel=1e-6)=>assert.ok(Math.abs(actual-expected)<=rel*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);

test('every catalog entry has a calculator and every default case runs',()=>{
  assert.equal(catalog.length,113);
  assert.deepEqual(catalog.filter(t=>!registry[t.id]),[]);
  assert.deepEqual(Object.keys(registry).filter(id=>!catalog.some(t=>t.id===id)),[]);
  for(const tool of catalog){
    const result=registry[tool.id].compute(defaults(tool.id));
    assert.ok(result && typeof result==='object',tool.id);
    assert.ok(result.values.length>0,`${tool.id} returned no primary values`);
  }
});

test('every calculator returns the complete engineering response schema',()=>{
  for(const tool of catalog){
    const result=registry[tool.id].compute(defaults(tool.id));
    assert.doesNotThrow(()=>assertEngineeringResult(result,tool.id));
    assert.equal(result.summary,undefined,`${tool.id} leaked the legacy summary field`);
    assert.equal(typeof result.interpretation.summary,'string',`${tool.id} has no engineering interpretation`);
    assert.ok(result.interpretation.summary.length>20,`${tool.id} interpretation is too short`);
    assert.ok(result.interpretation.physicalMeaning.length>40,`${tool.id} physical meaning is too short`);
    assert.ok(result.interpretation.engineeringConsiderations.length>=2,`${tool.id} needs engineering considerations`);
    assert.ok(result.assumptions.satisfied.length>0,`${tool.id} needs model assumptions`);
    assert.ok(Array.isArray(result.assumptions.warnings),`${tool.id} warnings must be an array`);
    assert.ok(result.validity.regime.length>20,`${tool.id} needs a validity regime`);
    assert.ok(result.validity.confidence.length>20,`${tool.id} needs a confidence statement`);
    assert.ok(result.relatedConcepts.length>=2,`${tool.id} needs related concepts`);
    assert.ok(result.relatedConcepts.every(item=>item.title&&item.description&&item.href),`${tool.id} has an incomplete related concept`);
    const copied=engineeringResultToText(tool.title,result);
    for(const heading of ['NUMERICAL RESULTS','ENGINEERING INTERPRETATION','PHYSICAL MEANING','MODEL ASSUMPTIONS','VALIDITY CHECKS','ENGINEERING CONSIDERATIONS','RELATED CONCEPTS']){
      assert.match(copied,new RegExp(heading),`${tool.id} copy output omits ${heading}`);
    }
  }
});

test('decibel summation returns +3.0103 dB for equal independent levels',()=>{
  const v=defaults('db');v.levels='90, 90';
  close(metric(registry.db.compute(v),'Combined level'),93.01029995664,1e-10);
});

test('one-third-octave 1 kHz band uses geometric edges',()=>{
  const v=defaults('octave');v.fmin=999;v.fmax=1001;v.reference=1000;v.fraction='3';
  const r=registry.octave.compute(v).tables[0].rows[0];
  close(r[1],1000/2**(1/6),1e-10);
  close(r[2],1000,1e-10);
  close(r[3],1000*2**(1/6),1e-10);
});

test('Miles equation matches the standard narrowband expression',()=>{
  const v=defaults('miles');v.fn=100;v.q=10;v.psd=0.01;
  const expected=Math.sqrt(Math.PI/2*10*100*0.01);
  close(metric(registry.miles.compute(v),'Acceleration response'),expected,1e-10);
});

test('unit conversion uses conventional standard gravity',()=>{
  const r=extraCalculatorRegistry['unit-converter'].compute({value:1,from:'g',to:'m/s2'});
  close(metric(r,'Converted value'),9.80665,1e-12);
});

test('Welch PSD closes against time-domain RMS for generated data',()=>{
  const r=extraCalculatorRegistry['time-psd'].compute(defaults('time-psd'));
  assert.ok(Math.abs(metric(r,'RMS closure'))<0.1);
  assert.equal(metric(r,'Frequency resolution'),2);
});

test('three-subsystem SEA closes steady-state power balance',()=>{
  const r=extraCalculatorRegistry['multi-subsystem-sea'].compute(defaults('multi-subsystem-sea'));
  assert.ok(Math.abs(metric(r,'Power balance error'))<1e-8);
});

test('zero correlation combines PSD RMS by root-sum-square',()=>{
  const v=defaults('psd-combination');v.rho=0;
  const r=extraCalculatorRegistry['psd-combination'].compute(v);
  const r1=metric(r,'PSD 1 RMS'),r2=metric(r,'PSD 2 RMS'),rt=metric(r,'Combined RMS');
  close(rt,Math.sqrt(r1*r1+r2*r2),2e-4);
});


test('content architecture matches the approved full build',()=>{
  assert.equal(sections.length,63);
  assert.equal(sections.reduce((n,s)=>n+s.concepts.length,0),389);
  assert.equal(demos.length,79);
  assert.equal(caseNotes.length,66);
  assert.deepEqual(demos.map(d=>d.id).sort(),[...supportedDemoIds].sort());
  assert.deepEqual(demos.filter(d=>!catalog.some(t=>t.id===d.toolId)),[]);
  assert.deepEqual(sections.flatMap(s=>s.concepts).filter(c=>c.toolId&&!catalog.some(t=>t.id===c.toolId)),[]);
  assert.deepEqual(acs519Sections.filter(section=>!acs519CaseNotes.some(note=>note.id===section.deepDiveId)),[]);
  assert.deepEqual(workflowExpansionSections.filter(section=>!workflowExpansionCaseNotes.some(note=>note.id===section.deepDiveId)),[]);
  assert.deepEqual(programExpansionSections.filter(section=>!programExpansionCaseNotes.some(note=>note.id===section.deepDiveId)),[]);
  assert.deepEqual(seaParameterSections.filter(section=>!seaParameterCaseNotes.some(note=>note.id===section.deepDiveId)),[]);
  const embeddedDemos=caseNotes.flatMap(note=>[...note.body.matchAll(/data-embedded-demo="([^"]+)"/g)].map(match=>match[1]));
  assert.deepEqual(embeddedDemos.filter(id=>!supportedDemoIds.includes(id)),[]);
});

test('SEA parameter models preserve dimensional, reciprocity, power, and recovery limits',()=>{
  const pipeLow=modalDensityAtlasState({type:'acoustic-1d',frequency:100,length:10,soundSpeed:340});
  const pipeHigh=modalDensityAtlasState({type:'acoustic-1d',frequency:5000,length:10,soundSpeed:340});
  close(pipeLow.modalDensity,20/340,1e-12);
  close(pipeHigh.modalDensity,pipeLow.modalDensity,1e-12);
  const roomLow=modalDensityAtlasState({type:'acoustic-3d',frequency:100,length:4,width:3,height:2,soundSpeed:343});
  const roomHigh=modalDensityAtlasState({type:'acoustic-3d',frequency:1000,length:4,width:3,height:2,soundSpeed:343});
  assert.ok(roomHigh.modalDensity>roomLow.modalDensity);

  const coupling=clfMechanismState({mechanism:'line-joint',frequency:1000,modalDensity1:.04,modalDensity2:.16});
  close(coupling.forward*.04,coupling.reverse*.16,1e-12);
  close(coupling.reciprocityResidual,0,1e-12);

  const point=equivalentPowerInjectionState({source:'point-force',forceRms:10,conductance:2e-4});
  close(point.injectedPower,.5*10**2*2e-4,1e-12);
  const unloaded=equipmentLoadingState({unloadedResponse:12,equipmentMass:0});
  close(unloaded.globalResponse,12,1e-12);
  close(unloaded.localResponse,12,1e-12);

  const lowReduced=tblConvectionState({model:'totaro',frequency:20,freeStreamVelocity:300,displacementThickness:.01});
  const highReduced=tblConvectionState({model:'totaro',frequency:10000,freeStreamVelocity:300,displacementThickness:.01});
  assert.ok(lowReduced.convectionFraction>highReduced.convectionFraction);
  assert.ok(highReduced.convectionFraction>=.6&&lowReduced.convectionFraction<=1);

  const response=seaResponseRecoveryState({kind:'structural',energy:.02,mass:100,frequency:500});
  close(100*response.velocityRms**2,.02,1e-12);
  assert.ok(response.concentrationAmplitudeFactor>=1);

  const fairing=installedFairingSeaState();
  assert.ok(Math.abs(fairing.network.balanceError)<1e-8);
  const tight=installedFairingSeaState({blanketCoverage:1,blanketInsertionLoss:25,leakAreaFraction:0});
  const leaky=installedFairingSeaState({blanketCoverage:1,blanketInsertionLoss:25,leakAreaFraction:.01});
  assert.ok(tight.installedNoiseReduction>leaky.installedNoiseReduction);
  const workbench=seaParameterWorkbenchState();
  assert.ok(workbench.externalPower>0&&workbench.energy>0&&workbench.provenance.length>=7);
});

test('program-level launch models preserve limiting behavior and end-to-end directionality',()=>{
  const stationary=nonstationaryEnvironmentState({burstPsd:0,kurtosis:3});
  close(stationary.peakRatio,1,1e-12);
  close(stationary.damageRatio,1,4e-3);

  const uncoupled=mimoTestState({crossCoupling:0,inputCorrelation:0});
  close(uncoupled.crossAxisRatio,0,1e-12);
  close(uncoupled.responseCoherence,0,1e-12);

  const treatment=acousticTreatmentState();
  assert.ok(treatment.normalAbsorption>=0&&treatment.normalAbsorption<=1);
  assert.ok(treatment.installedAbsorption>=0&&treatment.installedAbsorption<=1);
  const thin=acousticTreatmentState({frequency:250,thicknessMm:10,airGapMm:0});
  const thick=acousticTreatmentState({frequency:250,thicknessMm:100,airGapMm:25});
  assert.ok(thick.normalAbsorption>thin.normalAbsorption);

  const source=sourceIdentificationState({frequency:1200,spacingMm:60,sourceAngle:-18,secondaryLevelDb:-20});
  assert.equal(source.spatialAlias,false);
  assert.ok(Math.abs(source.identifiedAngle-source.sourceAngle)<1);

  const hybrid=hybridMethodState();
  assert.ok(hybrid.bendingWavelength>0&&hybrid.acousticWavelength>0&&hybrid.feElements>0);
  assert.ok(typeof hybrid.method==='string'&&hybrid.method.length>10);

  const one=vibroacousticFatigueState({missionRepeats:1});
  const two=vibroacousticFatigueState({missionRepeats:2});
  close(two.missionDamage,2*one.missionDamage,1e-12);

  const mission=missionTimelineState();
  close(mission.events.reduce((sum,event)=>sum+event.fatigueShare,0),1,1e-12);
  assert.ok(mission.subsystemResults.every(item=>item.controllingEvent&&item.peakSeverity>0));

  const credibility=credibilityState({verification:5,convergence:5,inputs:5,calibration:5,validation:5,uncertainty:5,configuration:5,review:5});
  close(credibility.weightedScore,100,1e-12);
  assert.equal(credibility.decisionReady,true);

  const baseline=capstoneState(), louder=capstoneState({sourceOaspl:153}), moreTl=capstoneState({fairingTl:19});
  close(louder.designPayloadResponse/baseline.designPayloadResponse,10**(1/20),1e-12);
  close(moreTl.designPayloadResponse/baseline.designPayloadResponse,10**(-1/20),1e-12);
});

test('ACS 537 noise-control models preserve path, field, measurement, and treatment limits',()=>{
  const untreated=noiseControlPathState({path1Reduction:0});
  const treated=noiseControlPathState({path1Reduction:15});
  assert.ok(treated.afterLevel<untreated.afterLevel);
  assert.ok(treated.afterLevel>treated.residualFloor);
  close(treated.contributions.reduce((sum,path)=>sum+path.share,0),1,1e-12);

  close(psychoacousticState({azimuth:0}).itd,0,1e-12);
  assert.ok(Math.abs(psychoacousticState({frequency:4000,azimuth:60}).ild)>Math.abs(psychoacousticState({frequency:250,azimuth:60}).ild));

  const shortEvent=noiseMetricsState({eventDuration:2,totalDuration:3600});
  const longEvent=noiseMetricsState({eventDuration:100,totalDuration:3600});
  assert.ok(shortEvent.leq<longEvent.leq);
  close(shortEvent.sel,shortEvent.eventLevel+10*Math.log10(shortEvent.eventDuration),1e-12);

  const micLow=acousticMeasurementState({frequency:500,incidenceAngle:90});
  const micHigh=acousticMeasurementState({frequency:8000,incidenceAngle:90});
  assert.ok(Math.abs(micHigh.totalBias)>Math.abs(micLow.totalBias));

  close(canonicalSourceState({sourceType:'monopole',angle:0}).directivityIndex,canonicalSourceState({sourceType:'monopole',angle:90}).directivityIndex,1e-12);
  assert.ok(canonicalSourceState({sourceType:'dipole',angle:90}).directivityIndex<-60);

  const finite=sourceGeometryState({longDimension:10,shortDimension:2,distance:1});
  assert.match(finite.regime,/line-source/);
  assert.match(sourceGeometryState({longDimension:10,shortDimension:2,distance:10}).regime,/point-source/);

  const duct=fanDuctState({ductLength:100,attenuationRate:1});
  assert.ok(duct.regeneratedShare>0.9);
  assert.ok(duct.deliveredPowerLevel>=Math.max(duct.elbowGeneration,duct.grilleGeneration));

  assert.ok(outdoorPropagationState({frequency:8000}).absorptionRate>outdoorPropagationState({frequency:125}).absorptionRate);
  assert.ok(barrierDiffractionState({barrierHeight:8}).insertionLoss>barrierDiffractionState({barrierHeight:3}).insertionLoss);

  assert.ok(roomFieldState({absorption:.5}).criticalDistance>roomFieldState({absorption:.1}).criticalDistance);
  assert.ok(enclosureDesignState({openingArea:.001}).effectiveTl>enclosureDesignState({openingArea:.5}).effectiveTl);

  const absorber=absorberResonatorState();
  assert.ok(absorber.normalAbsorption>=0&&absorber.normalAbsorption<=1);
  assert.ok(absorber.diffuseAbsorption>0&&absorber.tubeCutoff>0&&absorber.helmholtzFrequency>0);

  const tuned=tunedAbsorberIsolationState();
  const detuned=tunedAbsorberIsolationState({tuningRatio:.75});
  assert.ok(tuned.reductionDb>detuned.reductionDb);
  assert.ok(tuned.transmissibility<1&&tuned.staticDeflection>0&&tuned.unbalanceForce>0);
});

test('workflow expansion models preserve correlation, energy, statistics, and limiting behavior',()=>{
  const exact=modelTestCorrelationState({modelFrequency:420,testFrequency:420,modelDamping:.02,testDamping:.02,shapeRotationDegrees:0,spatialNoise:0});
  close(exact.mac,1,1e-12);
  close(exact.frac,1,1e-12);
  close(exact.frequencyError,0,1e-12);

  const sea=branchingSeaState();
  close(sea.balanceError,0,1e-12);
  assert.ok(sea.energies.every(value=>value>0));
  close(sea.primaryShare+sea.flankingShare,1,1e-12);

  const tpa=transferPathState({coherence:1,phase1:0,phase2:180,phase3:0});
  assert.ok(tpa.totalResponse<=tpa.paths.reduce((sum,path)=>sum+path.magnitude,0));

  const requirement=requirementsFlowdownState({responseLimit:100});
  assert.equal(requirement.notchRequired,false);
  close(requirement.notchFactor,1,1e-12);

  const hardening=nonlinearJointState({cubicRatio:.5,amplitudeMm:1});
  assert.ok(hardening.effectiveFrequency>hardening.linearFrequency);

  const uncertaintyA=uncertaintySensitivityState({trials:200,seed:17});
  const uncertaintyB=uncertaintySensitivityState({trials:200,seed:17});
  assert.deepEqual(uncertaintyA.samples,uncertaintyB.samples);
  assert.ok(uncertaintyA.p95>uncertaintyA.p50);

  const miles=milesValidityState({slopeDbPerOctave:0});
  assert.ok(Math.abs(miles.error)<1);
  const ers=extremeResponseState({duration:60,bandwidth:12,exceedanceProbability:.01});
  assert.ok(ers.extreme>ers.rms&&ers.crestFactor>1);
});

test('every interactive demo has a short state-aware engineering takeaway',()=>{
  assert.doesNotThrow(()=>assertDemoTakeawayRegistry(demos));
  assert.equal(Object.keys(demoTakeawayRegistry).length,demos.length);
  for(const demo of demos){
    const takeaway=buildDemoTakeaway(demo.id);
    assert.equal(takeaway.id,demo.id);
    assert.ok(takeaway.summary.length>=45,`${demo.id} takeaway is too short`);
    assert.ok(takeaway.summary.length<=420,`${demo.id} takeaway is too long`);
  }
  assert.notEqual(buildDemoTakeaway('damping-transmissibility',{ratio:1}).summary,buildDemoTakeaway('damping-transmissibility',{ratio:2}).summary);
  assert.notEqual(buildDemoTakeaway('beam-wave',{view:0}).summary,buildDemoTakeaway('beam-wave',{view:1}).summary);
  assert.match(buildDemoTakeaway('double-panel-energy-paths',{medium:'helium',frequency:1250,_summary:'Transmission loss 31.4 dB'}).summary,/helium.*31\.4 dB/i);
});

test('ACS 519 limiting cases and coupled balances remain physically consistent',()=>{
  const compact=pistonRadiationState({radius:.12,frequency:.01});
  close(compact.addedMass,compact.lowKaAddedMass,2e-4);
  assert.ok(compact.resistance>=0&&compact.reactance>=0);

  const isotropic=orthotropicPanelState({d11:100,d22:100,d12:30,d66:35});
  close(isotropic.minimumCritical,isotropic.maximumCritical,1e-10);
  close(isotropic.anisotropyRatio,1,1e-10);

  const sparse=seaValidityState({modalDensity:.003,lossFactor:.005,frequency:500});
  const statistical=seaValidityState({modalDensity:.1,lossFactor:.08,frequency:1500,couplingLossFactor:.005});
  assert.match(sparse.readiness,/deterministic|hybrid/);
  assert.match(statistical.readiness,/statistical regime/);

  const sea=doublePanelSeaState();
  close(sea.totalDissipation,sea.sourcePower,1e-10);
  close(sea.balanceError,0,1e-10);
  assert.ok(sea.energies.every(value=>value>0));

  const editableNetwork=seaNetworkState({frequency:800,subsystems:[
    {name:'Source cavity',kind:'acoustic',modalDensity:.08,lossFactor:.02,volume:8,density:1.204,soundSpeed:343,inputPower:1},
    {name:'Panel',kind:'structural',modalDensity:.04,lossFactor:.03,mass:24},
    {name:'Receiver cavity',kind:'acoustic',modalDensity:.06,lossFactor:.025,volume:6,density:1.204,soundSpeed:343}
  ],links:[{i:0,j:1,forward:.01},{i:1,j:2,forward:.008}]});
  close(editableNetwork.totalDissipatedPower,editableNetwork.totalInputPower,1e-10);
  assert.ok(editableNetwork.energies.every(value=>value>0));
  assert.ok(editableNetwork.subsystemResults.every(item=>item.velocityRms>0));
  close(editableNetwork.transmissionLoss,editableNetwork.subsystemResults[0].levelDb-editableNetwork.subsystemResults[2].levelDb,1e-10);
  editableNetwork.links.forEach(link=>close(link.reciprocityRatio,1,1e-10));
  editableNetwork.powerFlows.forEach(flow=>close(flow.net,flow.grossForward-flow.grossReverse,1e-10));

  const airWindow=doubleWindowSeaState({medium:'air',frequency:1000});
  const heliumWindow=doubleWindowSeaState({medium:'helium',frequency:1000});
  const waterWindow=doubleWindowSeaState({medium:'water',frequency:1000});
  assert.equal(Object.keys(SEA_MEDIA).length,5);
  assert.ok(heliumWindow.crossGapCuton>airWindow.crossGapCuton);
  assert.ok(waterWindow.massFluidMassFrequency>airWindow.massFluidMassFrequency*50);
  assert.notEqual(waterWindow.cavityModalDensity,airWindow.cavityModalDensity);
  assert.ok(waterWindow.pane2Velocity>airWindow.pane2Velocity);
  for(const state of [airWindow,heliumWindow,waterWindow])close(state.network.balanceError,0,1e-10);

  const khie=khiePatchState();
  assert.ok(khie.totalMagnitude>=0&&Number.isFinite(khie.totalPhase));
  const pipe=pipeNoiseState();
  assert.ok(pipe.convectiveWavenumber>pipe.acousticWavenumber);
  assert.ok(pipe.higherOrderCuton>0&&pipe.ringFrequency>0);

  const waveBaseline=waveMatchingState();
  const waveCoincidence=waveMatchingState({frequency:waveBaseline.criticalFrequency});
  close(waveCoincidence.acousticMatchRatio,1,1e-10);
  const waveConvective=waveMatchingState({frequency:waveBaseline.convectiveMatchFrequency});
  close(waveConvective.convectiveMatchRatio,1,1e-10);

  const driven=drivenRadiationState();
  assert.ok(driven.driveMobility>0&&driven.surfaceAveragedMobility>0&&driven.soundPower>0);
  close(driven.resonantPower+driven.nonresonantPower,driven.soundPower,1e-10);
  assert.ok(driven.dominant&&driven.dominant.power>0);

  const probe=soundIntensityProbeState({reflectionCoefficient:0,phaseMismatchDegrees:0});
  close(probe.estimatedIntensity/probe.trueNormalIntensity,probe.spacingFactor,1e-10);
  const probeLimit=soundIntensityProbeState({frequency:probe.maximumFrequencyKd055,spacer:probe.spacer});
  close(probeLimit.kd,.55,1e-10);

  const unpressurized=dynamicStressEnvironmentState({pressure:0});
  const pressurized=dynamicStressEnvironmentState();
  close(unpressurized.pressureFrequencyShiftPercent,0,1e-10);
  assert.ok(pressurized.pressurizedFrequency>pressurized.unpressurizedFrequency);
  assert.ok(pressurized.alternatingStressPeak>0&&pressurized.meanHoopStress>0);

  const launchNear=launchAcousticSourceState({radialDistance:1000,plumeLength:1,atmosphereDbPerKm:0});
  const launchFar=launchAcousticSourceState({radialDistance:2000,plumeLength:1,atmosphereDbPerKm:0});
  close(launchFar.overallLevel-launchNear.overallLevel,-20*Math.log10(2),2e-6);
  const launchSuppressed=launchAcousticSourceState({suppressionDb:10});
  const launchUnsuppressed=launchAcousticSourceState({suppressionDb:0});
  close(launchSuppressed.overallLevel-launchUnsuppressed.overallLevel,-10,1e-10);

  const nearlyDry=wetTankDynamicsState({fillFraction:.01});
  const mostlyFull=wetTankDynamicsState({fillFraction:.9});
  assert.ok(nearlyDry.wetShellFrequency<=nearlyDry.dryShellFrequency);
  assert.ok(mostlyFull.wetShellFrequency<nearlyDry.wetShellFrequency);
  assert.ok(mostlyFull.firstSloshFrequency>0&&mostlyFull.firstLiquidAcousticFrequency>0);
  close(wetTankDynamicsState({effectiveAcceleration:0}).firstSloshFrequency,0,1e-12);

  const equivalent=qualificationTestState({marginDb:0,forceLimitAsd:1e9,responseLimitRms:1e9});
  close(equivalent.controlledDamageRatio,1,1e-10);
  const forceLimited=qualificationTestState({forceLimitAsd:10,responseLimitRms:1e9});
  assert.ok(forceLimited.controlledTestPsd<forceLimited.unlimitedTestPsd);
  assert.match(forceLimited.limitingMechanism,/force limit/);
});

test('spatial field models preserve normalization and expected length scales',()=>{
  const common={frequency:500,soundSpeed:343,incidence:55,azimuth:25,velocity:180,alphaX:.12,alphaY:.7};
  for(const model of ['diffuse','plane-wave','tbl']){
    const center=spatialCoherence(model,{...common,x:0,y:0});
    close(center.re,1,1e-12);close(center.im,0,1e-12);close(center.magnitude,1,1e-12);
    const positive=spatialCoherence(model,{...common,x:.14,y:-.08});
    const negative=spatialCoherence(model,{...common,x:-.14,y:.08});
    close(positive.re,negative.re,1e-6);close(positive.im,-negative.im,1e-6);
  }
  const diffuseZero=spatialCoherence('diffuse',{...common,x:(common.soundSpeed/common.frequency)/2,y:0});
  close(diffuseZero.re,0,1e-12);
  const wave=spatialCoherence('plane-wave',{...common,x:.2,y:.1});
  close(wave.magnitude,1,1e-12);
  const streamwiseLength=common.velocity/(common.alphaX*2*Math.PI*common.frequency);
  const tbl=spatialCoherence('tbl',{...common,x:streamwiseLength,y:0});
  close(tbl.magnitude,Math.exp(-1),1e-6);
});

test('panel joint acceptance reproduces uniform-mode limits and nonnegative random-field coupling',()=>{
  const common={length:2,width:1.2,frequency:135,soundSpeed:343,incidence:0,azimuth:0,velocity:180,alphaX:.12,alphaY:.7,gridX:41,gridY:25};
  const uniform11=jointAcceptance('uniform',{...common,modeX:1,modeY:1});
  close(uniform11.jointAcceptance,16/Math.PI**4,2e-3);
  close(uniform11.modalForceRatio**2,uniform11.jointAcceptance,1e-12);
  const uniform21=jointAcceptance('uniform',{...common,modeX:2,modeY:1});
  assert.ok(uniform21.jointAcceptance<1e-12);
  const normalWave=jointAcceptance('plane-wave',{...common,modeX:1,modeY:1});
  close(normalWave.jointAcceptance,uniform11.jointAcceptance,1e-12);
  for(const model of ['diffuse','tbl']){
    const result=jointAcceptance(model,{...common,modeX:3,modeY:1,gridX:25,gridY:15});
    assert.ok(result.jointAcceptance>=0&&result.jointAcceptance<=1);
    close(result.contribution.reduce((sum,value)=>sum+value,0)/result.contribution.length,result.jointAcceptance,1e-12);
  }
});

test('TBL joint acceptance peaks near the finite-panel convection-velocity match',()=>{
  const params={length:2,width:1.2,modeX:3,modeY:1,frequency:135,alphaX:.12,alphaY:.7,gridX:25,gridY:15};
  const matchVelocity=2*params.frequency*params.length/params.modeX;
  close(matchVelocity,180,1e-12);
  const velocities=Array.from({length:111},(_,index)=>20+3*index);
  const values=velocities.map(velocity=>jointAcceptance('tbl',{...params,velocity}).jointAcceptance);
  let peakIndex=0;for(let index=1;index<values.length;index++)if(values[index]>values[peakIndex])peakIndex=index;
  assert.ok(velocities[peakIndex]>=205&&velocities[peakIndex]<=220);
  assert.ok(values[peakIndex]>jointAcceptance('tbl',{...params,velocity:matchVelocity}).jointAcceptance);
  assert.ok(values[peakIndex]>values[0]&&values[peakIndex]>values.at(-1));
});

test('TR 12-007 honeycomb model recovers bending and shear limits with the expected panel-1 scales',()=>{
  const panel=honeycombPreset('panel1');
  const state=honeycombWaveState(panel,1000,0.01);
  close(state.effectiveSpeed,588.256803,2e-6);
  close(state.modalDensity,0.0277708,2e-5);
  close(state.modesThirdOctave,6.4296,2e-4);
  close(state.conductance,2.2763e-4,2e-4);
  assert.ok(state.bendingSpeed>state.effectiveSpeed);
  assert.ok(state.shearSpeed>state.effectiveSpeed);
  const low=honeycombWaveState(panel,1);
  close(low.effectiveSpeed/low.bendingSpeed,1,2e-3);
  const high=honeycombWaveState(panel,1e8);
  close(high.effectiveSpeed/high.shearSpeed,1,2e-3);
  const coincidence=honeycombCoincidenceFrequency(panel);
  assert.ok(coincidence>300&&coincidence<325);
});

test('experimental SEA inversion closes an independently generated two-subsystem power balance',()=>{
  const expected={frequency:1250,P1:1.2e-4,P2:8e-5,eta11:0.012,eta12:0.004,eta21:0.005,eta22:0.014};
  const energies=seaForwardEnergies(expected);
  const inferred=experimentalSeaInverse(energies);
  for(const key of ['eta11','eta12','eta21','eta22']){
    close(inferred[key],expected[key],1e-10);
    assert.ok(inferred[key]>=0);
  }
  assert.ok(inferred.separation>0.5);
});

test('junction learning models stay passive and expose the fastener-spacing regime',()=>{
  for(const model of ['paper-lap','ideal-line','blocking-mass','point-array']){
    const state=junctionTransmissionState(honeycombPreset('panel1'),honeycombPreset('panel2'),1000,{model,boltSpacing:0.254,jointLength:1.22,connectionCount:6,blockingMassPerLength:15});
    assert.ok(state.tau12>=0&&state.tau12<=1,model+' tau12 is not passive');
    assert.ok(state.tau21>=0&&state.tau21<=1,model+' tau21 is not passive');
    assert.ok(state.eta12Line>=0&&state.eta21Line>=0);
    assert.ok(['line-like spacing','periodic-junction transition','point-connection scale'].includes(state.regime));
  }
});

test('inhomogeneous energy model keeps mass weighting finite and quantifies sparse-sensor bias',()=>{
  const result=inhomogeneousEnergyStudy({panel:honeycombPreset('panel1'),modeX:3,modeY:1,sensorCount:6,layout:'paper-six'});
  assert.ok(result.exactEnergy>0&&result.uniformEnergy>0&&result.sparseEnergy>0);
  assert.ok(Math.abs(result.sparseBias)>5);
  assert.equal(result.modeMatrix.length,result.massMatrix.length);
  assert.equal(result.modeMatrix[0].length,result.massMatrix[0].length);
  assert.equal(result.sensors.length,6);
});

test('finite-aperture wavenumber scan recovers the synthetic junction transmission trend',()=>{
  const result=wavenumberTransmissionStudy({frequency:1000,transmission:0.2,incidence:20,deltaK:3,nx:18,ny:12,window:'hann'});
  assert.ok(result.recoveredTransmission>0&&result.recoveredTransmission<1);
  assert.ok(Math.abs(result.recoveredTransmission-result.transmission)<0.04);
  assert.ok(result.kNyquistX>result.state1.wavenumber);
  assert.ok(result.kNyquistY>result.state1.wavenumber);
});

test('CLF energy-flow model conserves power and separates gross exchange from net flow',()=>{
  const result=twoSubsystemEnergyBalance({frequency:1000,n1:.08,n2:.04,eta1:.03,eta2:.05,eta12:.02,P1:1,P2:0});
  close(result.eta21,.04,1e-12);
  close(result.reciprocityRatio,1,1e-12);
  close(result.dissipation1+result.dissipation2,result.inputPower,1e-12);
  close(result.balanceError,0,1e-12);
  assert.ok(result.gross12>0&&result.gross21>0);
  close(result.net12,result.gross12-result.gross21,1e-12);
  const equilibrium=couplingPowerState({frequency:1000,n1:.08,n2:.04,eta12:.02,E1:.08,E2:.04});
  close(equilibrium.modalEnergy1,equilibrium.modalEnergy2,1e-12);
  close(equilibrium.gross12,equilibrium.gross21,1e-12);
  close(equilibrium.net12,0,1e-12);
});

test('CLF power-injection forward model and inverse identification close exactly',()=>{
  const truth=forwardClfExperiment({frequency:1250,n1:.07,n2:.11,eta1:.013,eta2:.019,eta12:.006,P1:1.2e-4,P2:8e-5});
  const identified=identifyClfExperiment(truth);
  close(identified.eta1,truth.eta1,1e-10);
  close(identified.eta12,truth.eta12,1e-10);
  close(identified.eta21,truth.eta21,1e-10);
  close(identified.eta2,truth.eta2,1e-10);
  assert.ok(identified.separation>0&&identified.separation<=1);
});

test('CLF uncertainty study is reproducible and distinguishes random spread from systematic energy bias',()=>{
  const exact=clfIdentificationUncertainty({trials:40,energyUncertainty:0,powerUncertainty:0,seed:17,n1:.028,n2:.025,eta1:.012,eta2:.014,eta12:.004});
  close(exact.statistics.eta12.median,exact.truth.eta12,1e-12);
  close(exact.statistics.eta21.median,exact.truth.eta21,1e-12);
  close(exact.statistics.reciprocityRatio.median,1,1e-12);
  close(exact.anyNegativeProbability,0,1e-12);
  const biased=clfIdentificationUncertainty({trials:40,energyUncertainty:0,powerUncertainty:0,energyBias2:-20,seed:17,n1:.028,n2:.025,eta1:.012,eta2:.014,eta12:.004});
  close(biased.statistics.eta12.median,biased.truth.eta12,1e-12);
  close(biased.statistics.reciprocityRatio.median,.8,1e-12);
  const noisyA=clfIdentificationUncertainty({trials:80,energyUncertainty:18,powerUncertainty:4,seed:42});
  const noisyB=clfIdentificationUncertainty({trials:80,energyUncertainty:18,powerUncertainty:4,seed:42});
  assert.deepEqual(noisyA.samples,noisyB.samples);
  assert.ok(noisyA.statistics.eta12.p95>noisyA.statistics.eta12.p05);
});

test('standalone build contains the current catalogs, renderers, and demo takeaways',()=>{
  const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
  assert.match(html,/"title": "Spatial Correlation Fields"/);
  assert.match(html,/function spatialCoherence\(model,params=\{\}\)/);
  assert.match(html,/"id": "liftoff-ascent-forcing"/);
  assert.match(html,/data-embedded-demo="coincidence"/);
  assert.match(html,/"id": "joint-acceptance"/);
  assert.match(html,/function jointAcceptance\(model,params=\{\}\)/);
  assert.match(html,/Joint acceptance versus convection velocity/);
  assert.match(html,/U<sub>c,match<\/sub> ≈ 2fL\/m/);
  assert.match(html,/"id": "honeycomb-junctions-exp-sea"/);
  assert.match(html,/"id": "sandwich-regimes"/);
  assert.match(html,/function honeycombWaveState\(input = \{\}, frequency = 1000/);
  assert.match(html,/function experimentalSeaInverse\(input = \{\}\)/);
  assert.match(html,/function wavenumberTransmissionStudy\(input = \{\}\)/);
  assert.match(html,/function mountSandwichRegimes\(root\)/);
  assert.match(html,/function mountEnergyBias\(root\)/);
  assert.match(html,/function mountWavenumberTransmission\(root\)/);
  assert.match(html,/function mountJunctionTransmission\(root\)/);
  assert.match(html,/"id": "clf-not-a-percentage"/);
  assert.match(html,/CLF Energy-Flow Workbench/);
  assert.match(html,/function twoSubsystemEnergyBalance\(input = \{\}\)/);
  assert.match(html,/function clfIdentificationUncertainty\(input = \{\}\)/);
  assert.match(html,/id:'clf-identification-uncertainty'/);
  assert.match(html,/Gross exchange occurs in both directions/);
  assert.match(html,/id: 'modal-radiation-deep-dive'/);
  assert.match(html,/id: 'pipe-noise-pathways'/);
  assert.match(html,/function modalRadiationState\(input = \{\}\)/);
  assert.match(html,/function doublePanelSeaState\(input = \{\}\)/);
  assert.match(html,/function seaNetworkState\(input = \{\}\)/);
  assert.match(html,/function doubleWindowSeaState\(input = \{\}\)/);
  assert.match(html,/function mountModalRadiation\(root\)/);
  assert.match(html,/id: 'wave-matching-deep-dive'/);
  assert.match(html,/id: 'intensity-probe-lab'/);
  assert.match(html,/function waveMatchingState\(input = \{\}\)/);
  assert.match(html,/function drivenRadiationState\(input = \{\}\)/);
  assert.match(html,/function soundIntensityProbeState\(input = \{\}\)/);
  assert.match(html,/function dynamicStressEnvironmentState\(input = \{\}\)/);
  assert.match(html,/function mountStressEnvironment\(root\)/);
  assert.match(html,/\+ Structural subsystem/);
  assert.match(html,/Window-gap medium/);
  assert.match(html,/Gross and net coupling power/);
  assert.match(html,/id: 'launch-acoustic-sources-deep-dive'/);
  assert.match(html,/id: 'wet-tank-dynamics-deep-dive'/);
  assert.match(html,/id: 'qualification-testing-deep-dive'/);
  assert.match(html,/function launchAcousticSourceState\(input = \{\}\)/);
  assert.match(html,/function wetTankDynamicsState\(input = \{\}\)/);
  assert.match(html,/function qualificationTestState\(input = \{\}\)/);
  assert.match(html,/function mountLaunchSource\(root\)/);
  assert.match(html,/function mountWetTank\(root\)/);
  assert.match(html,/function mountQualification\(root\)/);
  assert.match(html,/const __demoTakeaways=\(\(\)=>\{/);
  assert.match(html,/function mountDemoTakeaway\(root, id\)/);
  assert.match(html,/Engineering takeaway/);
  assert.match(html,/Read the complete launch-vehicle deep dive/);
  assert.match(html,/id: 'model-test-correlation'/);
  assert.match(html,/id: 'miles-equation'/);
  assert.match(html,/id: 'extreme-response-spectrum'/);
  assert.match(html,/function branchingSeaState\(input = \{\}\)/);
  assert.match(html,/function mountMiles\(root\)/);
  assert.match(html,/function mountExtreme\(root\)/);
  assert.match(html,/const __workflowExpansionData=\(\(\)=>\{/);
  assert.match(html,/const __programExpansionData=\(\(\)=>\{/);
  assert.match(html,/id: 'nonstationary-environment'/);
  assert.match(html,/id: 'launch-vibroacoustic-capstone'/);
  assert.match(html,/function nonstationaryEnvironmentState\(input = \{\}\)/);
  assert.match(html,/function capstoneState\(input = \{\}\)/);
  assert.match(html,/function mountCapstone\(root\)/);
  assert.match(html,/const __seaParameterData=\(\(\)=>\{/);
  assert.match(html,/const __seaParameterPhysics=\(\(\)=>\{/);
  assert.match(html,/id: 'sea-parameter-provenance'/);
  assert.match(html,/function seaParameterWorkbenchState\(input = \{\}\)/);
  assert.match(html,/function installedFairingSeaState\(input = \{\}\)/);
  assert.match(html,/function mountFairing\(root\)/);
});

test('offline cache includes the demo takeaway runtime',()=>{
  const worker=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
  assert.match(worker,/const CACHE = 'sau-v19'/);
  assert.match(worker,/\.\/js\/demo-takeaways\.js/);
  assert.match(worker,/\.\/js\/workflow-expansion-data\.js/);
  assert.match(worker,/\.\/js\/workflow-expansion-demos\.js/);
  assert.match(worker,/\.\/js\/program-expansion-physics\.js/);
  assert.match(worker,/\.\/js\/program-expansion-calculators\.js/);
  assert.match(worker,/\.\/js\/program-expansion-data\.js/);
  assert.match(worker,/\.\/js\/program-expansion-demos\.js/);
  assert.match(worker,/\.\/js\/sea-parameters-physics\.js/);
  assert.match(worker,/\.\/js\/sea-parameters-calculators\.js/);
  assert.match(worker,/\.\/js\/sea-parameters-data\.js/);
  assert.match(worker,/\.\/js\/sea-parameters-demos\.js/);
});

test('default result payloads are finite and structurally consistent',()=>{
  const assertFinite=(value,path)=>{
    if(typeof value==='number') assert.ok(Number.isFinite(value),`${path} is not finite`);
    else if(Array.isArray(value)) value.forEach((item,index)=>assertFinite(item,`${path}[${index}]`));
    else if(value&&typeof value==='object') Object.entries(value).forEach(([key,item])=>assertFinite(item,`${path}.${key}`));
  };
  for(const tool of catalog){
    const result=registry[tool.id].compute(defaults(tool.id));
    assertFinite(result,tool.id);
    for(const [plotIndex,plot] of (result.plots||[]).entries()){
      assert.ok((plot.traces||[]).length>0,`${tool.id} plot ${plotIndex} has no traces`);
      for(const [traceIndex,trace] of plot.traces.entries()){
        assert.equal(trace.x.length,trace.y.length,`${tool.id} plot ${plotIndex} trace ${traceIndex} x/y mismatch`);
        assert.ok(trace.x.length>0,`${tool.id} plot ${plotIndex} trace ${traceIndex} is empty`);
        if(plot.xScale==='log') assert.ok(trace.x.every(value=>value>0),`${tool.id} plot ${plotIndex} has nonpositive log-x data`);
        if(plot.yScale==='log') assert.ok(trace.y.every(value=>value>0),`${tool.id} plot ${plotIndex} has nonpositive log-y data`);
      }
    }
    for(const [heatmapIndex,heatmap] of (result.heatmaps||[]).entries()){
      assert.ok(Array.isArray(heatmap.matrix)&&heatmap.matrix.length>0,`${tool.id} heatmap ${heatmapIndex} is empty`);
      const width=heatmap.matrix[0].length;
      assert.ok(width>0,`${tool.id} heatmap ${heatmapIndex} has no columns`);
      assert.ok(heatmap.matrix.every(row=>row.length===width),`${tool.id} heatmap ${heatmapIndex} is ragged`);
    }
    for(const [tableIndex,table] of (result.tables||[]).entries()){
      assert.ok((table.columns||[]).length>0,`${tool.id} table ${tableIndex} has no columns`);
      assert.ok((table.rows||[]).every(row=>row.length===table.columns.length),`${tool.id} table ${tableIndex} row/column mismatch`);
    }
    if(result.csv) assert.ok((result.csv.rows||[]).every(row=>row.length===result.csv.columns.length),`${tool.id} CSV row/column mismatch`);
  }
});

test('catalog identifiers, chapter identifiers, and concept anchors are unique',()=>{
  const unique=(items,label)=>assert.equal(new Set(items).size,items.length,`${label} contain duplicates`);
  unique(catalog.map(tool=>tool.id),'tool IDs');
  unique(sections.map(section=>section.id),'chapter IDs');
  unique(demos.map(demo=>demo.id),'demo IDs');
  unique(caseNotes.map(note=>note.id),'case-note IDs');
  unique(sections.flatMap(section=>section.concepts.map(concept=>`${section.id}:${concept.title}`)),'concept titles within chapters');
});
