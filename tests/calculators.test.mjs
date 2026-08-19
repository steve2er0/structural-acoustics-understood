import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sections as baseSections, toolCatalog, demos as baseDemos, caseNotes as baseCaseNotes } from '../js/data.js';
import { extraToolCatalog } from '../js/extra-data.js';
import { calculatorRegistry, materials } from '../js/calculators.js';
import { PCB_ACCELEROMETER_CATALOG_META, pcbAccelerometers, pcbAccelerometerOptions } from '../js/pcb-accelerometers-data.js';
import { extraCalculatorRegistry } from '../js/extra-calculators.js';
import { sorbothaneIsolationCalculator } from '../js/sorbothane-isolation.js';
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
  infiniteMobilityAtlasState,
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
  shellAcousticsState,
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
import { axisUnitInfo, displayEngineeringResult, fromDisplayNumber, toDisplayNumber, toDisplayStep, unitConversion } from '../js/unit-system.js';
import { heatmapSvg, harmonicPhase, lineChartSvg, rangeChartSvg, signedHeatColor, surface3dSvg } from '../js/charts.js';
import {
  featuredItems,
  homepageNavigation,
  homepageNavKey,
  renderHomepage,
  renderSubjectPage,
  subjectWheel
} from '../js/homepage.js';
import {
  renderBreadcrumbs,
  renderCallout,
  renderLinkCollection,
  renderPageShell,
  renderSectionHeader,
  siteComponentInventory
} from '../js/site-components.js';
import {
  defaultLaunchSeaProject,
  renderLaunchSeaCapstone,
  solveLaunchSeaProject
} from '../js/launch-sea-capstone.js';
import {
  engineeringAnalysisDefinitions,
  engineeringAnalysisIds,
  engineeringAnalysisRegistry,
  engineeringWorkbenchDefinitions,
  engineeringWorkbenchIds,
  engineeringWorkbenchRegistry
} from '../js/engineering-workbenches.js';
import { createEngineeringToolProject, normalizeEngineeringToolProject } from '../js/workbench-runtime.js';
import {
  classifyTool,
  createEngineeringProject,
  engineeringProjectReport,
  environmentLibrary,
  hardwareTopics,
  learningPathways,
  materialLibrary,
  normalizeEngineeringProject,
  projectTemplates,
  runValidationBenchmarks,
  toolHandoffs
} from '../js/engineering-system.js';
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
const registry={...calculatorRegistry,...extraCalculatorRegistry,...acs519CalculatorRegistry,...workflowExpansionCalculatorRegistry,...programExpansionCalculatorRegistry,...seaParameterCalculatorRegistry,'sorbothane-isolation':sorbothaneIsolationCalculator};
const demos=[...baseDemos,...acs519Demos,...workflowExpansionDemos,...programExpansionDemos,...seaParameterDemos];
const caseNotes=[...baseCaseNotes,...acs519CaseNotes,...workflowExpansionCaseNotes,...programExpansionCaseNotes,...seaParameterCaseNotes];
const defaults=id=>Object.fromEntries(registry[id].inputs.map(f=>[f.key,f.default]));
const metric=(result,label)=>result.values.find(x=>x.label===label)?.value;
const close=(actual,expected,rel=1e-6)=>assert.ok(Math.abs(actual-expected)<=rel*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);
const evidenceCollection={plot:'plots',rangeChart:'rangeCharts',heatmap:'heatmaps',surface3d:'surfaces3d',schematic:'schematics',table:'tables'};

test('every catalog entry has a calculator and every default case runs',()=>{
  assert.equal(catalog.length,114);
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
    assert.ok(Array.isArray(result.interpretation.engineeringConsiderations),`${tool.id} considerations must be an array`);
    assert.ok(result.assumptions.satisfied.length>0,`${tool.id} needs model assumptions`);
    assert.ok(Array.isArray(result.assumptions.warnings),`${tool.id} warnings must be an array`);
    assert.ok(Array.isArray(result.assumptions.alerts),`${tool.id} alerts must be an array`);
    assert.ok(Array.isArray(result.assumptions.limitations),`${tool.id} limitations must be an array`);
    assert.deepEqual(result.assumptions.warnings,result.assumptions.alerts,`${tool.id} legacy warnings must alias active alerts`);
    assert.ok(result.validity.regime.length>20,`${tool.id} needs a validity regime`);
    assert.ok(result.validity.confidence.length>20,`${tool.id} needs a confidence statement`);
    assert.ok(result.relatedConcepts.length>=2,`${tool.id} needs related concepts`);
    assert.ok(result.relatedConcepts.every(item=>item.title&&item.description&&item.href),`${tool.id} has an incomplete related concept`);
    assert.ok(result.presentation&&Number.isInteger(result.presentation.primaryValueCount),`${tool.id} needs presentation metadata`);
    if(result.presentation.primaryEvidence){const {type,index}=result.presentation.primaryEvidence;assert.ok(['plot','rangeChart','heatmap','surface3d','schematic','table'].includes(type),`${tool.id} has an invalid primary evidence type`);assert.ok(result[evidenceCollection[type]]?.[index],`${tool.id} primary evidence does not exist`);}
    assert.ok(Array.isArray(result.presentation.primaryEvidenceStack),`${tool.id} needs a primary evidence stack`);
    result.presentation.primaryEvidenceStack.forEach(({type,index})=>assert.ok(result[evidenceCollection[type]]?.[index],`${tool.id} stacked primary evidence does not exist`));
    assert.doesNotMatch(result.interpretation.physicalMeaning,/^The reported\b/,`${tool.id} retained generic category commentary`);
    assert.doesNotMatch(result.validity.confidence,/No automatic warning/i,`${tool.id} retained a no-warning strip`);
    const copied=engineeringResultToText(tool.title,result);
    for(const heading of ['NUMERICAL RESULTS','ENGINEERING INTERPRETATION','PHYSICAL MEANING','MODEL ASSUMPTIONS','VALIDITY RECORD','RELATED CONCEPTS']){
      assert.match(copied,new RegExp(heading),`${tool.id} copy output omits ${heading}`);
    }
  }
});

test('PCB accelerometer catalog is normalized, grouped, and source traceable',()=>{
  const sensorField=registry.accelerometer.inputs.find(field=>field.key==='sensor_model');
  assert.equal(sensorField.searchable.noun,'sensor choices');
  assert.match(sensorField.searchable.placeholder,/model.*family.*sensitivity.*range/i);
  assert.equal(PCB_ACCELEROMETER_CATALOG_META.productCount,252);
  assert.equal(pcbAccelerometers.length,PCB_ACCELEROMETER_CATALOG_META.productCount);
  assert.equal(new Set(pcbAccelerometers.map(sensor=>sensor.model)).size,pcbAccelerometers.length);
  assert.equal(pcbAccelerometerOptions.length,pcbAccelerometers.length);
  assert.ok(pcbAccelerometerOptions.every(option=>option.group&&option.label.includes(option.value)));
  assert.ok(pcbAccelerometers.every(sensor=>sensor.productUrl.startsWith('https://www.pcb.com/')));
  assert.ok(PCB_ACCELEROMETER_CATALOG_META.fieldCoverage.sensitivity>=200);
  assert.ok(PCB_ACCELEROMETER_CATALOG_META.fieldCoverage.frequencyRange>=190);
  const model=pcbAccelerometers.find(sensor=>sensor.model==='352C04');
  assert.deepEqual({sensitivity:model.sensitivityValue,unit:model.sensitivityUnit,range:model.measurementRangeGPeak,frequency:[model.frequencyMinHz,model.frequencyMaxHz],temperature:[model.temperatureMinC,model.temperatureMaxC]},
    {sensitivity:10,unit:'mV/g',range:500,frequency:[.5,10000],temperature:[-54,121]});
});

test('PCB accelerometer explorer exposes specification ranges and DAQ-limited dynamic range',()=>{
  const base=defaults('accelerometer'),result=registry.accelerometer.compute(base);
  assert.equal(metric(result,'Selected model'),'352C04');
  assert.equal(result.rangeCharts.length,4);
  assert.deepEqual(result.rangeCharts.map(chart=>chart.title),[
    '352C04 frequency coverage',
    '352C04 operating-temperature coverage',
    '352C04 nominal sensitivity',
    '352C04 sensor + 24-bit DAQ dynamic range'
  ]);
  assert.equal(result.presentation.primaryEvidenceStack.length,4);
  const dynamic=result.rangeCharts.at(-1),daqLane=dynamic.lanes.find(lane=>lane.label==='24-bit DAQ'),usableLane=dynamic.lanes.find(lane=>lane.label==='Usable chain');
  close(daqLane.end,1000,1e-12);
  close(usableLane.end,500,1e-12);
  close(metric(result,'Usable peak ceiling'),500,1e-12);
  assert.match(rangeChartSvg(dynamic),/352C04 sensor \+ 24-bit DAQ dynamic range/);
  assert.equal(result.tables[0].rows.find(row=>row[0]==='Model').at(-1),'https://www.pcb.com/products?m=352C04');

  const eight=registry.accelerometer.compute({...base,daq_bits:'8'}),twentyFour=registry.accelerometer.compute({...base,daq_bits:'24'});
  close(metric(eight,'DAQ acceleration per code')/metric(twentyFour,'DAQ acceleration per code'),65536,1e-12);
  assert.ok(eight.rangeCharts.at(-1).lanes.some(lane=>lane.label==='8-bit DAQ'));

  const english=displayEngineeringResult(result,'English'),temperature=english.rangeCharts.find(chart=>chart.unit==='°F');
  assert.ok(temperature);
  close(temperature.lanes[0].start,-65.2,1e-12);
  close(temperature.lanes[0].end,249.8,1e-12);
});

test('PCB explorer keeps incomplete and charge-output models selectable without inventing specifications',()=>{
  const base=defaults('accelerometer');
  const incomplete=registry.accelerometer.compute({...base,sensor_model:'71M1-60K'});
  assert.equal(metric(incomplete,'Nominal sensitivity'),'Not published');
  assert.ok(incomplete.assumptions.alerts.some(alert=>/does not publish a usable sensitivity/i.test(alert)));
  assert.ok(incomplete.assumptions.limitations.some(item=>/frequency interval was not recovered/i.test(item)));

  const charge=registry.accelerometer.compute({...base,sensor_model:'357B03'});
  assert.equal(metric(charge,'Effective DAQ sensitivity'),'Unavailable');
  assert.ok(charge.assumptions.alerts.some(alert=>/charge-output accelerometer/i.test(alert)));
  const conditioned=registry.accelerometer.compute({...base,sensor_model:'357B03',conditioner_gain_mv_per_pc:1});
  close(metric(conditioned,'Effective DAQ sensitivity'),10,1e-12);
  assert.ok(conditioned.rangeCharts.at(-1).lanes.some(lane=>lane.label==='24-bit DAQ'));
});

test('decibel summation returns +3.0103 dB for equal independent levels',()=>{
  const v=defaults('db');v.levels='90, 90';
  close(metric(registry.db.compute(v),'Combined level'),93.01029995664,1e-10);
});

