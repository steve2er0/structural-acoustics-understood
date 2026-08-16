import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(path.join(projectRoot, file), 'utf8');

function replaceRange(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not find standalone markers: ${startMarker} … ${endMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let standalone = await read('standalone.html');
const styles = await read('styles.css');
const app = await read('js/app.js');
const unitSystemModule = await read('js/unit-system.js');
const frameworkModule = await read('js/engineering-results.js');
const dataModule = await read('js/data.js');
const pcbAccelerometersModule = await read('js/pcb-accelerometers-data.js');
const sorbothaneDataModule = await read('js/sorbothane-data.js');
const sorbothaneAnalysisModule = await read('js/sorbothane-analysis.js');
const sorbothaneIsolationModule = await read('js/sorbothane-isolation.js');
const calculatorsModule = await read('js/calculators.js');
const seaCouplingModule = await read('js/sea-coupling.js');
const honeycombModule = await read('js/honeycomb-paper.js');
const extraCalculatorsModule = await read('js/extra-calculators.js');
const extraDataModule = await read('js/extra-data.js');
const chartsModule = await read('js/charts.js');
const acs519DataModule = await read('js/acs519-data.js');
const acs519PhysicsModule = await read('js/acs519-physics.js');
const acs519CalculatorsModule = await read('js/acs519-calculators.js');
const acs519DemosModule = await read('js/acs519-demos.js');
const workflowExpansionDataModule = await read('js/workflow-expansion-data.js');
const workflowExpansionPhysicsModule = await read('js/workflow-expansion-physics.js');
const workflowExpansionCalculatorsModule = await read('js/workflow-expansion-calculators.js');
const workflowExpansionDemosModule = await read('js/workflow-expansion-demos.js');
const programExpansionDataModule = await read('js/program-expansion-data.js');
const programExpansionPhysicsModule = await read('js/program-expansion-physics.js');
const programExpansionCalculatorsModule = await read('js/program-expansion-calculators.js');
const programExpansionDemosModule = await read('js/program-expansion-demos.js');
const seaParameterDataModule = await read('js/sea-parameters-data.js');
const seaParameterPhysicsModule = await read('js/sea-parameters-physics.js');
const seaParameterCalculatorsModule = await read('js/sea-parameters-calculators.js');
const seaParameterDemosModule = await read('js/sea-parameters-demos.js');
const launchSeaCapstoneModule = await read('js/launch-sea-capstone.js');
const workbenchRuntimeModule = await read('js/workbench-runtime.js');
const engineeringWorkbenchesModule = await read('js/engineering-workbenches.js');
const demoTakeawaysModule = await read('js/demo-takeaways.js');
const demosModule = await read('js/demos.js');
const homepageModule = await read('js/homepage.js');
const siteComponentsModule = await read('js/site-components.js');
const engineeringSystemModule = await read('js/engineering-system.js');

standalone = standalone
  .replace(/<meta name="theme-color" content="[^"]*" \/>/, '<meta name="theme-color" content="#04101f" />')
  .replace(/<meta name="color-scheme" content="[^"]*" \/>/, '<meta name="color-scheme" content="dark light" />');
if (!standalone.includes('name="color-scheme"')) {
  standalone = standalone.replace(
    '<meta name="theme-color" content="#04101f" />',
    '<meta name="theme-color" content="#04101f" />\n<meta name="color-scheme" content="dark light" />'
  );
}

standalone = replaceRange(standalone, '<style>\n', '</style>', `<style>\n${styles}`);
standalone = standalone.replace(/(?:<\/style>)+/, '</style>');

const stripImports = source => source.replace(/^import\s+[\s\S]*?;\s*/gm, '');
const stripExports = source => source.replace(/^export /gm, '');
const moduleSource = source => stripExports(stripImports(source));

const dataBlock = 'const __data=(()=>{\n'+moduleSource(dataModule)+'\nreturn {sections,toolCatalog,demos,caseNotes,referenceGroups,glossary};\n})();\n\n'
  + 'const __acs519Data=(()=>{\n'+moduleSource(acs519DataModule)+'\nreturn {acs519Sections,acs519ToolCatalog,acs519Demos,acs519CaseNotes,acs519ReferenceGroups};\n})();\n\n';
const pcbAccelerometersBlock = 'const __pcbAccelerometers=(()=>{\n'+moduleSource(pcbAccelerometersModule)+'\nreturn {PCB_ACCELEROMETER_CATALOG_META,pcbAccelerometers,pcbAccelerometerByModel,pcbAccelerometerOptions};\n})();\n\n';
const sorbothaneDataBlock = 'const __sorbothaneData=(()=>{\n'+moduleSource(sorbothaneDataModule)+'\nreturn {SORBOTHANE_DATA_VERSION,SORBOTHANE_REFERENCES,SORBOTHANE_MATERIAL,SORBOTHANE_CATALOG,sorbothaneCatalogItem};\n})();\n\n';
const sorbothaneAnalysisExports = [
  'DEFAULT_SORBOTHANE_CONFIG', 'normalizeSorbothaneConfig', 'sorbothaneDynamicProperties',
  'isolatorGeometry', 'staticPreloadState', 'rigidBodyMassMatrix', 'mountDynamicStiffness',
  'assembleRigidBodyStiffness', 'solveRigidBodyModes', 'rigidBodyResponseAtFrequency',
  'frequencyResponse', 'uncertaintyEnvelope', 'analyzeSorbothaneIsolation', 'runDesignGrid',
  'screenSorbothaneCatalog', 'screenSorbothaneCatalogAsync',
  'SORBOTHANE_UNITS', 'SORBOTHANE_CATALOG'
];
const sorbothaneAnalysisImports = sorbothaneAnalysisExports.filter(name => name !== 'SORBOTHANE_CATALOG');
const sorbothaneAnalysisBlock = `const __sorbothaneAnalysis=(()=>{\nconst {SORBOTHANE_CATALOG,SORBOTHANE_MATERIAL,sorbothaneCatalogItem}=__sorbothaneData;\n${moduleSource(sorbothaneAnalysisModule)}\nreturn {${sorbothaneAnalysisExports.join(',')}};\n})();\n\n`;
const sorbothaneIsolationBlock = `const __sorbothaneIsolation=(()=>{\nconst {SORBOTHANE_CATALOG,SORBOTHANE_DATA_VERSION,SORBOTHANE_MATERIAL,SORBOTHANE_REFERENCES,sorbothaneCatalogItem}=__sorbothaneData;\nconst {${sorbothaneAnalysisImports.join(',')}}=__sorbothaneAnalysis;\n${moduleSource(sorbothaneIsolationModule)}\nreturn {renderSorbothaneIsolationWorkbench,bindSorbothaneIsolationWorkbench,sorbothaneIsolationCalculator,sorbothaneIsolationWorkbench};\n})();\n\n`;
const workflowExpansionDataBlock = 'const __workflowExpansionData=(()=>{\n'+moduleSource(workflowExpansionDataModule)+'\nreturn {workflowExpansionSections,workflowExpansionToolCatalog,workflowExpansionDemos,workflowExpansionCaseNotes,workflowExpansionReferenceGroups};\n})();\n\n';
const programExpansionDataBlock = 'const __programExpansionData=(()=>{\n'+moduleSource(programExpansionDataModule)+'\nreturn {programExpansionSections,programExpansionToolCatalog,programExpansionDemos,programExpansionCaseNotes,programExpansionReferenceGroups};\n})();\n\n';
const seaParameterDataBlock = 'const __seaParameterData=(()=>{\n'+moduleSource(seaParameterDataModule)+'\nreturn {seaParameterSections,seaParameterToolCatalog,seaParameterDemos,seaParameterCaseNotes,seaParameterReferenceGroups};\n})();\n\n';
standalone = replaceRange(standalone, 'const __data=(()=>{', 'const __calculators=(()=>{', dataBlock + workflowExpansionDataBlock + programExpansionDataBlock + seaParameterDataBlock + pcbAccelerometersBlock + sorbothaneDataBlock + sorbothaneAnalysisBlock + sorbothaneIsolationBlock);

const calculatorsSource = moduleSource(calculatorsModule).replace(
  'const calculatorRegistry = createEngineeringRegistry(calculatorDefinitions);',
  'const calculatorRegistry = calculatorDefinitions;'
);
const calculatorsBlock = `const __calculators=(()=>{\nconst {PCB_ACCELEROMETER_CATALOG_META,pcbAccelerometers,pcbAccelerometerByModel,pcbAccelerometerOptions}=__pcbAccelerometers;\n${calculatorsSource}\nreturn {materials,plateBoundaryPresets,plateModalFrequency,calculatorRegistry,getCalculator};\n})();\n\n`;
const calculatorsEnd = standalone.includes('const __seaCoupling=(()=>{') ? 'const __seaCoupling=(()=>{' : 'const __honeycomb=(()=>{';
standalone = replaceRange(standalone, 'const __calculators=(()=>{', calculatorsEnd, calculatorsBlock);

const seaCouplingExports = [
  'reciprocalCoupling',
  'couplingPowerState',
  'twoSubsystemEnergyBalance',
  'forwardClfExperiment',
  'identifyClfExperiment',
  'histogram',
  'clfIdentificationUncertainty'
];
const seaCouplingBlock = `const __seaCoupling=(()=>{\n${moduleSource(seaCouplingModule)}\nreturn {${seaCouplingExports.join(',')}};\n})();\n\n`;
const seaCouplingStart = 'const __seaCoupling=(()=>{';
const honeycombStart = 'const __honeycomb=(()=>{';
if (standalone.includes(seaCouplingStart)) {
  standalone = replaceRange(standalone, seaCouplingStart, honeycombStart, seaCouplingBlock);
} else {
  standalone = standalone.replace(honeycombStart, seaCouplingBlock + honeycombStart);
}

const honeycombExports = [
  'HONEYCOMB_PAPER_REFERENCE',
  'HONEYCOMB_PANEL_PRESETS',
  'HONEYCOMB_MODE_DATA',
  'PAPER_LAP_TRANSMISSION',
  'honeycombPreset',
  'honeycombProperties',
  'honeycombWaveState',
  'honeycombFrequencySeries',
  'honeycombCoincidenceFrequency',
  'idealLineTransmission',
  'blockingMassTransmission',
  'pointConnectionTransmission',
  'paperLapTransmission',
  'pointCouplingLossFactor',
  'lineCouplingLossFactor',
  'junctionTransmissionState',
  'experimentalSeaInverse',
  'seaForwardEnergies',
  'inhomogeneousEnergyStudy',
  'wavenumberTransmissionStudy'
];
const honeycombBlock = `const __honeycomb=(()=>{\n${moduleSource(honeycombModule)}\nreturn {${honeycombExports.join(',')}};\n})();\n\n`;
const acs519PhysicsExports = [
  'SEA_MEDIA', 'seaNetworkState', 'doubleWindowSeaState',
  'modalRadiationState', 'besselJ1', 'struveH1', 'pistonRadiationState', 'shellAcousticsState',
  'feBePlannerState', 'panelTransmissionState', 'orthotropicPanelState', 'lossFactorBudgetState',
  'modalTestState', 'seaValidityState', 'doublePanelSeaState', 'khiePatchState', 'pipeNoiseState',
  'waveMatchingState', 'drivenRadiationState', 'soundIntensityProbeState', 'dynamicStressEnvironmentState',
  'launchAcousticSourceState', 'wetTankDynamicsState', 'qualificationTestState',
  'ACS519_DEFAULTS'
];
const acs519PhysicsBlock = `const __acs519Physics=(()=>{\n${moduleSource(acs519PhysicsModule)}\nreturn {${acs519PhysicsExports.join(',')}};\n})();\n\n`;
const acs519PhysicsImports = `const {${acs519PhysicsExports.join(',')}}=__acs519Physics;`;
let acs519CalculatorsSource = moduleSource(acs519CalculatorsModule).replace(
  'const acs519CalculatorRegistry = createEngineeringRegistry(acs519CalculatorDefinitions);',
  'const acs519CalculatorRegistry = acs519CalculatorDefinitions;'
);
const acs519CalculatorsBlock = `const __acs519Calculators=(()=>{\n${acs519PhysicsImports}\nconst {materials}=__calculators;\nconst {empiricalLossFactorState}=__seaParameterPhysics;\n${acs519CalculatorsSource}\nreturn {acs519CalculatorRegistry};\n})();\n\n`;
const acs519DemosBlock = `const __acs519Demos=(()=>{\n${acs519PhysicsImports}\n${moduleSource(acs519DemosModule)}\nreturn {acs519PreviewSvg,mountAcs519Demo,acs519SupportedDemoIds};\n})();\n\n`;
const workflowExpansionPhysicsExports = [
  'modelTestCorrelationState', 'branchingSeaState', 'transferPathState', 'requirementsFlowdownState',
  'mitigationTradeState', 'nonlinearJointState', 'fairingCavityState', 'uncertaintySensitivityState',
  'milesValidityState', 'extremeResponseState', 'WORKFLOW_DEFAULTS', 'G0'
];
const workflowExpansionPhysicsBlock = `const __workflowExpansionPhysics=(()=>{\n${moduleSource(workflowExpansionPhysicsModule)}\nreturn {${workflowExpansionPhysicsExports.join(',')}};\n})();\n\n`;
const workflowExpansionPhysicsImports = `const {${workflowExpansionPhysicsExports.join(',')}}=__workflowExpansionPhysics;`;
let workflowExpansionCalculatorsSource = moduleSource(workflowExpansionCalculatorsModule).replace(
  'const workflowExpansionCalculatorRegistry = createEngineeringRegistry(workflowExpansionCalculatorDefinitions);',
  'const workflowExpansionCalculatorRegistry = workflowExpansionCalculatorDefinitions;'
);
const workflowExpansionCalculatorsBlock = `const __workflowExpansionCalculators=(()=>{\n${workflowExpansionPhysicsImports}\n${workflowExpansionCalculatorsSource}\nreturn {workflowExpansionCalculatorRegistry};\n})();\n\n`;
const workflowExpansionDemosBlock = `const __workflowExpansionDemos=(()=>{\n${workflowExpansionPhysicsImports}\n${moduleSource(workflowExpansionDemosModule)}\nreturn {workflowExpansionPreviewSvg,mountWorkflowExpansionDemo,workflowExpansionSupportedDemoIds};\n})();\n\n`;
const programExpansionPhysicsExports = [
  'nonstationaryEnvironmentState', 'mimoTestState', 'acousticTreatmentState', 'sourceIdentificationState',
  'hybridMethodState', 'vibroacousticFatigueState', 'missionTimelineState', 'credibilityState',
  'capstoneState', 'noiseControlPathState', 'psychoacousticState', 'noiseMetricsState',
  'acousticMeasurementState', 'canonicalSourceState', 'sourceGeometryState', 'fanDuctState',
  'outdoorPropagationState', 'barrierDiffractionState', 'roomFieldState', 'enclosureDesignState',
  'absorberResonatorState', 'tunedAbsorberIsolationState', 'PROGRAM_DEFAULTS'
];
const programExpansionPhysicsBlock = `const __programExpansionPhysics=(()=>{\n${moduleSource(programExpansionPhysicsModule)}\nreturn {${programExpansionPhysicsExports.join(',')}};\n})();\n\n`;
const programExpansionPhysicsImports = `const {${programExpansionPhysicsExports.join(',')}}=__programExpansionPhysics;`;
let programExpansionCalculatorsSource = moduleSource(programExpansionCalculatorsModule).replace(
  'const programExpansionCalculatorRegistry = createEngineeringRegistry(definitions);',
  'const programExpansionCalculatorRegistry = definitions;'
);
const programExpansionCalculatorsBlock = `const __programExpansionCalculators=(()=>{\n${programExpansionPhysicsImports}\n${programExpansionCalculatorsSource}\nreturn {programExpansionCalculatorRegistry};\n})();\n\n`;
const programExpansionDemosBlock = `const __programExpansionDemos=(()=>{\n${programExpansionPhysicsImports}\n${moduleSource(programExpansionDemosModule)}\nreturn {programExpansionPreviewSvg,mountProgramExpansionDemo,programExpansionSupportedDemoIds};\n})();\n\n`;
const seaParameterPhysicsExports = [
  'SEA_PARAMETER_PRESETS', 'empiricalLossFactorState', 'modalDensityAtlasState',
  'radiationEfficiencyAtlasState', 'drivingPointImpedanceState', 'clfMechanismState',
  'tblConvectionState', 'equivalentPowerInjectionState', 'equipmentLoadingState',
  'seaResponseRecoveryState', 'installedFairingSeaState', 'seaParameterWorkbenchState'
];
const seaParameterPhysicsBlock = `const __seaParameterPhysics=(()=>{\nconst {seaNetworkState}=__acs519Physics;\n${moduleSource(seaParameterPhysicsModule)}\nreturn {${seaParameterPhysicsExports.join(',')}};\n})();\n\n`;
const launchSeaCapstoneBlock = `const __launchSeaCapstone=(()=>{\nconst {seaNetworkState}=__acs519Physics;\nconst {modalDensityAtlasState}=__seaParameterPhysics;\n${moduleSource(launchSeaCapstoneModule)}\nreturn {LAUNCH_SEA_BANDS,LAUNCH_SEA_STEPS,defaultLaunchSeaProject,solveLaunchSeaProject,renderLaunchSeaCapstone,bindLaunchSeaCapstone};\n})();\n\n`;
const seaParameterPhysicsImports = `const {${seaParameterPhysicsExports.join(',')}}=__seaParameterPhysics;`;
let seaParameterCalculatorsSource = moduleSource(seaParameterCalculatorsModule).replace(
  'const seaParameterCalculatorRegistry = createEngineeringRegistry(definitions);',
  'const seaParameterCalculatorRegistry = definitions;'
);
const seaParameterCalculatorsBlock = `const __seaParameterCalculators=(()=>{\n${seaParameterPhysicsImports}\nconst {materials}=__calculators;\n${seaParameterCalculatorsSource}\nreturn {seaParameterCalculatorRegistry};\n})();\n\n`;
const seaParameterDemosBlock = `const __seaParameterDemos=(()=>{\n${seaParameterPhysicsImports}\n${moduleSource(seaParameterDemosModule)}\nreturn {seaParameterPreviewSvg,mountSeaParameterDemo,seaParameterSupportedDemoIds};\n})();\n\n`;
const extraCalculatorsStart = 'const __extraCalculators=(()=>{';
if (standalone.includes(honeycombStart)) {
  standalone = replaceRange(standalone, honeycombStart, extraCalculatorsStart, honeycombBlock + acs519PhysicsBlock + seaParameterPhysicsBlock + launchSeaCapstoneBlock + acs519CalculatorsBlock + acs519DemosBlock + workflowExpansionPhysicsBlock + workflowExpansionCalculatorsBlock + workflowExpansionDemosBlock + programExpansionPhysicsBlock + programExpansionCalculatorsBlock + programExpansionDemosBlock + seaParameterCalculatorsBlock + seaParameterDemosBlock);
} else {
  standalone = standalone.replace(extraCalculatorsStart, honeycombBlock + acs519PhysicsBlock + seaParameterPhysicsBlock + launchSeaCapstoneBlock + acs519CalculatorsBlock + acs519DemosBlock + workflowExpansionPhysicsBlock + workflowExpansionCalculatorsBlock + workflowExpansionDemosBlock + programExpansionPhysicsBlock + programExpansionCalculatorsBlock + programExpansionDemosBlock + seaParameterCalculatorsBlock + seaParameterDemosBlock + extraCalculatorsStart);
}

const honeycombImportNames = 'const {' + honeycombExports.join(',') + '}=__honeycomb;';
const seaCouplingImportNames = 'const {' + seaCouplingExports.join(',') + '}=__seaCoupling;';
let extraCalculatorsSource = moduleSource(extraCalculatorsModule)
  .replace(
    'const extraCalculatorRegistry = createEngineeringRegistry(extraCalculatorDefinitions);',
    'const extraCalculatorRegistry = extraCalculatorDefinitions;'
  );
const extraCalculatorsBlock = `const __extraCalculators=(()=>{\n${honeycombImportNames}\n${seaCouplingImportNames}\nconst {materials,plateBoundaryPresets,plateModalFrequency}=__calculators;\n${extraCalculatorsSource}\nreturn {extraCalculatorRegistry};\n})();\n\n`;
standalone = replaceRange(standalone, extraCalculatorsStart, 'const __extraData=(()=>{', extraCalculatorsBlock);

const extraDataBlock = `const __extraData=(()=>{\n${moduleSource(extraDataModule)}\nreturn {extraToolCatalog};\n})();\n\n`;
standalone = replaceRange(standalone, 'const __extraData=(()=>{', 'const __charts=(()=>{', extraDataBlock);

const chartsBlock = `const __charts=(()=>{\n${moduleSource(chartsModule)}\nreturn {escapeHtml,formatNumber,lineChartSvg,rangeChartSvg,signedHeatColor,harmonicPhase,surface3dSvg,heatmapSvg,downloadText,downloadCsv,downloadSvg};\n})();\n\n`;
standalone = replaceRange(standalone, 'const __charts=(()=>{', 'const __demoTakeaways=(()=>{', chartsBlock);

const demoHoneycombNames = [
  'PAPER_LAP_TRANSMISSION',
  'honeycombCoincidenceFrequency',
  'honeycombFrequencySeries',
  'honeycombPreset',
  'honeycombWaveState',
  'inhomogeneousEnergyStudy',
  'junctionTransmissionState',
  'wavenumberTransmissionStudy'
];
const demoTakeawaysBlock = `const __demoTakeaways=(()=>{\n${moduleSource(demoTakeawaysModule)}\nreturn {demoTakeawayRegistry,buildDemoTakeaway,assertDemoTakeaway,assertDemoTakeawayRegistry,mountDemoTakeaway};\n})();\n\n`;
const demosBlock = `const __demosModule=(()=>{\nconst {${demoHoneycombNames.join(',')}}=__honeycomb;\nconst {twoSubsystemEnergyBalance}=__seaCoupling;\nconst {mountDemoTakeaway}=__demoTakeaways;\n${moduleSource(demosModule)}\nreturn {demoPreviewSvg,mountDemo,supportedDemoIds,spatialCoherence,jointAcceptance};\n})();\n\n`;
const demosWithAcs519Block = demosBlock.replace(
  'const {twoSubsystemEnergyBalance}=__seaCoupling;',
  'const {twoSubsystemEnergyBalance}=__seaCoupling;\nconst {acs519PreviewSvg,mountAcs519Demo,acs519SupportedDemoIds}=__acs519Demos;\nconst {workflowExpansionPreviewSvg,mountWorkflowExpansionDemo,workflowExpansionSupportedDemoIds}=__workflowExpansionDemos;\nconst {programExpansionPreviewSvg,mountProgramExpansionDemo,programExpansionSupportedDemoIds}=__programExpansionDemos;\nconst {seaParameterPreviewSvg,mountSeaParameterDemo,seaParameterSupportedDemoIds}=__seaParameterDemos;'
);
const homepageBlock = `const __homepage=(()=>{\n${moduleSource(homepageModule)}\nreturn {homepageNavigation,homepageNavKey,subjectWheel,featuredItems,renderHomepage,renderSubjectPage,bindHomepage};\n})();\n\n`;
const siteComponentsBlock = `const __siteComponents=(()=>{\n${moduleSource(siteComponentsModule)}\nreturn {renderPageShell,renderBreadcrumbs,renderSectionHeader,renderCallout,renderLinkCollection,siteComponentInventory};\n})();\n\n`;
const engineeringSystemExports = [
  'engineeringSystemSchema', 'engineeringSystemVersion', 'engineeringProjectStorageKey',
  'materialLibrary', 'environmentLibrary', 'projectTemplates', 'hardwareTopics', 'learningPathways',
  'classifyTool', 'toolHandoffs', 'handoffInputs', 'validationBenchmarks', 'runValidationBenchmarks',
  'createEngineeringProject', 'normalizeEngineeringProject', 'loadEngineeringProject',
  'saveEngineeringProject', 'addEngineeringArtifact', 'engineeringProjectReport'
];
const engineeringSystemBlock = `const __engineeringSystem=(()=>{\n${moduleSource(engineeringSystemModule)}\nreturn {${engineeringSystemExports.join(',')}};\n})();\n\n`;
const demoRuntimeStart = standalone.includes('const __demoTakeaways=(()=>{') ? 'const __demoTakeaways=(()=>{' : 'const __demosModule=(()=>{';
standalone = replaceRange(standalone, demoRuntimeStart, 'const __engineeringResults=(()=>{', demoTakeawaysBlock + demosWithAcs519Block + homepageBlock + siteComponentsBlock + engineeringSystemBlock);

const frameworkSource = frameworkModule.replace(/^export /gm, '');
const frameworkBlock = `const __engineeringResults=(()=>{\n${frameworkSource}\nreturn {buildEngineeringResult,assertEngineeringResult,createEngineeringCalculator,createEngineeringRegistry,engineeringResultToText};\n})();\n\n`;
const workbenchRuntimeBlock = `const __workbenchRuntime=(()=>{\nconst {lineChartSvg,heatmapSvg}=__charts;\n${moduleSource(workbenchRuntimeModule)}\nreturn {workbenchEsc,workbenchFmt,resultValue,renderEngineeringWorkbench,bindEngineeringWorkbench,createEngineeringWorkbenchRegistry};\n})();\n\n`;
const engineeringWorkbenchesBlock = `const __engineeringWorkbenches=(()=>{\nconst {createEngineeringRegistry}=__engineeringResults;\nconst baseCalculatorRegistry=createEngineeringRegistry(__calculators.calculatorRegistry);\nconst extraCalculatorRegistry=createEngineeringRegistry(__extraCalculators.extraCalculatorRegistry);\nconst acs519CalculatorRegistry=createEngineeringRegistry(__acs519Calculators.acs519CalculatorRegistry);\nconst workflowExpansionCalculatorRegistry=createEngineeringRegistry(__workflowExpansionCalculators.workflowExpansionCalculatorRegistry);\nconst programExpansionCalculatorRegistry=createEngineeringRegistry(__programExpansionCalculators.programExpansionCalculatorRegistry);\nconst seaParameterCalculatorRegistry=createEngineeringRegistry(__seaParameterCalculators.seaParameterCalculatorRegistry);\nconst {createEngineeringWorkbenchRegistry,resultValue,workbenchEsc,workbenchFmt}=__workbenchRuntime;\n${moduleSource(engineeringWorkbenchesModule)}\nreturn {engineeringWorkbenchDefinitions,engineeringWorkbenchRegistry,engineeringWorkbenchIds};\n})();\n\n`;
const frameworkStart = 'const __engineeringResults=(()=>{';
const legacyAppImports = 'const {sections,toolCatalog:baseToolCatalog,demos,caseNotes,referenceGroups,glossary}=__data;';
const appImports = 'const {sections:baseSections,toolCatalog:baseToolCatalog,demos:baseDemos,caseNotes:baseCaseNotes,referenceGroups:baseReferenceGroups,glossary}=__data;';
const appStartMarker = standalone.includes(appImports) ? appImports : legacyAppImports;
if (standalone.includes(frameworkStart)) {
  standalone = replaceRange(standalone, frameworkStart, appStartMarker, frameworkBlock + workbenchRuntimeBlock + engineeringWorkbenchesBlock);
} else {
  standalone = standalone.replace(appStartMarker, frameworkBlock + workbenchRuntimeBlock + engineeringWorkbenchesBlock + appStartMarker);
}

const oldRegistry = "const calculatorRegistry = { ...baseCalculatorRegistry, ...extraCalculatorRegistry, ...acs519CalculatorRegistry, ...workflowExpansionCalculatorRegistry, ...programExpansionCalculatorRegistry, ...seaParameterCalculatorRegistry, 'sorbothane-isolation': sorbothaneIsolationCalculator };";
const newRegistry = "const calculatorRegistry = createEngineeringRegistry({ ...baseCalculatorRegistry, ...extraCalculatorRegistry, ...acs519CalculatorRegistry, ...workflowExpansionCalculatorRegistry, ...programExpansionCalculatorRegistry, ...seaParameterCalculatorRegistry, 'sorbothane-isolation': sorbothaneIsolationCalculator });";
const appPrelude = [
  moduleSource(unitSystemModule),
  appImports,
  'const {acs519Sections,acs519ToolCatalog,acs519Demos,acs519CaseNotes,acs519ReferenceGroups}=__acs519Data;',
  'const {workflowExpansionSections,workflowExpansionToolCatalog,workflowExpansionDemos,workflowExpansionCaseNotes,workflowExpansionReferenceGroups}=__workflowExpansionData;',
  'const {programExpansionSections,programExpansionToolCatalog,programExpansionDemos,programExpansionCaseNotes,programExpansionReferenceGroups}=__programExpansionData;',
  'const {seaParameterSections,seaParameterToolCatalog,seaParameterDemos,seaParameterCaseNotes,seaParameterReferenceGroups}=__seaParameterData;',
  'const {calculatorRegistry:baseCalculatorRegistry}=__calculators;',
  'const {extraCalculatorRegistry}=__extraCalculators;',
  'const {acs519CalculatorRegistry}=__acs519Calculators;',
  'const {workflowExpansionCalculatorRegistry}=__workflowExpansionCalculators;',
  'const {programExpansionCalculatorRegistry}=__programExpansionCalculators;',
  'const {seaParameterCalculatorRegistry}=__seaParameterCalculators;',
  'const {extraToolCatalog}=__extraData;',
  'const {lineChartSvg,rangeChartSvg,heatmapSvg,surface3dSvg,harmonicPhase,signedHeatColor,downloadCsv,downloadSvg,downloadText}=__charts;',
  'const {demoPreviewSvg,mountDemo}=__demosModule;',
  'const {homepageNavigation,homepageNavKey,renderHomepage,renderSubjectPage,bindHomepage,subjectWheel}=__homepage;',
  'const {renderPageShell,renderBreadcrumbs,renderSectionHeader,renderCallout,renderLinkCollection}=__siteComponents;',
  `const {${engineeringSystemExports.join(',')}}=__engineeringSystem;`,
  'const {renderLaunchSeaCapstone,bindLaunchSeaCapstone}=__launchSeaCapstone;',
  'const {engineeringWorkbenchRegistry}=__engineeringWorkbenches;',
  'const {sorbothaneIsolationCalculator,sorbothaneIsolationWorkbench}=__sorbothaneIsolation;',
  'const {createEngineeringRegistry,engineeringResultToText}=__engineeringResults;'
].join('\n');
let appSource = stripImports(app).trim();
appSource = appSource.replace(oldRegistry,newRegistry);
standalone = replaceRange(standalone, appStartMarker, '</script>', appPrelude+'\n\n'+appSource+'\n');

await writeFile(path.join(projectRoot, 'standalone.html'), standalone);
