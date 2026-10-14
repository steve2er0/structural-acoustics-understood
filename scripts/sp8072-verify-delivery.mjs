// Local build/preservation evidence. No browser-delivery or measured-correlation claim.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {calculateSp8072} from '../js/sp8072-physics.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>readFileSync(new URL('../'+file,import.meta.url));
const root=new URL('../',import.meta.url);
const original=JSON.parse(read('tmp/sp8072/owner-before.json'));
const preservation=()=>Object.entries(original).filter(([file])=>file!=='standalone.html').map(([file,expectedSha256])=>({file,expectedSha256,actualSha256:sha(read(file)),unchanged:sha(read(file))===expectedSha256}));
assert.ok(preservation().every(p=>p.unchanged),'Owner flight-response changes must match their initial snapshots');
const fixtures=JSON.parse(read('tests/fixtures/sp8072-benchmarks.json'));
const numerical={schema:'sau-sp8072-numerical-checks',version:1,cases:fixtures.cases.map(c=>{
  const actualOverallDb=calculateSp8072(c.inputs).overallDb,errorDb=actualOverallDb-c.expected.overallDb;
  return {id:c.id,actualOverallDb,referenceOverallDb:c.expected.overallDb,errorDb,toleranceDb:c.toleranceDb,pass:Math.abs(errorDb)<=c.toleranceDb};
})};
assert.ok(numerical.cases.every(c=>c.pass));
writeFileSync(new URL('docs/sp8072/evidence/numerical-checks.json',root),JSON.stringify(numerical,null,2)+'\n');
const fixtureHash=sha(read('tests/fixtures/sp8072-benchmarks.json'));
execFileSync('python3',['scripts/sp8072-benchmarks.py'],{cwd:root,stdio:'pipe'});
assert.equal(sha(read('tests/fixtures/sp8072-benchmarks.json')),fixtureHash,'Independent fixture regeneration must be deterministic');
execFileSync(process.execPath,['scripts/sync-standalone.mjs'],{cwd:root,stdio:'pipe'});
const first=sha(read('standalone.html'));
execFileSync(process.execPath,['scripts/sync-standalone.mjs'],{cwd:root,stdio:'pipe'});
const second=sha(read('standalone.html'));
assert.equal(first,second,'Standalone rebuild must be deterministic');
const before=read('tmp/sp8072/standalone-before.html').toString(),after=read('standalone.html').toString();
const removeRange=(s,start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`Missing preservation marker ${start}`);return s.slice(0,a)+`[${start} approved generated range]\n`+s.slice(b);};
const mask=s=>{
  s=removeRange(s,'<style>','</style>');
  return removeRange(s,'const __engineeringResults=(()=>{','</script>');
};
assert.equal(mask(before),mask(after),'Standalone content outside intended styles and framework/workbench/app ranges must be preserved');
const flight=s=>s.match(/^const flightResponseDocument=([^\n]+)$/m)?.[1];
assert.ok(flight(before));assert.equal(flight(before),flight(after),'Owner embedded flight-response document must be preserved');
const ownerFiles=preservation();assert.ok(ownerFiles.every(p=>p.unchanged));
const exampleHash=sha(read('docs/sp8072/example-study.json'));
assert.equal(exampleHash,'3ffc6263728b4a70b96dc37c31b6711dbcc53a16ef37071249d0f87028037c5a','The specifically approved example must remain unchanged');
const log=read('tmp/sp8072/final-tests.log').toString();
const count=key=>Number(log.match(new RegExp('^# '+key+' (\\d+)','m'))?.[1]);
assert.equal(count('fail'),0);assert.equal(count('pass'),count('tests'));assert.ok(count('tests')>=162);
const gitArg=process.argv.indexOf('--git-path');
const git=gitArg>=0?process.argv[gitArg+1]:'git';
execFileSync(git,['diff','--check'],{cwd:root,stdio:'pipe'});
const sourceFiles=['references/NASA-SP-8072-19710023719.pdf','references/NASA-20140005349-Diffuser-Water-Injection.pdf'].map(file=>({file,sha256:sha(read(file))}));
const manifest=JSON.parse(read('references/sp8072-manifest.json'));
for(const source of sourceFiles)assert.equal(source.sha256,manifest.sourceFiles.find(s=>s.file===source.file)?.sha256);
const result={schema:'sau-sp8072-build-checks',version:1,createdUTC:new Date().toISOString(),
  tests:{command:'npm test',tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled'),log:'docs/sp8072/evidence/npm-test.log'},
  independentNumericalCases:{passed:numerical.cases.filter(c=>c.pass).length,total:numerical.cases.length,measuredCorrelation:false},
  fixtureRegeneration:{sha256:fixtureHash,deterministic:true},
  standalone:{firstBuildSha256:first,secondBuildSha256:second,deterministic:true,outsideIntendedRangesPreserved:true,ownerEmbeddedFlightResponsePreserved:true,browserDirectFilePassed:false},
  gitDiffCheck:{exitCode:0,passed:true},ownerFiles,sourceFiles,approvedExampleSha256:exampleHash,
  limits:'Browser blocks and unperformed modes are recorded in browser-checks.json. Static build evidence does not establish direct-file/offline delivery, measurement correlation or owner acceptance.'};
writeFileSync(new URL('docs/sp8072/evidence/build-checks.json',root),JSON.stringify(result,null,2)+'\n');
writeFileSync(new URL('docs/sp8072/evidence/npm-test.log',root),log);
console.log(JSON.stringify({testsPassed:count('pass'),benchmarksPassed:numerical.cases.length,standaloneSha256:second,ownerFilesPreserved:ownerFiles.length,diffCheckPassed:true}));