test('GRMS reports the integrated acceleration with PSD-specific meaning',()=>{
  const result=registry.grms.compute(defaults('grms'));
  assert.deepEqual(result.values.map(value=>value.label),['Integrated acceleration','RMS displacement','Rigid-body force estimate','Frequency range','Dominant PSD segment','PSD area from dominant segment']);
  assert.equal(metric(result,'Total mean square'),undefined);
  close(metric(result,'Integrated acceleration'),5.908793337606325,1e-10);
  close(metric(result,'RMS displacement'),0.19431208607863035,1e-10);
  close(metric(result,'Rigid-body force estimate'),10*9.80665*metric(result,'Integrated acceleration'),1e-10);
  const doubledMass=registry.grms.compute({...defaults('grms'),mass:20});
  close(metric(doubledMass,'RMS displacement'),metric(result,'RMS displacement'),1e-12);
  close(metric(doubledMass,'Rigid-body force estimate'),2*metric(result,'Rigid-body force estimate'),1e-12);
  assert.equal(result.values.find(value=>value.label==='RMS displacement').unit,'mm RMS');
  assert.equal(result.values.find(value=>value.label==='Rigid-body force estimate').unit,'N RMS');
  assert.match(result.interpretation.summary,/integrating the PSD.*acceleration/i);
  assert.match(result.interpretation.physicalMeaning,/standard deviation.*square root of the area under the acceleration PSD/i);
  assert.match(result.interpretation.physicalMeaning,/not a peak acceleration/i);
  assert.match(result.interpretation.physicalMeaning,/double-integrating.*sensitive to low-frequency content/i);
  assert.match(result.interpretation.physicalMeaning,/rigid-body inertial force/i);
  assert.ok(result.assumptions.satisfied.some(item=>/one-sided acceleration PSD/i.test(item)));
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

test('structural wave-speed tool compares elastic families and locates plate critical frequency',()=>{
  const values=defaults('bending-wave'),result=registry['bending-wave'].compute(values),E=Number(values.E_gpa)*1e9,rho=Number(values.rho),nu=Number(values.nu),h=Number(values.thickness_mm)/1000,D=E*h**3/(12*(1-nu**2));
  const longitudinal=Math.sqrt(E/rho),shear=Math.sqrt(E/(2*(1+nu))/rho),critical=Number(values.sound_speed)**2/(2*Math.PI)*Math.sqrt(rho*h/D);
  close(metric(result,'Longitudinal extensional speed'),longitudinal,1e-10);
  close(metric(result,'Shear wave speed'),shear,1e-10);
  close(metric(result,'Plate critical frequency'),critical,1e-10);
  const speedPlot=result.plots[0],traceNames=speedPlot.traces.map(item=>item.name);
  for(const name of ['Bending phase','Bending group'])assert.ok(traceNames.includes(name));
  for(const name of ['Longitudinal','Shear','Fluid'])assert.ok(traceNames.some(traceName=>traceName.startsWith(name)));
  const criticalTrace=speedPlot.traces.find(item=>item.name.startsWith('Critical f'));
  assert.deepEqual(criticalTrace.x,[critical,critical]);
  assert.match(result.interpretation.physicalMeaning,/critical frequency.*bending phase speed equals.*sound speed/i);
  assert.match(result.interpretationByUnit.English.summary,/16573.*10162.*ft\/s/);
  assert.ok(registry['bending-wave'].references.some(reference=>/Wave Motion in Elastic Solids/.test(reference.title)));
});

test('material presets synchronize dependent properties and plate modal frequencies',()=>{
  const plate=registry['plate-modes'],base=defaults('plate-modes'),frequencies=new Map();
  for(const [id,material] of Object.entries(materials)){
    const synced=plate.syncPreset({...base,material:id});
    assert.equal(synced.E_gpa,material.E/1e9);
    assert.equal(synced.rho,material.rho);
    assert.equal(synced.nu,material.nu);
    const result=plate.compute(synced),h=Number(synced.thickness_mm)/1000,a=Number(synced.a),b=Number(synced.b),D=material.E*h**3/(12*(1-material.nu**2));
    const expected=Math.PI/2*Math.sqrt(D/(material.rho*h))*(1/a**2+1/b**2);
    close(metric(result,'Fundamental mode'),expected,1e-10);
    frequencies.set(id,metric(result,'Fundamental mode'));
  }
  assert.notEqual(frequencies.get('aluminum'),frequencies.get('steel'));
  assert.ok(frequencies.get('cfrp')>frequencies.get('aluminum'));
  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/function calc\.syncPreset|typeof calc\.syncPreset/);
  assert.match(appSource,/applyPresetDependencies\(e\.target\)/);
  assert.match(appSource,/toDisplayNumber\(synced\[field\.key\],field\.unit,system\)/);
});

test('plate boundary presets update frequencies and enforce the selected edge restraint in the mode shapes',()=>{
  const plate=registry['plate-modes'],base=defaults('plate-modes'),boundaryInput=plate.inputs.find(input=>input.key==='boundary');
  assert.deepEqual(boundaryInput.options.map(option=>option.value),['simply-supported','clamped','clamped-x','clamped-y']);
  const cases=Object.fromEntries(boundaryInput.options.map(option=>[option.value,plate.compute({...base,boundary:option.value})]));
  const fundamental=boundary=>metric(cases[boundary],'Fundamental mode');
  assert.ok(fundamental('clamped')>fundamental('clamped-y'));
  assert.ok(fundamental('clamped-y')>fundamental('clamped-x'));
  assert.ok(fundamental('clamped-x')>fundamental('simply-supported'));
  const codes={'simply-supported':'SSSS',clamped:'CCCC','clamped-x':'CSCS','clamped-y':'SCSC'};
  for(const [boundary,result] of Object.entries(cases)){
    assert.match(result.surfaces3d[0].title,new RegExp(`3D ${codes[boundary]} plate mode`));
    result.surfaces3d.forEach(shape=>{
      assert.ok(shape.matrix[0].every(value=>Math.abs(value)<1e-10));
      assert.ok(shape.matrix.at(-1).every(value=>Math.abs(value)<1e-10));
      assert.ok(shape.matrix.every(row=>Math.abs(row[0])<1e-10&&Math.abs(row.at(-1))<1e-10));
    });
  }
  const simpleShape=cases['simply-supported'].surfaces3d[0].matrix,clampedShape=cases.clamped.surfaces3d[0].matrix;
  const simpleNearX=Math.max(...simpleShape.map(row=>Math.abs(row[1]))),clampedNearX=Math.max(...clampedShape.map(row=>Math.abs(row[1])));
  const simpleNearY=Math.max(...simpleShape[1].map(Math.abs)),clampedNearY=Math.max(...clampedShape[1].map(Math.abs));
  assert.ok(clampedNearX<simpleNearX*.3);
  assert.ok(clampedNearY<simpleNearY*.3);
  assert.match(cases.clamped.assumptions.limitations.join(' '),/Rayleigh trial shapes/i);
});

test('material presets synchronize advanced cylinder properties and shell-mode frequencies',()=>{
  const shell=registry['shell-acoustics'],base=defaults('shell-acoustics'),frequencies=new Map();
  assert.equal(shell.inputs[0].key,'material');
  assert.equal(shell.inputs[0].options.length,Object.keys(materials).length);
  for(const [id,material] of Object.entries(materials)){
    const synced=shell.syncPreset({...base,material:id});
    assert.equal(synced.modulus,material.E/1e9);
    assert.equal(synced.density,material.rho);
    assert.equal(synced.poisson,material.nu);
    const result=shell.compute(synced);
    const expected=shellAcousticsState({
      radius:synced.radius,
      length:synced.length,
      thickness:synced.thickness/1000,
      modulus:material.E,
      density:material.rho,
      poisson:material.nu,
      soundSpeed:synced.sound_speed,
      axialOrder:synced.axial_order,
      circumferentialOrder:synced.circ_order
    }).modeFrequency;
    close(metric(result,'Estimated shell-mode frequency'),expected,1e-10);
    assert.match(result.surfaces3d[0].title,new RegExp(`${expected.toFixed(1)} Hz`));
    frequencies.set(id,expected);
  }
  assert.notEqual(frequencies.get('aluminum'),frequencies.get('steel'));
  assert.notEqual(frequencies.get('aluminum'),frequencies.get('cfrp'));
});

test('beam, plate, and cylinder tools expose boundary-consistent animated 3D mode shapes',()=>{
  for(const boundary of ['simply-supported','cantilever','fixed-fixed']){
    const beam=registry.beam.compute({...defaults('beam'),boundary});
    assert.equal(beam.presentation.primaryEvidence.type,'surface3d');
    assert.equal(beam.presentation.primaryEvidenceCount,4);
    assert.equal(beam.presentation.animation.type,'harmonic');
    assert.equal(beam.surfaces3d.length,4);
    assert.equal(beam.plots.length,1);
    beam.surfaces3d.forEach(shape=>{
      assert.equal(shape.geometry,'beam');
      assert.equal(shape.animation.type,'harmonic');
      const values=shape.matrix.flat();
      close(Math.max(...values.map(Math.abs)),1,1e-10);
      assert.ok(shape.matrix.every(row=>row.every((value,index)=>Math.abs(value-shape.matrix[0][index])<1e-12)));
      assert.ok(shape.matrix.every(row=>Math.abs(row[0])<1e-10));
      if(boundary!=='cantilever')assert.ok(shape.matrix.every(row=>Math.abs(row.at(-1))<1e-10));
      assert.match(shape.title,/3D .* beam mode \d · [\d.]+ Hz/i);
    });
  }
  const beamSurfaceSvg=surface3dSvg(registry.beam.compute(defaults('beam')).surfaces3d[0]);
  assert.match(beamSurfaceSvg,/data-surface-animation="harmonic"/);
  assert.match(beamSurfaceSvg,/data-surface-geometry="beam"/);
  assert.match(beamSurfaceSvg,/3D oblique beam view/);
  assert.match(beamSurfaceSvg,/data-surface-base-points=/);
  assert.match(beamSurfaceSvg,/data-surface-delta-points=/);

  const plate=registry['plate-modes'].compute(defaults('plate-modes'));
  assert.equal(plate.presentation.primaryEvidence.type,'surface3d');
  assert.equal(plate.presentation.primaryEvidenceCount,4);
  assert.equal(plate.surfaces3d.length,4);
  assert.equal(plate.heatmaps.length,4);
  assert.equal(plate.presentation.animation.type,'harmonic');
  plate.surfaces3d.forEach(shape=>{
    assert.equal(shape.geometry,'plate');
    assert.equal(shape.animation.type,'harmonic');
    const values=shape.matrix.flat();
    close(Math.max(...values.map(Math.abs)),1,1e-10);
    assert.ok(shape.matrix[0].every(value=>Math.abs(value)<1e-10));
    assert.ok(shape.matrix.at(-1).every(value=>Math.abs(value)<1e-10));
    assert.ok(shape.matrix.every(row=>Math.abs(row[0])<1e-10&&Math.abs(row.at(-1))<1e-10));
  });
  plate.heatmaps.forEach(shape=>{
    const values=shape.matrix.flat();
    close(Math.max(...values.map(Math.abs)),1,1e-10);
    assert.ok(shape.matrix[0].every(value=>Math.abs(value)<1e-10));
    assert.ok(shape.matrix.at(-1).every(value=>Math.abs(value)<1e-10));
    assert.ok(shape.matrix.every(row=>Math.abs(row[0])<1e-10&&Math.abs(row.at(-1))<1e-10));
    assert.equal(shape.diverging,true);
    assert.equal(shape.animation.type,'harmonic');
  });
  const plateSvg=heatmapSvg(plate.heatmaps[0]);
  const plateSurfaceSvg=surface3dSvg(plate.surfaces3d[0]);
  assert.match(plateSvg,/Normalized position x\/a/);
  assert.match(plateSvg,/Normalized position y\/b/);
  assert.match(plateSurfaceSvg,/data-surface-animation="harmonic"/);
  assert.match(plateSurfaceSvg,/data-surface-geometry="plate"/);
  assert.match(plateSurfaceSvg,/data-surface-base-points=/);
  assert.match(plateSurfaceSvg,/data-surface-delta-points=/);

  const cylinder=registry['ring-frequency'].compute(defaults('ring-frequency'));
  assert.equal(cylinder.presentation.primaryEvidence.type,'surface3d');
  assert.equal(cylinder.presentation.primaryEvidenceCount,4);
  assert.equal(cylinder.surfaces3d.length,4);
  assert.equal(cylinder.heatmaps,undefined);
  assert.equal(cylinder.presentation.animation.type,'harmonic');
  assert.equal(cylinder.plots[0].traces.length,4);
  cylinder.surfaces3d.forEach(shape=>{
    assert.equal(shape.geometry,'cylinder');
    assert.equal(shape.animation.type,'harmonic');
    const values=shape.matrix.flat();
    close(Math.max(...values.map(Math.abs)),1,1e-10);
    assert.ok(shape.matrix[0].every(value=>Math.abs(value)<1e-10));
    assert.ok(shape.matrix.at(-1).every(value=>Math.abs(value)<1e-10));
    assert.ok(shape.matrix.every(row=>Math.abs(row[0]-row.at(-1))<1e-10));
  });
  assert.match(cylinder.interpretation.physicalMeaning,/local curvature\/extensional scale, not a boundary-dependent natural frequency/i);
  assert.equal(cylinder.relatedConcepts[0].href,'#/tool/shell-acoustics');
  assert.equal(registry['ring-frequency'].relatedLinks[0].href,'#/tool/shell-acoustics');
  const cylinderSurfaceSvg=surface3dSvg(cylinder.surfaces3d[0]);
  assert.match(cylinderSurfaceSvg,/data-surface-geometry="cylinder"/);
  assert.match(cylinderSurfaceSvg,/3D oblique cylinder view/);
  assert.match(plateSvg,/data-heatmap-base-value=/);
  close(harmonicPhase(0,1),1,1e-12);
  close(harmonicPhase(.25,1),0,1e-12);
  close(harmonicPhase(.5,1),-1,1e-12);
  assert.notEqual(signedHeatColor(-1,1),signedHeatColor(1,1));
  assert.equal(signedHeatColor(0,1),'rgb(238,242,244)');
  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/data-mode-animation-toggle/);
  assert.match(appSource,/data-surface-base-points/);
  assert.match(appSource,/surfaceCells\.forEach/);
  assert.match(appSource,/requestAnimationFrame\(step\)/);
  assert.match(appSource,/prefers-reduced-motion: reduce/);
  assert.match(appSource,/calc\.relatedLinks\?\.length/);
});

