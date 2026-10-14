// Reproducible local software checks; browser observations are recorded separately.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {calculateSp8072} from '../js/sp8072-physics.js';
import {sp8072Calculator,sp8072ReportText} from '../js/sp8072-tool.js';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root));
const hash=file=>createHash('sha256').update(read(file)).digest('hex');
const write=(file,value)=>writeFileSync(new URL(file,root),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const oldBuild=JSON.parse(read('docs/sp8072/evidence/build-checks.json'));
// Historical owner hashes describe the original dirty working copy. Capture this
// checkout's starting bytes so verification also works from a fresh Git checkout.
const preserved=[...oldBuild.ownerFiles.map(p=>({file:p.file,expected:hash(p.file),basis:'Starting checkout bytes'})),...oldBuild.sourceFiles.map(p=>({file:p.file,expected:p.sha256,basis:'Imported PDF provenance'})),{file:'docs/sp8072/example-study.json',expected:oldBuild.approvedExampleSha256,basis:'Original approved example'}].map(p=>({...p,actual:hash(p.file)}));
assert.ok(preserved.every(p=>p.actual===p.expected),'Preserve imported PDFs and the original example study');
execFileSync('npm',['run','build:standalone'],{cwd:root,stdio:'pipe'});
const first=hash('standalone.html');
const testOutput=execFileSync('npm',['test'],{cwd:root,encoding:'utf8'});
write('docs/sp8072/evidence/measurement-visualization-tests.txt',testOutput);
const count=key=>Number(testOutput.match(new RegExp('^# '+key+' (\\d+)','m'))?.[1]);
assert.equal(count('fail'),0);assert.equal(count('pass'),count('tests'));assert.ok(count('tests')>=165);
execFileSync('npm',['run','build:standalone'],{cwd:root,stdio:'pipe'});
const second=hash('standalone.html');assert.equal(first,second,'Standalone rebuilds must be byte-identical');
execFileSync('git',['diff','--check'],{cwd:root,stdio:'pipe'});
for(const record of preserved){record.actual=hash(record.file);assert.equal(record.actual,record.expected,'Verification changed a preserved file: '+record.file);}
const benchmarks=JSON.parse(read('tests/fixtures/sp8072-benchmarks.json')).cases.map(c=>{
  const actual=calculateSp8072(c.inputs).overallDb,errorDb=actual-c.expected.overallDb;
  assert.ok(Math.abs(errorDb)<=c.toleranceDb);return {id:c.id,actualDb:actual,referenceDb:c.expected.overallDb,errorDb,toleranceDb:c.toleranceDb};
});
const input={fmin:40,fmax:80,band:'octave',measurementLocations:'[[-50,0,20],[25,0,20]]'},result=sp8072Calculator.compute(input);
assert.equal(result.values[0].value,127.06875418001745);
const example={schema:'sau-sp8072-evidence',version:1,units:'canonical SI',scenario:'Illustrative chemical rocket; no measured engine or pad',inputs:result.sp8072.inputs,result};
write('docs/sp8072/evidence/measurement-example-calculation.json',example);
write('docs/sp8072/evidence/measurement-example-report.txt',sp8072ReportText(result,example));
const files=['js/sp8072-tool.js','js/charts.js','styles.css','service-worker.js','standalone.html','tests/sp8072.test.mjs','tests/calculators.test.mjs','scripts/sp8072-manifest.mjs','scripts/sp8072-verify-visualization.mjs','references/sp8072-manifest.json','docs/sp8072/README.md','docs/sp8072/VALIDATION.md','docs/sp8072/CONTROLS.md',
  'docs/sp8072/evidence/measurement-visualization-checks.json','docs/sp8072/evidence/measurement-visualization-tests.txt','docs/sp8072/evidence/measurement-example-calculation.json','docs/sp8072/evidence/measurement-example-report.txt',
  ...['desktop','mobile','mobile-levels','standalone','offline','spectrum'].map(name=>`docs/sp8072/evidence/engine-measurements-${name}.jpg`)];
const artifacts=files.map(file=>{assert.ok(statSync(new URL(file,root)).isFile());return {file,sha256:hash(file)};});
write('docs/sp8072/evidence/measurement-visualization-build-checks.json',{createdUTC:new Date().toISOString(),tests:{passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled')},benchmarks,standalone:{firstSha256:first,secondSha256:second,deterministic:true},gitDiffCheck:true,preserved,exampleLevels:result.measurementLocations.map(m=>({id:m.id,position:m.position,overallDb:m.overallDb})),artifacts,limits:'Software checks and analytical benchmarks; browser evidence is separate. No measured engine/pad correlation or qualification.'});
console.log(JSON.stringify({testsPassed:count('pass'),benchmarksPassed:benchmarks.length,standaloneDeterministic:true,preservedFiles:preserved.length,artifactFiles:artifacts.length}));
