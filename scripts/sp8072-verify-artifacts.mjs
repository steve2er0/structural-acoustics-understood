// File-only handoff audit; this does not assert coordinator or owner acceptance.
import {readFileSync,writeFileSync,statSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=[
  'js/sp8072-data.js','js/sp8072-physics.js','js/sp8072-tool.js','js/app.js','js/engineering-workbenches.js','js/workbench-runtime.js','js/unit-system.js',
  'styles.css','service-worker.js','scripts/sync-standalone.mjs','scripts/sp8072-benchmarks.py','scripts/sp8072-manifest.mjs','scripts/sp8072-verify-delivery.mjs','scripts/sp8072-verify-exports.mjs','scripts/sp8072-verify-artifacts.mjs','standalone.html',
  'references/NASA-SP-8072-19710023719.pdf','references/NASA-20140005349-Diffuser-Water-Injection.pdf','references/sp8072-manifest.json','tests/fixtures/sp8072-benchmarks.json','tests/sp8072.test.mjs','tests/calculators.test.mjs',
  'docs/sp8072/README.md','docs/sp8072/VALIDATION.md','docs/sp8072/CONTROLS.md','docs/sp8072/example-study.json','README.md',
  'docs/sp8072/evidence/browser-checks.json','docs/sp8072/evidence/build-checks.json','docs/sp8072/evidence/download-checks.json','docs/sp8072/evidence/numerical-checks.json','docs/sp8072/evidence/npm-test.log',
  'docs/sp8072/evidence/recovered-study-export.json','docs/sp8072/evidence/recovered-distributed-study-export.json',
  'docs/sp8072/evidence/modular-desktop.png','docs/sp8072/evidence/modular-wet-distributed.png','docs/sp8072/evidence/modular-final-geometry.png','docs/sp8072/evidence/modular-final-spectrum.png','docs/sp8072/evidence/modular-mobile.png','docs/sp8072/evidence/modular-mobile-geometry.png','docs/sp8072/evidence/modular-mobile-spectrum.png',
  'docs/sp8072/evidence/resumed-mobile-geometry.png','docs/sp8072/evidence/resume-checks.json','docs/sp8072/evidence/fresh-study-export.json','docs/sp8072/evidence/fresh-calculation-evidence.json','docs/sp8072/evidence/fresh-spectrum.csv','docs/sp8072/evidence/fresh-report.txt','docs/sp8072/evidence/fresh-spectrum.svg','docs/sp8072/evidence/fresh-export-checks.json',
  'docs/sp8072/evidence/artifact-checks.json','docs/sp8072/completion-report.json'
];
assert.equal(new Set(files).size,files.length);
const report={status:'blocked',
  summary:'Changes: Preserved the explorer and owner changes; verified five fresh exports and final mobile captions; corrected path-scenario pressure labels.\nChecks: 162/162 tests, five independent benchmarks, export agreement/CSV closure, deterministic standalone rebuilds and git diff --check passed.\nLimits: Reset recovery was rejected by automatic approval review because raw CDP on localhost was denied. Import, direct-file/offline, print and viewport cleanup remain incomplete; no owner acceptance or measured correlation is claimed.',
  artifacts:files,decisions:[],next_steps:['Inspect the retained local reset confirmation manually, then finish the blocked same-surface import and direct-file/offline/print checks.','If coordinator artifact rejection persists, compare its stored completion payload with docs/sp8072/completion-report.json and the file audit.']};
const reportPath=path.join(root,'docs/sp8072/completion-report.json');
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
const auditPath='docs/sp8072/evidence/artifact-checks.json';
const canonicalRoot=realpathSync(root)+path.sep;
const entries=files.filter(file=>file!==auditPath).map(file=>{
  assert.ok(!path.isAbsolute(file)&&!file.split('/').includes('..'));
  const full=path.join(root,file),s=statSync(full);assert.ok(s.isFile(),`${file} must be a regular file`);
  assert.ok(realpathSync(full).startsWith(canonicalRoot),`${file} escapes the project`);
  return {file,bytes:s.size,sha256:createHash('sha256').update(readFileSync(full)).digest('hex')};
});
const audit={schema:'sau-sp8072-artifact-checks',version:1,createdUTC:new Date().toISOString(),
  passed:true,totalArtifacts:files.length,regularFiles:true,relativeProjectPaths:true,duplicates:false,
  excludedDirectory:'tmp/sp8072/',auditSelfEntry:'This file is checked as a regular project file after creation; its own hash is excluded to avoid recursion.',
  coordinatorValidation:'Not established. The supplied coordinator context repeats a generic Invalid completion artifacts failure. No coordinator code or output directory outside this project was accessed.',
  suppliedCoordinatorCompletionSha256:'677c129c7845a296c8bc35903f3bace06ad8e54a0cb6bfb71b93b1ee9af3b733',
  localCompletionReport:'docs/sp8072/completion-report.json',entries};
writeFileSync(path.join(root,auditPath),JSON.stringify(audit,null,2)+'\n');
assert.ok(statSync(path.join(root,auditPath)).isFile());
assert.ok(['completed','blocked','failed'].includes(report.status));
assert.ok(typeof report.summary==='string'&&Array.isArray(report.artifacts)&&report.artifacts.every(x=>typeof x==='string'));
console.log(JSON.stringify({artifacts:files.length,localFileAuditPassed:true,report:'docs/sp8072/completion-report.json',reportSha256:entries.find(e=>e.file==='docs/sp8072/completion-report.json').sha256,coordinatorAcceptanceClaimed:false}));