test('advanced shell acoustics leads with the selected frequency-tagged animated mode shape',()=>{
  const shell=registry['shell-acoustics'].compute({...defaults('shell-acoustics'),axial_order:2,circ_order:3});
  assert.equal(shell.presentation.primaryEvidence.type,'surface3d');
  assert.equal(shell.presentation.primaryEvidenceCount,1);
  assert.equal(shell.presentation.animation.type,'harmonic');
  assert.equal(shell.surfaces3d.length,1);
  assert.equal(shell.heatmaps,undefined);
  assert.deepEqual(shell.presentation.primaryEvidenceStack,[{type:'surface3d',index:0},{type:'plot',index:0}]);
  assert.match(shell.interpretation.physicalMeaning,/normalized radial deformation.*basis/i);
  assert.match(shell.interpretation.physicalMeaning,/not a physical-amplitude eigenvector/i);
  const surfaceSvg=surface3dSvg(shell.surfaces3d[0]);
  assert.match(surfaceSvg,/3D SS shell mode.*m=2, n=3.*Hz/);
  assert.match(surfaceSvg,/data-surface-geometry="cylinder"/);
  assert.match(surfaceSvg,/data-surface-base-value=/);
  const familyPlot=shell.plots[0];
  assert.equal(familyPlot.xLabel,'Estimated frequency (Hz)');
  assert.equal(familyPlot.yLabel,'Circumferential order n');
  assert.equal(familyPlot.xScale,'log');
  close(familyPlot.xMax,metric(shell,'Ring frequency')*1.1,1e-12);
  assert.deepEqual(familyPlot.traces.slice(0,6).map(item=>item.name),['m=1','m=2','m=3','m=4','m=5','m=6']);
  familyPlot.traces.slice(0,6).forEach(item=>assert.deepEqual(item.y,Array.from({length:17},(_,index)=>index)));
  const selectedCurve=familyPlot.traces.find(item=>item.name==='m=2');
  assert.equal(selectedCurve.emphasis,true);
  close(selectedCurve.x[3],metric(shell,'Estimated shell-mode frequency'),1e-10);
  const ringReference=familyPlot.traces.find(item=>item.name.startsWith('Ring frequency'));
  assert.deepEqual(ringReference.x,[metric(shell,'Ring frequency'),metric(shell,'Ring frequency')]);
  assert.deepEqual(ringReference.y,[0,16]);
  assert.equal(ringReference.dash,true);
  const selectedPoint=familyPlot.traces.at(-1);
  assert.deepEqual(selectedPoint.x,[metric(shell,'Estimated shell-mode frequency')]);
  assert.deepEqual(selectedPoint.y,[3]);
  assert.equal(selectedPoint.showPoints,true);
  assert.match(lineChartSvg(familyPlot),/data-chart-visible-point=/);
});

test('shell end restraint changes the selected basis and screening frequency',()=>{
  const calculator=registry['shell-acoustics'],base={...defaults('shell-acoustics'),axial_order:2,circ_order:3};
  assert.deepEqual(calculator.inputs.find(input=>input.key==='axial_boundary').options.map(option=>option.value),['simply-supported','clamped']);
  const simplySupported=calculator.compute({...base,axial_boundary:'simply-supported'}),clamped=calculator.compute({...base,axial_boundary:'clamped'});
  assert.ok(metric(clamped,'Estimated shell-mode frequency')>metric(simplySupported,'Estimated shell-mode frequency'));
  assert.match(simplySupported.surfaces3d[0].title,/3D SS shell mode/);
  assert.match(clamped.surfaces3d[0].title,/3D CC shell mode/);
  const ssRows=simplySupported.surfaces3d[0].matrix,ccRows=clamped.surfaces3d[0].matrix;
  assert.ok(ssRows[0].every(value=>Math.abs(value)<1e-12));
  assert.ok(ccRows[0].every(value=>Math.abs(value)<1e-12));
  assert.ok(ccRows.at(-1).every(value=>Math.abs(value)<1e-12));
  assert.ok(Math.max(...ccRows[1].map(Math.abs))<Math.max(...ssRows[1].map(Math.abs)));
  assert.match(clamped.assumptions.limitations.join(' '),/admissible-function wavenumber approximation/i);
});

test('beam, FE/BE, panel TL, and panel-cavity material presets stay synchronized',()=>{
  const cases=[
    ['beam','E_gpa','rho'],
    ['fe-be-planner','modulus','density'],
    ['elastic-panel-tl','modulus','panel_density'],
    ['panel-cavity','E','rho']
  ];
  for(const [id,modulusKey,densityKey] of cases){
    const calculator=registry[id],materialInput=calculator.inputs.find(input=>input.key==='material');
    assert.deepEqual(materialInput.options.map(option=>option.value),Object.keys(materials));
    const steel=calculator.syncPreset({...defaults(id),material:'steel'});
    assert.equal(steel[modulusKey],materials.steel.E/1e9);
    assert.equal(steel[densityKey],materials.steel.rho);
    assert.equal(steel.nu??steel.poisson,materials.steel.nu);
  }
  const aluminumBeam=registry.beam.compute(defaults('beam'));
  const steelBeam=registry.beam.compute(registry.beam.syncPreset({...defaults('beam'),material:'steel'}));
  assert.notEqual(metric(aluminumBeam,'First natural frequency'),metric(steelBeam,'First natural frequency'));

  const feBe=registry['fe-be-planner'];
  const aluminumFeBe=feBe.compute(defaults('fe-be-planner'));
  const steelFeBe=feBe.compute(feBe.syncPreset({...defaults('fe-be-planner'),material:'steel'}));
  assert.notEqual(metric(aluminumFeBe,'Structural element size'),metric(steelFeBe,'Structural element size'));

  const panelTl=registry['elastic-panel-tl'];
  const aluminumTl=panelTl.compute(defaults('elastic-panel-tl'));
  const steelTl=panelTl.compute(panelTl.syncPreset({...defaults('elastic-panel-tl'),material:'steel'}));
  assert.notEqual(metric(aluminumTl,'Critical frequency'),metric(steelTl,'Critical frequency'));
});

test('panel-cavity shares plate controls and leads with a labeled modal frequency map',()=>{
  const calculator=registry['panel-cavity'],base=defaults('panel-cavity');
  assert.deepEqual(calculator.inputs.find(input=>input.key==='boundary').options.map(option=>option.value),['simply-supported','clamped','clamped-x','clamped-y']);
  const ssss=calculator.compute({...base,boundary:'simply-supported'}),cccc=calculator.compute({...base,boundary:'clamped'});
  assert.equal(ssss.presentation.primaryEvidence.type,'plot');
  assert.match(ssss.plots[0].title,/SSSS plate and rigid-cavity modal proximity/);
  assert.match(cccc.plots[0].title,/CCCC plate and rigid-cavity modal proximity/);
  assert.notEqual(ssss.plots[0].traces[0].x[0],cccc.plots[0].traces[0].x[0]);
  assert.deepEqual(ssss.plots[0].traces.map(trace=>trace.hideLine),[true,true]);
  assert.deepEqual(ssss.plots[0].traces.map(trace=>trace.showPoints),[true,true]);
  assert.match(ssss.plots[0].traces[0].pointLabels[0],/^P\(/);
  assert.match(ssss.plots[0].traces[1].pointLabels[0],/^A\(/);
  const svg=lineChartSvg(ssss.plots[0]);
  assert.match(svg,/data-chart-visible-point=/);
  assert.match(svg,/<title>P\(/);
  assert.match(svg,/<title>A\(/);
  assert.doesNotMatch(svg,/<path /);
  assert.match(cccc.assumptions.limitations.join(' '),/Rayleigh trial shapes/i);
});

test('modal density combines population screening with the structural and acoustic atlas',()=>{
  assert.equal(registry['modal-density-atlas'],undefined);
  assert.deepEqual(catalog.filter(tool=>tool.id.includes('modal-density')).map(tool=>tool.id),['modal-density']);
  const calculator=registry['modal-density'],base=defaults('modal-density');
  assert.equal(calculator.inputs.find(input=>input.key==='type').options.length,16);
  assert.deepEqual(calculator.inputs.find(input=>input.key==='band_fraction').options.map(option=>option.value),['1','3','6']);
  assert.deepEqual(calculator.inputs.find(input=>input.key==='material').options.map(option=>option.value),Object.keys(materials));
  assert.equal(base.modulus,materials.aluminum.E/1e9);
  assert.equal(base.density,materials.aluminum.rho);
  assert.equal(base.poisson,materials.aluminum.nu);
  const steel=calculator.syncPreset({...base,material:'steel'});
  assert.equal(steel.modulus,materials.steel.E/1e9);
  assert.equal(steel.density,materials.steel.rho);
  assert.equal(steel.poisson,materials.steel.nu);

  const plate=calculator.compute(base);
  assert.ok(metric(plate,'Mode count below f')>metric(plate,'Modes in selected band'));
  assert.equal(plate.presentation.primaryEvidence.type,'plot');
  assert.match(plate.plots[0].title,/Panel modal-density atlas/);
  assert.deepEqual(plate.plots[0].traceSelector,{label:'Modal densities to display',initial:'emphasis'});
  assert.equal(plate.plots[0].traces.filter(trace=>trace.emphasis).length,1);
  assert.equal(plate.plots[0].traces.length,6);
  assert.equal(plate.plots[1].traces.length,2);
  assert.equal(plate.tables[0].title,'ESA Appendix A formulation used');
  assert.match(plate.tables[0].rows[0][0],/A\.03\(a\)/);
  assert.match(calculator.references[0].title,/ESA PSS-03-204/);
  assert.match(plate.plots[1].traces[0].name,/N\(f\)/);
  assert.match(plate.plots[1].traces[1].name,/n\(f\)Δf/);
  assert.ok(plate.plots[1].traces[0].y.every((value,index,values)=>index===0||value>=values[index-1]));

  const octave=calculator.compute({...base,band_fraction:'1'}),sixth=calculator.compute({...base,band_fraction:'6'});
  assert.ok(metric(octave,'Modes in selected band')>metric(sixth,'Modes in selected band'));
  const acoustic=calculator.compute({...base,type:'acoustic-3d'}),beam=calculator.compute({...base,type:'beam-bending'});
  assert.equal(acoustic.plots[0].traces.length,3);
  assert.equal(beam.plots[0].traces.length,4);
  assert.match(acoustic.plots[0].title,/Acoustic modal-density atlas/);
  assert.match(beam.plots[0].title,/Beam and grid modal-density atlas/);
  const shell=calculator.compute({...base,type:'stiffened-cylinder'});
  assert.equal(shell.plots[0].traces.length,3);
  assert.match(shell.plots[0].title,/Cylinder and frame modal-density atlas/);
  assert.equal(shell.tables[1].rows.length,3);
  for(const option of calculator.inputs.find(input=>input.key==='type').options){
    const result=calculator.compute({...base,type:option.value});
    assert.ok(Number.isFinite(metric(result,'Modal density'))&&metric(result,'Modal density')>0,`${option.value} must return a finite positive modal density`);
  }
  assert.equal(plate.relatedConcepts[0].href,'#/tool/modal-overlap');

  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/function initialChartTraceIndices/);
  assert.match(appSource,/data-chart-trace-option/);
  const indexedSvg=lineChartSvg({...plate.plots[0],traces:[{...plate.plots[0].traces[2],sourceIndex:2}]});
  assert.match(indexedSvg,/data-legend-trace="2"/);
  assert.match(indexedSvg,/data-chart-trace="2"/);
  assert.match(appSource,/id==='modal-density-atlas'.*\/tool\/modal-density/);
  assert.match(appSource,/params\.get\('structure'\)==='beam'\?'beam-bending':'plate-bending'/);
  for(const legacy of ['E_gpa','rho','nu','thickness_mm'])assert.match(appSource,new RegExp(`'${legacy}'`));
});

test('every calculator result uses the shared card, plot, and table unit conversion',()=>{
  let convertedValues=0,convertedAxes=0,convertedColumns=0;
  for(const tool of catalog){
    const canonical=registry[tool.id].compute(defaults(tool.id)),english=displayEngineeringResult(canonical,'English');
    canonical.values.forEach((value,index)=>{
      const conversion=unitConversion(value.unit);
      if(!conversion||!Number.isFinite(Number(value.value)))return;
      convertedValues++;
      close(english.values[index].value,toDisplayNumber(value.value,value.unit,'English'),1e-10);
      assert.equal(english.values[index].unit,conversion.unit,`${tool.id} card ${value.label} has the wrong English unit`);
    });
    (canonical.plots||[]).forEach((plot,plotIndex)=>{
      const converted=english.plots[plotIndex];
      for(const dimension of ['x','y']){
        const labelKey=`${dimension}Label`,info=axisUnitInfo(plot[labelKey]);
        if(!info)continue;
        convertedAxes++;
        assert.equal(converted[labelKey],info.label,`${tool.id} plot ${plotIndex} has the wrong ${dimension}-axis unit`);
        plot.traces.forEach((trace,traceIndex)=>{
          trace[dimension].forEach((value,valueIndex)=>close(converted.traces[traceIndex][dimension][valueIndex],toDisplayNumber(value,info.unit,'English'),1e-10));
        });
      }
      plot.traces.forEach((trace,traceIndex)=>assert.equal(converted.traces[traceIndex].name,trace.displayNameByUnit?.English||trace.name,`${tool.id} plot ${plotIndex} trace name is out of sync`));
    });
    (canonical.tables||[]).forEach((table,tableIndex)=>{
      const converted=english.tables[tableIndex];
      table.columns.forEach((column,columnIndex)=>{
        const info=axisUnitInfo(column);
        if(!info)return;
        convertedColumns++;
        assert.equal(converted.columns[columnIndex],info.label,`${tool.id} table ${tableIndex} has the wrong column unit`);
        table.rows.forEach((row,rowIndex)=>assert.equal(converted.rows[rowIndex][columnIndex],toDisplayNumber(row[columnIndex],info.unit,'English')));
      });
    });
  }
  assert.ok(convertedValues>100,'expected broad result-card conversion coverage');
  assert.ok(convertedAxes>25,`expected broad plot-axis conversion coverage; found ${convertedAxes}`);
  assert.ok(convertedColumns>20,`expected broad table-column conversion coverage; found ${convertedColumns}`);
});

test('continuous number inputs do not inherit converted HTML step restrictions',()=>{
  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/field\.type==='number'\?'step="any"'/);
  assert.match(appSource,/input\.matches\('input\[type="range"\]'\).*:'any'/);
  assert.equal(toDisplayStep(0.1,'GPa','SI'),0.1);
  close(toDisplayStep(0.1,'GPa','English'),0.01450377377,1e-12);
  close(fromDisplayNumber(toDisplayNumber(68.9,'GPa','English'),'GPa','English'),68.9,1e-12);
});

test('priority gap-analysis tools expose behavior plots and separate alerts from limitations',()=>{
  for(const id of ['miles','modal-density','modal-overlap','fea-mesh','integration-drift','duration-scaling','sea-validity-confidence','clf-mechanism-library','equipment-loading','sea-response-recovery']){
    const result=registry[id].compute(defaults(id));
    assert.ok(result.plots?.length,`${id} needs a behavior plot`);
    assert.equal(result.presentation.primaryEvidence?.type,'plot',`${id} plot should be primary evidence`);
  }
  const miles=registry.miles.compute(defaults('miles'));
  assert.equal(miles.assumptions.alerts.length,0);
  assert.ok(miles.assumptions.limitations.length>=2);
  const overloaded=registry.accelerometer.compute({...defaults('accelerometer'),expected_peak:490,daq_range:2});
  assert.ok(overloaded.assumptions.alerts.length>=2);
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
  assert.equal(sections.length,64);
  assert.equal(sections.reduce((n,s)=>n+s.concepts.length,0),395);
  assert.equal(demos.length,80);
  assert.equal(caseNotes.length,67);
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

test('infinite-structure mobility atlas reproduces source plate, beam, sandwich, and shell limits',()=>{
  const E=70e9,rho=2700,nu=.33,plateThickness=.003,memberWidth=.025,memberHeight=.04;
  const state=infiniteMobilityAtlasState({
    focus:'cylindrical-shell',frequency:1000,frequencyMin:1,frequencyMax:50000,
    modulus:E,density:rho,poisson:nu,thickness:plateThickness,
    memberWidth,memberHeight,faceThickness:.0006,coreThickness:.0248,coreDensity:48,coreShearModulus:85e6,
    shellRadius:1.8,shellThickness:.004
  });
  const D=E*plateThickness**3/(12*(1-nu**2));
  close(state.thinPlateMobility,1/(8*Math.sqrt(D*rho*plateThickness)),1e-14);
  close(state.beamFreeEndMobility/state.beamCenterMobility,4,1e-12);
  const cBeam=(E*(memberWidth*memberHeight**3/12)*(2*Math.PI*1000)**2/(rho*memberWidth*memberHeight))**.25;
  close(state.beamCenterMobility,1/(2*rho*memberWidth*memberHeight*cBeam),1e-14);
  assert.ok(state.curves.beamCenter.at(-1)<state.curves.beamCenter[0]);

  const sandwichPlateLimit=infiniteMobilityAtlasState({
    focus:'sandwich-panel',frequency:1,modulus:E,density:rho,poisson:nu,
    faceThickness:.0006,coreThickness:.0248,coreDensity:48,coreShearModulus:1e20
  });
  close(sandwichPlateLimit.sandwich.mobility,1/(8*Math.sqrt(sandwichPlateLimit.sandwich.bendingStiffness*sandwichPlateLimit.sandwich.surfaceMass)),1e-9);
  const sandwichLow=infiniteMobilityAtlasState({focus:'sandwich-panel',frequency:20,coreShearModulus:85e6});
  const sandwichHigh=infiniteMobilityAtlasState({focus:'sandwich-panel',frequency:20000,coreShearModulus:85e6});
  assert.ok(sandwichHigh.sandwich.mobility>sandwichLow.sandwich.mobility);

  const cL=Math.sqrt(E/(rho*(1-nu**2))), shellRadius=1.8,shellThickness=.004;
  const ring=cL/(2*Math.PI*shellRadius), lowRatio=.77*shellThickness/shellRadius;
  const shellLow=infiniteMobilityAtlasState({focus:'cylindrical-shell',frequency:.5*lowRatio*ring,modulus:E,density:rho,poisson:nu,shellRadius,shellThickness});
  const expectedBeam=1/(4*Math.PI*shellRadius*rho*shellThickness*Math.sqrt((shellLow.frequency/ring)*cL**2/Math.sqrt(2)));
  close(shellLow.shell.mobility,expectedBeam,1e-14);
  const shellMiddle=infiniteMobilityAtlasState({focus:'cylindrical-shell',frequency:.3*ring,modulus:E,density:rho,poisson:nu,shellRadius,shellThickness});
  const expectedMiddle=.66/(2.3*cL*rho*shellThickness**2)*Math.sqrt(.3);
  close(shellMiddle.shell.mobility,expectedMiddle,1e-14);
  const shellHigh=infiniteMobilityAtlasState({focus:'cylindrical-shell',frequency:.8*ring,modulus:E,density:rho,poisson:nu,shellRadius,shellThickness});
  const shellD=E*shellThickness**3/(12*(1-nu**2));
  close(shellHigh.shell.mobility,1/(8*Math.sqrt(shellD*rho*shellThickness)),1e-14);
  close(shellLow.shell.beamEquivalentArea,2*Math.PI*shellRadius*shellThickness,1e-14);
  close(shellLow.shell.beamEquivalentSpeed,Math.sqrt((shellLow.frequency/ring)*cL**2/Math.sqrt(2)),1e-14);
  const curvedPanel=infiniteMobilityAtlasState({focus:'cylindrical-shell',frequency:.5*lowRatio*ring,modulus:E,density:rho,poisson:nu,shellRadius,shellThickness,shellClosed:false,shellArcAngleDeg:120,shellAxialLength:2.4});
  const arcLength=shellRadius*(120*Math.PI/180), stripArea=arcLength*shellThickness, stripInertia=arcLength*shellThickness**3/12;
  const stripSpeed=(E*stripInertia*(2*Math.PI*curvedPanel.frequency)**2/(rho*stripArea))**.25;
  close(curvedPanel.shell.arcLength,arcLength,1e-14);
  close(curvedPanel.shell.beamEquivalentArea,stripArea,1e-14);
  close(curvedPanel.shell.beamEquivalentSpeed,stripSpeed,1e-14);
  close(curvedPanel.shell.mobility,1/(2*rho*stripArea*stripSpeed),1e-14);
  assert.equal(curvedPanel.shell.regime,'strip-like curved panel');
  assert.equal(shellLow.shell.regime,'beam-like');
  assert.equal(shellMiddle.shell.regime,'curved-shell');
  assert.equal(shellHigh.shell.regime,'plate-like');
});

test('infinite-mobility atlas material presets synchronize and convert for English display',()=>{
  const calculator=registry['infinite-mobility-atlas'],base=defaults('infinite-mobility-atlas');
  const materialInput=calculator.inputs.find(input=>input.key==='material');
  assert.deepEqual(materialInput.options.map(option=>option.value),Object.keys(materials));
  assert.equal(base.material,'aluminum');
  assert.equal(base.modulus,materials.aluminum.E/1e9);
  assert.equal(base.density,materials.aluminum.rho);
  assert.equal(base.poisson,materials.aluminum.nu);

  const steel=calculator.syncPreset({...base,material:'steel'});
  assert.equal(steel.modulus,materials.steel.E/1e9);
  assert.equal(steel.density,materials.steel.rho);
  assert.equal(steel.poisson,materials.steel.nu);
  const aluminumResult=calculator.compute(base);
  const steelResult=calculator.compute(steel);
  assert.notEqual(metric(aluminumResult,'Flat-plate limit mobility'),metric(steelResult,'Flat-plate limit mobility'));

  close(toDisplayNumber(steel.modulus,'GPa','English'),materials.steel.E/1e9*0.1450377377,1e-12);
  close(toDisplayNumber(steel.density,'kg/m³','English'),materials.steel.rho*0.06242796058,1e-12);
  close(fromDisplayNumber(toDisplayNumber(steel.modulus,'GPa','English'),'GPa','English'),steel.modulus,1e-12);
  close(fromDisplayNumber(toDisplayNumber(steel.density,'kg/m³','English'),'kg/m³','English'),steel.density,1e-12);

  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/form\.addEventListener\('change',handleFieldEdit\)/);
  assert.match(appSource,/displayed=Number\(toDisplayNumber\(native,input\.dataset\.nativeUnit,next\)\)/);
});

test('infinite-mobility atlas guides family, material, specific geometry, then excitation',()=>{
  const calculator=registry['infinite-mobility-atlas'],base=defaults('infinite-mobility-atlas');
  const fields=calculator.inputs;
  const position=key=>fields.findIndex(field=>field.key===key);
  assert.ok(position('geometry')<position('material'));
  assert.ok(position('material')<position('shell_geometry'));
  assert.ok(position('shell_geometry')<position('frequency'));
  assert.deepEqual(fields.find(field=>field.key==='geometry').options.map(option=>option.value),['cylindrical-shell','curved-panel','beam','flat-panel','sandwich-panel']);
  assert.deepEqual(fields.find(field=>field.key==='beam_geometry').options.map(option=>option.value),['rod-axial','beam-flexural','beam-free-end']);
  assert.deepEqual(fields.find(field=>field.key==='shell_geometry').visibleWhen,{geometry:'cylindrical-shell'});
  assert.deepEqual(fields.find(field=>field.key==='beam_geometry').visibleWhen,{geometry:'beam'});
  assert.deepEqual(fields.find(field=>field.key==='curved_panel_radius').visibleWhen,{geometry:'curved-panel'});
  assert.deepEqual(fields.find(field=>field.key==='plate_thickness').visibleWhen,{geometry:'flat-panel'});
  assert.deepEqual(fields.find(field=>field.key==='core_shear_modulus').visibleWhen,{geometry:'sandwich-panel'});
  assert.equal(fields.find(field=>field.key==='frequency').group,'4. Excitation & plot');

  const axial=calculator.compute({...base,geometry:'beam',beam_geometry:'rod-axial'});
  const freeEnd=calculator.compute({...base,geometry:'beam',beam_geometry:'beam-free-end'});
  const shell=calculator.compute(base);
  const curved=calculator.compute({...base,geometry:'curved-panel',curved_panel_radius:1.8,curved_panel_arc_angle:120,curved_panel_axial_length:2.4,curved_panel_thickness:4});
  assert.match(axial.interpretation.summary,/Axial rod/);
  assert.match(freeEnd.interpretation.summary,/Semi-infinite flexural beam/);
  assert.notEqual(metric(axial,'Highlighted real mobility'),metric(freeEnd,'Highlighted real mobility'));
  assert.ok(shell.values.some(value=>value.label==='Beam-equivalent section area'));
  assert.ok(shell.values.some(value=>value.label==='Flat-plate flexural rigidity'));
  assert.equal(shell.tables[0].title,'Cylindrical-shell constituent mobility relations');
  assert.deepEqual(shell.tables[0].rows.map(row=>row[0]),['Whole-circumference closed-shell beam equivalent','Curved-shell relation','Flat-plate limit',`Selected piecewise relation (${metric(shell,'Shell regime')})`]);
  assert.deepEqual(shell.presentation.primaryEvidenceStack,[{type:'plot',index:0},{type:'schematic',index:0},{type:'table',index:0}]);
  assert.equal(shell.presentation.primaryValueCount,11);
  assert.equal(shell.schematics.length,1);
  assert.match(shell.schematics[0].svg,/Closed cylindrical shell/);
  assert.match(shell.schematics[0].svg,/circumference/);
  assert.match(shell.schematics[0].svg,/Active: plate-like/);
  assert.equal(shell.plots[0].title,'Cylindrical-shell constituent mobility response');
  const shellActiveTraces=shell.plots[0].traces.filter(trace=>/active constituent/.test(trace.name));
  assert.ok(shellActiveTraces.length>=1);
  assert.ok(shellActiveTraces.every(trace=>trace.emphasis&&trace.x.length>0&&trace.x.length===trace.y.length));
  assert.ok(shellActiveTraces.every(trace=>['#55b8ff','#ffcf66','#65d9a0'].includes(trace.color)));
  assert.ok(shell.plots[0].traces.some(trace=>/Selected point/.test(trace.name)));
  const englishShell=displayEngineeringResult(shell,'English');
  assert.match(englishShell.schematics[0].svg,/ft/);
  assert.match(englishShell.schematics[0].svg,/in/);
  assert.match(curved.interpretation.summary,/Open curved cylindrical panel/);
  assert.equal(curved.tables[0].title,'Curved-panel constituent mobility relations');
  assert.equal(curved.tables[0].rows[0][0],'Open curved-panel strip proxy');
  assert.ok(curved.values.some(value=>value.label==='Arc-strip proxy area'));
  assert.match(curved.schematics[0].svg,/Open curved panel/);
  assert.equal(curved.plots[0].title,'Curved-panel constituent mobility response');
  assert.ok(curved.plots[0].traces.some(trace=>trace.name==='Arc-strip proxy extension'));
  assert.match(curved.assumptions.limitations.join(' '),/open curved panel/i);

  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/data-visible-when/);
  assert.match(appSource,/const syncConditionalFields=/);
  assert.match(appSource,/syncConditionalFields\(\);run\(\);/);
  assert.match(appSource,/data-schematic-svg/);
});

test('ESA Appendix A modal-density formulations reproduce their published relations',()=>{
  const E=70e9,rho=2700,nu=.33,length=2.4,width=1.4,thickness=.003,frequency=1000;
  const common={E,modulus:E,rho,density:rho,nu,poisson:nu,length,width,thickness,frequency,memberWidth:.025,memberHeight:.04,totalMemberLength:12,frameCount:4,radius:1.8,bandsPerOctave:3};
  const cPlate=Math.sqrt(E/(rho*(1-nu**2)));
  const plate=modalDensityAtlasState({...common,type:'plate-bending'});
  close(plate.modalDensity,length*width*Math.sqrt(3)/(thickness*cPlate),1e-11);
  assert.equal(plate.sourceTopic,'A.03(a) Rectangular flat unstiffened panel');
  const circular=modalDensityAtlasState({...common,type:'circular-plate'});
  const irregular=modalDensityAtlasState({...common,type:'irregular-plate'});
  close(circular.modalDensity/plate.modalDensity,8/Math.PI**2,1e-11);
  close(irregular.modalDensity,plate.modalDensity,1e-11);

  const memberArea=common.memberWidth*common.memberHeight;
  const inertia=common.memberWidth*common.memberHeight**3/12;
  const radiusGyration=Math.sqrt(inertia/memberArea);
  const cLongitudinal=Math.sqrt(E/rho);
  const beam=modalDensityAtlasState({...common,type:'beam-bending'});
  close(beam.modalDensity,length/Math.sqrt(2*Math.PI*frequency*radiusGyration*cLongitudinal),1e-11);
  const major=Math.max(common.memberWidth,common.memberHeight),minor=Math.min(common.memberWidth,common.memberHeight);
  const torsionConstant=major*minor**3*(1/3-.21*minor/major*(1-minor**4/(12*major**4)));
  const polarRadius=Math.sqrt((common.memberWidth**2+common.memberHeight**2)/12);
  const shearSpeed=Math.sqrt(E/(2*(1+nu))/rho);
  const torsion=modalDensityAtlasState({...common,type:'beam-torsion'});
  close(torsion.modalDensity,2*length/shearSpeed*polarRadius*Math.sqrt(memberArea/torsionConstant),1e-11);
  const grid=modalDensityAtlasState({...common,type:'grid-bending'});
  close(grid.modalDensity,12/length*beam.modalDensity,1e-11);

  const ringFrequency=cLongitudinal/(2*Math.PI*common.radius);
  const frame=modalDensityAtlasState({...common,type:'hoop-frame'});
  const expectedFrame=(memberArea*common.radius**2/inertia)**.25*common.radius/cLongitudinal*(frequency/ringFrequency)**-.5*2*Math.PI;
  close(frame.modalDensity,expectedFrame,1e-11);

  const surfaceArea=2*Math.PI*common.radius*length,scale=surfaceArea/(thickness*cPlate);
  const low=modalDensityAtlasState({...common,type:'cylinder',frequency:.3*cPlate/(2*Math.PI*common.radius)});
  const mid=modalDensityAtlasState({...common,type:'cylinder',frequency:.6*cPlate/(2*Math.PI*common.radius)});
  close(low.modalDensity,5/Math.PI*Math.sqrt(.3)*scale,1e-11);
  close(mid.modalDensity,7.2/Math.PI*.6*scale,1e-11);
  const high=modalDensityAtlasState({...common,type:'cylinder',frequency:2*cPlate/(2*Math.PI*common.radius)});
  assert.ok(Number.isFinite(high.modalDensity)&&high.modalDensity>0);
  const highOctave=modalDensityAtlasState({...common,type:'cylinder',frequency:2*cPlate/(2*Math.PI*common.radius),bandsPerOctave:1});
  assert.notEqual(highOctave.modalDensity,high.modalDensity);
  const stiffCylinder=modalDensityAtlasState({...common,type:'stiffened-cylinder'});
  const totalStringers=modalDensityAtlasState({...common,type:'beam-bending',length:common.totalMemberLength});
  close(stiffCylinder.modalDensity,modalDensityAtlasState({...common,type:'cylinder'}).modalDensity+totalStringers.modalDensity+common.frameCount*frame.modalDensity,1e-10);
  const stiffPanel=modalDensityAtlasState({...common,type:'stiffened-panel'});
  close(stiffPanel.modalDensity,plate.modalDensity+totalStringers.modalDensity,1e-10);

  const faceThickness=.0006,coreThickness=.0248,coreShearModulus=85e6,coreDensity=48;
  const honeycomb=modalDensityAtlasState({...common,type:'honeycomb',faceThickness,coreThickness,coreShearModulus,coreDensity});
  const d=coreThickness+faceThickness,B=d**2*E*faceThickness/2,g=coreShearModulus/coreThickness*2/(E*faceThickness),m=2*rho*faceThickness+coreDensity*coreThickness,omega=2*Math.PI*frequency;
  const expectedHoneycomb=Math.PI*length*width*m/(g*B)*frequency*(1+(m*omega**2+2*g**2*B*(1-nu**2))/Math.sqrt(m**2*omega**4+4*m*omega**2*g**2*B*(1-nu**2)));
  close(honeycomb.modalDensity,expectedHoneycomb,1e-10);
  assert.equal(honeycomb.sourceTopic,'A.09 Flat honeycomb panel');
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
  const syncSource=readFileSync(new URL('../scripts/sync-standalone.mjs',import.meta.url),'utf8');
  assert.match(syncSource,/const chartsModule = await read\('js\/charts\.js'\)/);
  assert.match(syncSource,/const pcbAccelerometersModule = await read\('js\/pcb-accelerometers-data\.js'\)/);
  assert.match(syncSource,/const parkerLordIsolatorsModule = await read\('js\/parker-lord-isolators\.js'\)/);
  assert.match(syncSource,/const nastranIsolationExportModule = await read\('js\/nastran-isolation-export\.js'\)/);
  assert.match(syncSource,/const chartsBlock = `const __charts=/);
  assert.match(syncSource,/surface3dSvg/);
  assert.match(syncSource,/rangeChartSvg/);
  assert.match(html,/const __calculators=\(\(\)=>\{[\s\S]*Integrated acceleration/);
  assert.match(html,/AM-009-14/);
  assert.match(html,/function screenParkerLordCatalogAsync/);
  assert.match(html,/Parker LORD Aerospace & Defense Isolator Catalog/);
  assert.match(html,/const __pcbAccelerometers=\(\(\)=>\{[\s\S]*"model": "352C04"/);
  assert.match(html,/const __charts=\(\(\)=>\{[\s\S]*function harmonicPhase/);
  assert.match(html,/function rangeChartSvg\(chart/);
  assert.match(html,/function surface3dSvg\(surface/);
  assert.match(html,/data-chart-animation="harmonic"/);
  assert.match(html,/data-heatmap-base-value/);
  assert.doesNotMatch(html,/Total mean square/);
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
  assert.match(html,/Read the complete applied case study/);
  assert.match(html,/#\/case-studies/);
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
  assert.match(html,/id: 'infinite-structure-mobility'/);
  assert.match(html,/function infiniteMobilityAtlasState\(input = \{\}\)/);
  assert.match(html,/function infiniteMobilitySchematic\(values, state\)/);
  assert.match(html,/Closed cylindrical shell/);
  assert.match(html,/data-schematic-svg/);
  assert.match(html,/function mountInfiniteMobility\(root\)/);
  assert.match(html,/references\/In19_inf_panel\.pdf/);
  assert.match(html,/function seaParameterWorkbenchState\(input = \{\}\)/);
  assert.match(html,/function installedFairingSeaState\(input = \{\}\)/);
  assert.match(html,/function mountFairing\(root\)/);
  assert.match(html,/const __homepage=\(\(\)=>\{/);
  assert.match(html,/const __siteComponents=\(\(\)=>\{/);
  assert.match(html,/const __engineeringSystem=\(\(\)=>\{/);
  assert.match(html,/function renderBreadcrumbs\(items/);
  assert.match(html,/site-system-calculator/);
  assert.match(html,/site-system-chapter/);
  assert.match(html,/function renderHomepage\(stats = \{\}\)/);
  assert.match(html,/function bindHomepage\(root = document\)/);
  assert.match(html,/Navigate the wheel of acoustics/);
  assert.doesNotMatch(html,/Interactive generic launch-vehicle structural atlas/);
  assert.match(html,/const __launchSeaCapstone=\(\(\)=>\{/);
  assert.match(html,/const __workbenchRuntime=\(\(\)=>\{/);
  assert.match(html,/const __engineeringWorkbenches=\(\(\)=>\{/);
  assert.match(html,/const \{engineeringAnalysisIds,engineeringAnalysisRegistry,engineeringWorkbenchIds,engineeringWorkbenchRegistry\}=__engineeringWorkbenches;/);
  assert.match(html,/const __nastranIsolationExport=\(\(\)=>\{/);
  assert.match(html,/function generateNastranIsolationBdf\(configInput, analysisInput = null\)/);
  assert.match(html,/data-sorbo-action="export-nastran-bdf"/);
  assert.match(html,/return \{[^}]*screenSorbothaneCatalog,screenSorbothaneCatalogAsync[^}]*\};\n\}\)\(\);\n\nconst __nastranIsolationExport=/);
  assert.match(html,/return \{NASTRAN_IPS_UNITS,nastranExportSettings,generateNastranIsolationBdf\};\n\}\)\(\);\n\nconst __sorbothaneIsolation=/);
  assert.match(html,/const \{[^}]*screenSorbothaneCatalog,screenSorbothaneCatalogAsync[^}]*\}=__sorbothaneAnalysis;/);
  assert.match(html,/const \{generateNastranIsolationBdf\}=__nastranIsolationExport;/);
  assert.match(html,/Double-Window SEA Designer/);
  assert.match(html,/Wave Matching &amp; Radiation Canvas|Wave Matching & Radiation Canvas/);
  assert.match(html,/function solveLaunchSeaProject\(projectInput = \{\}\)/);
  assert.match(html,/function bindLaunchSeaCapstone\(root = document/);
  assert.match(html,/Launch-Vehicle SEA Capstone/);
  assert.match(html,/first\.startsWith\('concept-'\)/);
  assert.match(html,/#\/cheat-sheet\?section=\$\{encodeURIComponent\(selectedSection\.id\)\}&concept=/);
  assert.doesNotMatch(html,/href="#concept-/);
  assert.match(html,/data-scroll-target="main-content"/);
});

test('launch-vehicle SEA capstone solves a reciprocal, banded, auditable network',()=>{
  const project=defaultLaunchSeaProject();
  const solution=solveLaunchSeaProject(project);
  assert.equal(solution.bands.length,19);
  assert.equal(solution.project.subsystems.length,9);
  assert.equal(solution.project.connections.length,11);
  assert.ok(solution.maxBalanceError<1e-12);
  solution.bands.forEach(band=>{
    band.network.energies.forEach(energy=>assert.ok(Number.isFinite(energy)&&energy>=0));
    assert.ok(Math.abs(band.network.balanceError)<1e-12);
    band.network.links.forEach(link=>close(link.forward*band.network.subsystems[link.i].modalDensity,link.reverse*band.network.subsystems[link.j].modalDensity,1e-12));
  });
  const baseline=solution.selected.resultById['fairing-upper'].energy;
  project.subsystems.find(item=>item.id==='fairing-upper').lossFactor=.08;
  const damped=solveLaunchSeaProject(project).selected.resultById['fairing-upper'].energy;
  assert.ok(damped<baseline,'raising fairing DLF should reduce its stored energy');
  project.connections=[];
  project.study.localEquipmentPower=0;
  const isolated=solveLaunchSeaProject(project).selected;
  assert.equal(isolated.powerFlows.length,0);
  isolated.network.energies.slice(1).forEach(energy=>close(energy,0,1e-15));
  const html=renderLaunchSeaCapstone();
  assert.match(html,/aria-label="SEA modeling workflow"/);
  assert.match(html,/Launch vehicle SEA subsystem atlas/);
  assert.match(html,/SEA energy-flow network/);
  assert.match(html,/Engineering takeaway/);
  assert.match(html,/mode=quick/);
  const couplingHtml=renderLaunchSeaCapstone({...defaultLaunchSeaProject(),activeStep:'coupling'});
  assert.match(couplingHtml,/data-capstone-field="conn\.from"/);
  assert.match(couplingHtml,/data-capstone-field="conn\.to"/);
});

test('engineering workbench registry upgrades ten real tools without replacing their quick screens',()=>{
  const expected=[
    'double-panel-sea',
    'qualification-test-planner',
    'time-psd',
    'noise-control-path',
    'model-test-correlation',
    'hybrid-method-selection',
    'launch-acoustic-source',
    'wet-tank-dynamics',
    'mission-environment-timeline',
    'wave-matching-atlas'
  ];
  assert.deepEqual(engineeringWorkbenchIds,expected);
  assert.equal(new Set(engineeringWorkbenchIds).size,10);
  const toolIds=new Set(catalog.map(tool=>tool.id));
  for(const definition of engineeringWorkbenchDefinitions){
    assert.ok(toolIds.has(definition.id),`${definition.id} must retain an existing tool route`);
    assert.ok(definition.steps.length>=6,`${definition.id} must be a complete guided workflow`);
    for(const step of definition.steps)assert.ok(registry[step.toolId],`${definition.id} step ${step.id} references missing calculator ${step.toolId}`);
    const entry=engineeringWorkbenchRegistry[definition.id];
    assert.equal(typeof entry.render,'function');
    assert.equal(typeof entry.bind,'function');
    const html=entry.render();
    assert.match(html,new RegExp(`data-workbench-id="${definition.id}"`));
    assert.match(html,/Engineering workflow/);
    assert.match(html,/Input inspector/);
    assert.match(html,/Live engineering evidence/);
    assert.match(html,/Engineering takeaway/);
    assert.match(html,new RegExp(`\/tool\/${definition.id}\\?mode=quick`));
    assert.doesNotMatch(html,/\bundefined\b/);
  }
  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/\.\.\.engineeringWorkbenchRegistry/);
  assert.match(appSource,/workbenchRegistry\[id\].*mode.*quick/);
  assert.match(appSource,/site-system-workbench/);
});

test('shared engineering-tool runtime exposes decision-centered wet-tank, modal-density, and infinite-mobility analyses',()=>{
  const wet=engineeringWorkbenchRegistry['wet-tank-dynamics'];
  const wetHtml=wet.render();
  assert.match(wetHtml,/engineering-decision-hero/);
  assert.match(wetHtml,/Are the wet-shell and liquid-acoustic families separated enough/);
  assert.match(wetHtml,/Wet-shell \/ liquid-acoustic ratio/);
  assert.match(wetHtml,/engineering-decision-card is-review/);
  assert.match(wetHtml,/data-wb-unit-system/);
  assert.match(wetHtml,/Sources & validity/);

  assert.deepEqual(engineeringAnalysisIds,['modal-density','infinite-mobility-atlas']);
  assert.equal(engineeringAnalysisDefinitions[0].profile,'analysis');
  const definition=engineeringAnalysisDefinitions[0],entry=engineeringAnalysisRegistry['modal-density'];
  const html=entry.render();
  assert.match(html,/data-engineering-profile="analysis"/);
  assert.match(html,/Is the selected band populated enough for a statistical modal treatment/);
  assert.match(html,/Selected subsystem and resonance crowding/);
  assert.match(html,/data-wb-trace-selector="modal-density:0"/);
  assert.match(html,/Show all/);
  assert.match(html,/Current only/);
  assert.match(html,/ESA PSS-03-204/);
  assert.match(html,/\/tool\/modal-density\?mode=quick/);
  assert.doesNotMatch(html,/Engineering workflow/);
  assert.doesNotMatch(html,/\bundefined\b/);
  const traceInputs=[...html.matchAll(/data-wb-trace-option="\d+"([^>]*)/g)];
  assert.ok(traceInputs.length>1);
  assert.equal(traceInputs.filter(match=>match[1].includes('checked')).length,1,'the current modal-density curve starts selected by itself');

  const state=createEngineeringToolProject(definition,registry);
  assert.equal(state.schema,'sau-engineering-tool');
  assert.equal(state.profile,'analysis');
  assert.equal(state.toolId,'modal-density');
  state.unitSystem='English';
  state.selections.traces={'modal-density':{0:[0,1]}};
  const normalized=normalizeEngineeringToolProject(definition,registry,state);
  assert.deepEqual(normalized.selections.traces['modal-density'][0],[0,1]);
  const englishHtml=entry.render(normalized);
  assert.match(englishHtml,/Cylinder radius<small>ft<\/small>/);
  assert.match(englishHtml,/Thickness<small>in<\/small>/);
  assert.equal([...englishHtml.matchAll(/data-wb-trace-option="\d+"([^>]*)/g)].filter(match=>match[1].includes('checked')).length,2);
  const legacyState={...state,schema:'sau-engineering-workbench',toolId:undefined,workbenchId:'modal-density'};
  const migrated=normalizeEngineeringToolProject(definition,registry,legacyState);
  assert.equal(migrated.schema,'sau-engineering-tool');
  assert.equal(migrated.toolId,'modal-density');
  assert.throws(()=>normalizeEngineeringToolProject(definition,registry,{schema:'sau-engineering-tool',version:1,toolId:'wet-tank-dynamics'}),/cannot be imported/);

  const mobilityDefinition=engineeringAnalysisDefinitions.find(item=>item.id==='infinite-mobility-atlas');
  const mobilityEntry=engineeringAnalysisRegistry['infinite-mobility-atlas'];
  assert.equal(mobilityDefinition.profile,'analysis');
  assert.equal(mobilityDefinition.evidenceFirst,true);
  assert.equal(mobilityDefinition.physicalAfterPrimaryPlot,true);
  assert.ok(mobilityDefinition.sources.length>=3);
  const mobilityHtml=mobilityEntry.render();
  assert.match(mobilityHtml,/Which characteristic constituent governs the mean drive-point mobility at this frequency/);
  assert.match(mobilityHtml,/Cylindrical-shell constituent mobility response/);
  assert.match(mobilityHtml,/Closed cylindrical shell/);
  assert.match(mobilityHtml,/Hambric/);
  assert.match(mobilityHtml,/data-wb-trace-selector="infinite-mobility-atlas:0"/);
  assert.match(mobilityHtml,/\/tool\/infinite-mobility-atlas\?mode=quick/);
  assert.ok(mobilityHtml.indexOf('Cylindrical-shell constituent mobility response')<mobilityHtml.indexOf('Closed cylindrical shell'),'the response evidence is shown before the geometry view');
  assert.ok(mobilityHtml.indexOf('Closed cylindrical shell')<mobilityHtml.indexOf('Selected shell mobility'),'the geometry view is shown before numerical summary cards');
  assert.match(mobilityHtml,/Mean shell radius/);
  assert.doesNotMatch(mobilityHtml,/Radius of curvature/);
  const mobilityState=createEngineeringToolProject(mobilityDefinition,registry);
  mobilityState.inputs['infinite-mobility-atlas'].geometry='curved-panel';
  mobilityState.inputs['infinite-mobility-atlas'].curved_panel_arc_angle=120;
  const curvedState=normalizeEngineeringToolProject(mobilityDefinition,registry,mobilityState);
  const curvedHtml=mobilityEntry.render(curvedState);
  assert.match(curvedHtml,/Open curved cylindrical panel/);
  assert.match(curvedHtml,/Radius of curvature/);
  assert.doesNotMatch(curvedHtml,/Mean shell radius/);
  assert.match(curvedHtml,/engineering-decision-card is-review/);
  assert.match(curvedHtml,/Open curved panel uses an arc-width strip proxy/);
  curvedState.unitSystem='English';
  const curvedEnglishHtml=mobilityEntry.render(curvedState);
  assert.match(curvedEnglishHtml,/Radius of curvature<small>ft<\/small>/);
  assert.match(curvedEnglishHtml,/Panel-wall thickness<small>in<\/small>/);
  assert.throws(()=>normalizeEngineeringToolProject(mobilityDefinition,registry,{schema:'sau-engineering-tool',version:1,toolId:'modal-density'}),/cannot be imported/);

  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(appSource,/\.\.\.engineeringAnalysisRegistry/);
  const runtimeSource=readFileSync(new URL('../js/workbench-runtime.js',import.meta.url),'utf8');
  assert.match(runtimeSource,/function fieldVisible\(context, field\)/);
  assert.match(runtimeSource,/definition\.evidenceFirst/);
  assert.match(runtimeSource,/definition\.physicalAfterPrimaryPlot/);
});

test('site visual system exposes reusable components and themes every non-home route',()=>{
  const expected=['page-shell','section-header','concept-card','tool-card','equation-panel','engineering-note','warning-callout','assumption-callout','breadcrumbs','related-concept-links','hardware-topic-links','demo-container','chart-container','calculator-container'];
  assert.deepEqual(siteComponentInventory,expected);
  assert.match(renderPageShell('content',{variant:'chapter-proof'}),/site-page-shell-chapter-proof/);
  assert.match(renderBreadcrumbs([{label:'Tools',href:'#/tools'},{label:'Result'}]),/aria-current="page"/);
  assert.match(renderSectionHeader({number:'15',eyebrow:'Shells',title:'Modes',summary:'Summary'}),/site-section-header/);
  assert.match(renderCallout({tone:'warning',label:'Check',body:'Boundary'}),/site-callout-warning/);
  assert.match(renderLinkCollection({label:'Hardware',variant:'hardware',items:[{title:'Fairing',href:'#/cheat-sheet?section=payload-fairing-cavities'}]}),/site-hardware-links/);
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  const unitSource=readFileSync(new URL('../js/unit-system.js',import.meta.url),'utf8');
  assert.match(css,/--site-color-canvas-deep:/);
  assert.match(css,/--site-space-8:/);
  assert.match(css,/--site-type-display:/);
  assert.match(css,/body\.site-system-route \.site-calculator-container/);
  assert.match(css,/body\.site-system-route \.site-concept-card/);
  assert.match(css,/body\.site-system-route \.site-demo-card/);
  assert.match(css,/body\.site-system-route \.site-case-card/);
  assert.match(css,/body\.site-system-route \.reference-nav/);
  assert.match(appSource,/classList\.toggle\('site-system-route',Boolean\(first\)\)/);
  assert.match(appSource,/classList\.toggle\('home-route',!first\)/);
  assert.match(appSource,/calculator-context-grid/);
  assert.match(appSource,/page\.replace\(context,''\).*\$\{context\}/);
  assert.match(unitSource,/const ENGLISH_UNIT_CONVERSIONS/);
  assert.match(unitSource,/function displayEngineeringResult/);
  assert.doesNotMatch(appSource,/const conceptCard=/);
  assert.match(appSource,/commentary-card commentary-card-wide/);
  assert.match(appSource,/data-field-unit=/);
  assert.match(appSource,/syncUnitSystem/);
  assert.match(appSource,/unitSystem\?\.addEventListener\('input',syncUnitSystem\)/);
  assert.match(appSource,/function renderInputFields/);
  assert.match(appSource,/function bindSearchableSelects/);
  assert.match(appSource,/data-select-search=/);
  assert.match(css,/\.commentary-card-wide \{ grid-column: 1 \/ -1; \}/);
  assert.match(css,/\.select-search-filter \{/);
  assert.match(css,/\.result-range-chart-grid \{[^}]*grid-template-columns: 1fr;/);
  assert.doesNotMatch(appSource,/No automatic warning/i);
  assert.match(appSource,/const resultBody=hasVisualPrimary/);
  assert.doesNotMatch(appSource,/add-result-to-project|Add this result to the engineering project|Preserve inputs, values, interpretation/);
  assert.doesNotMatch(css,/\.result-project-actions/);
  assert.match(appSource,/const evidenceStack=explicitEvidenceStack/);
  assert.match(appSource,/data-result-section="plot"/);
  assert.match(appSource,/data-result-section="numerical"/);
  assert.match(appSource,/data-result-section="explanation"/);
  assert.doesNotMatch(appSource,/Recommended handoffs/);
  assert.doesNotMatch(css,/\.result-handoffs/);
});

test('wheel homepage is data-driven, accessible, and linked to real content',()=>{
  const appSource=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  const allSections=[...baseSections,...acs519Sections,...workflowExpansionSections,...programExpansionSections,...seaParameterSections];
  const allTools=[...toolCatalog,...extraToolCatalog,...acs519ToolCatalog,...workflowExpansionToolCatalog,...programExpansionToolCatalog,...seaParameterToolCatalog];
  const allDemos=[...baseDemos,...acs519Demos,...workflowExpansionDemos,...programExpansionDemos,...seaParameterDemos];
  const allCaseStudies=[...baseCaseNotes,...acs519CaseNotes,...workflowExpansionCaseNotes,...programExpansionCaseNotes,...seaParameterCaseNotes];
  const sectionIds=new Set(allSections.map(section=>section.id));
  const toolIds=new Set(allTools.map(tool=>tool.id));
  const demoIds=new Set(allDemos.map(demo=>demo.id));
  const caseStudyIds=new Set(allCaseStudies.map(study=>study.id));
  const routeItems=[...homepageNavigation,...featuredItems];
  const verifyRoute=href=>{
    const tool=href.match(/^#\/tool\/([^?]+)/)?.[1];
    const demo=href.match(/^#\/demo\/([^?]+)/)?.[1];
    const section=href.match(/[?&]section=([^&]+)/)?.[1];
    if(tool)assert.ok(toolIds.has(tool),`homepage tool route ${tool} is missing`);
    if(demo)assert.ok(demoIds.has(demo),`homepage demo route ${demo} is missing`);
    if(section)assert.ok(sectionIds.has(section),`homepage section route ${section} is missing`);
    assert.match(href,/^#\//,`homepage route ${href} must use the SPA router`);
  };
  assert.deepEqual(homepageNavigation.map(item=>item.id),['subjects','demos','tools','cases']);
  assert.equal(featuredItems.length,6);
  assert.equal(subjectWheel.length,10);
  assert.deepEqual(subjectWheel.map(subject=>subject.id).filter(id=>['random-vibration','shock','fatigue'].includes(id)),['random-vibration','shock','fatigue']);
  const assignedChapters=subjectWheel.flatMap(subject=>subject.chapterIds);
  assert.equal(new Set(assignedChapters).size,assignedChapters.length,'each chapter must belong to exactly one wheel subject');
  assert.deepEqual([...assignedChapters].sort(),[...sectionIds].sort(),'the wheel must cover every chapter');
  for(const subject of subjectWheel){
    assert.ok(subject.chapterIds.length>0,`${subject.id} needs at least one chapter`);
    assert.ok(subject.demoIds.length>=3,`${subject.id} needs at least three interactive labs`);
    subject.demoIds.forEach(id=>assert.ok(demoIds.has(id),`${subject.id} references missing demo ${id}`));
    assert.ok(subject.toolIds.length>=5,`${subject.id} needs at least five selected tools`);
    subject.toolIds.forEach(id=>assert.ok(toolIds.has(id),`${subject.id} references missing tool ${id}`));
    assert.ok(subject.caseStudyIds.length>=3,`${subject.id} needs at least three applied case studies`);
    subject.caseStudyIds.forEach(id=>assert.ok(caseStudyIds.has(id),`${subject.id} references missing case study ${id}`));
    const subjectHtml=renderSubjectPage(subject.id,{sections:allSections,tools:allTools,demos:allDemos,caseStudies:allCaseStudies});
    assert.match(subjectHtml,new RegExp(`class="subject-page" style="--subject-color:${subject.accent}"`));
    assert.match(subjectHtml,/Physical intuition/);
    assert.match(subjectHtml,/Learning route/);
    assert.match(subjectHtml,/Interactive behavior/);
    assert.match(subjectHtml,/Engineering models/);
    assert.match(subjectHtml,/Applied engineering/);
    assert.match(subjectHtml,/Case studies/);
    assert.doesNotMatch(subjectHtml,/Hardware application/);
    assert.doesNotMatch(subjectHtml,/Guided workflows/);
    assert.doesNotMatch(subjectHtml,/\bundefined\b/);
  }
  assert.deepEqual([...new Set(subjectWheel.flatMap(subject=>subject.caseStudyIds))].sort(),[...caseStudyIds].sort(),'subject guides must expose every case study');
  routeItems.forEach(item=>verifyRoute(item.href));
  assert.equal(homepageNavKey('tool'),'tools');
  assert.equal(homepageNavKey('demos'),'demos');
  assert.equal(homepageNavKey('case-studies'),'cases');
  assert.equal(homepageNavKey('hardware'),'utilities');
  assert.equal(homepageNavKey('pathways'),'utilities');
  assert.equal(homepageNavKey('cheat-sheet','shell-acoustics-deep-dive'),'subjects');
  const html=renderHomepage({sections:allSections,tools:allTools,demos:allDemos,caseStudies:allCaseStudies});
  assert.match(html,/Navigate the wheel of acoustics/);
  assert.match(html,/data-subject-select="random-vibration"/);
  assert.match(html,/data-subject-select="shock"/);
  assert.match(html,/data-subject-select="fatigue"/);
  assert.match(html,/data-subject-detail="measurement-test"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/#\/demos/);
  assert.match(html,/#\/tools/);
  assert.match(html,/#\/case-studies/);
  assert.match(html,/114 tools/);
  assert.match(html,/67 case studies/);
  assert.doesNotMatch(html,/#\/hardware/);
  assert.doesNotMatch(html,/Guided workflows/);
  assert.match(appSource,/data-tools-menu/);
  assert.match(appSource,/tools\.slice\(0,3\)/);
  assert.match(appSource,/#\/tools\?subject=/);
  assert.match(appSource,/data-tool-filter="subject"/);
  assert.match(appSource,/first==='subject'.*renderSubjectPage/);
  assert.match(appSource,/first==='case-studies'.*renderCaseStudies/);
  assert.match(appSource,/function legacyRouteTarget/);
  assert.match(appSource,/first\.startsWith\('concept-'\)/);
  assert.match(appSource,/first\.startsWith\('section-'\)/);
  assert.match(appSource,/first\.startsWith\('reference-'\)/);
  assert.doesNotMatch(appSource,/href="#concept-/);
  assert.match(appSource,/#\/references\?anchor=reference-method/);
  assert.match(renderSubjectPage('acoustics',{sections:allSections,tools:allTools,demos:allDemos,caseStudies:allCaseStudies}),/#\/subject\/acoustics\?anchor=subject-learning/);
  assert.match(renderSubjectPage('dynamics',{sections:allSections,tools:allTools,demos:allDemos,caseStudies:allCaseStudies}),/#\/tool\/sorbothane-isolation/);
  assert.doesNotMatch(appSource,/function renderHardware/);
  assert.doesNotMatch(appSource,/function renderPathways/);
  assert.match(appSource,/site-system-subject/);
  assert.match(appSource,/type:'Subject'.*#\/subject\//);
  assert.match(appSource,/type:'Case study'.*#\/case-study\//);
  assert.match(renderSubjectPage('missing-subject'),/That subject is not on the wheel/);
});

test('offline cache includes current interactive runtimes',()=>{
  const worker=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
  assert.match(worker,/const CACHE = 'sau-v103'/);
  assert.match(worker,/event\.request\.destination === 'document'/);
  assert.doesNotMatch(worker,/launch-vehicle-cutaway/);
  assert.match(worker,/\.\/js\/homepage\.js/);
  assert.match(worker,/\.\/js\/unit-system\.js/);
  assert.match(worker,/\.\/js\/site-components\.js/);
  assert.match(worker,/\.\/js\/engineering-system\.js/);
  assert.match(worker,/\.\/js\/pcb-accelerometers-data\.js/);
  assert.match(worker,/\.\/js\/demo-takeaways\.js/);
  assert.match(worker,/\.\/js\/sorbothane-data\.js/);
  assert.match(worker,/\.\/js\/parker-lord-isolators\.js/);
  assert.match(worker,/\.\/js\/sorbothane-analysis\.js/);
  assert.match(worker,/\.\/js\/nastran-isolation-export\.js/);
  assert.match(worker,/\.\/js\/sorbothane-isolation\.js/);
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
  assert.match(worker,/\.\/js\/launch-sea-capstone\.js/);
  assert.match(worker,/\.\/js\/workbench-runtime\.js/);
  assert.match(worker,/\.\/js\/engineering-workbenches\.js/);
});

test('engineering system connects hardware, pathways, tool discovery, projects, and live verification',()=>{
  const toolIds=new Set(catalog.map(tool=>tool.id));
  const sectionIds=new Set(sections.map(section=>section.id));
  assert.equal(hardwareTopics.length,7);
  assert.equal(learningPathways.length,6);
  assert.ok(materialLibrary.length>=6);
  assert.ok(environmentLibrary.length>=5);
  assert.ok(projectTemplates.length>=5);
  assert.equal(new Set(hardwareTopics.map(topic=>topic.id)).size,hardwareTopics.length);
  assert.equal(new Set(learningPathways.map(pathway=>pathway.id)).size,learningPathways.length);
  for(const topic of hardwareTopics){
    assert.ok(topic.sources.length>=4&&topic.paths.length>=4&&topic.responses.length>=4,`${topic.id} needs a complete source-path-response map`);
    for(const model of topic.models){
      const tool=model.href.match(/^#\/tool\/([^?]+)/)?.[1];
      assert.ok(toolIds.has(tool),`${topic.id} references missing tool ${tool}`);
    }
    for(const chapter of topic.chapters)assert.ok(sectionIds.has(chapter),`${topic.id} references missing chapter ${chapter}`);
  }
  for(const pathway of learningPathways){
    assert.ok(pathway.steps.length>=5,`${pathway.id} needs a complete guided sequence`);
    pathway.steps.forEach(step=>assert.match(step.href,/^#\//));
  }
  for(const tool of catalog){
    const profile=classifyTool(tool,engineeringWorkbenchIds,engineeringAnalysisIds);
    assert.ok(profile.level&&profile.task&&profile.hardware&&profile.input,`${tool.id} has an incomplete discovery profile`);
    assert.ok(toolHandoffs(tool,catalog).length>0,`${tool.id} has no engineering handoff`);
  }
  const mobilityProfile=classifyTool(catalog.find(tool=>tool.id==='infinite-mobility-atlas'),engineeringWorkbenchIds,engineeringAnalysisIds);
  assert.equal(mobilityProfile.level,'Interactive analysis');
  assert.equal(mobilityProfile.analysis,true);
  assert.equal(mobilityProfile.workbench,false);
  const benchmarkResults=runValidationBenchmarks(registry);
  assert.equal(benchmarkResults.length,5);
  assert.deepEqual(benchmarkResults.filter(result=>!result.pass).map(result=>result.id),[]);
  const project=createEngineeringProject('fairing-ascent');
  project.artifacts.push({id:'result-1',type:'Calculator result',title:'Panel response',route:'#/tool/sdof',createdAt:new Date(0).toISOString(),takeaway:'Response is resonance controlled.',validity:'Linear SDOF screen.',assumptions:['Linear response'],warnings:[],values:[{label:'Response',value:2,unit:'g'}],notes:'',provenance:'Unit test'});
  const normalized=normalizeEngineeringProject(project);
  assert.equal(normalized.artifacts.length,1);
  const report=engineeringProjectReport(normalized);
  assert.match(report,/ENGINEERING RECORDS/);
  assert.match(report,/Response is resonance controlled/);
  assert.match(report,/MODEL-USE STATEMENT/);
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
