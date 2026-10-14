// Consistency checks for actual local browser downloads, not measured correlation.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {calculateSp8072} from '../js/sp8072-physics.js';
const root=new URL('../docs/sp8072/evidence/',import.meta.url);
const read=name=>readFileSync(new URL(name,root));
const project=JSON.parse(read('fresh-study-export.json'));
assert.equal(project.schema,'sau-engineering-tool');assert.equal(project.version,1);assert.equal(project.toolId,'nasa-sp8072');
const expected=calculateSp8072(project.inputs['nasa-sp8072']);
const close=(actual,value)=>assert.ok(Math.abs(actual-value)<1e-9,`${actual} differs from ${value}`);
close(project.calculation.values[0].value,expected.overallDb);
assert.equal(project.calculationUnits,'canonical SI');
const evidence=JSON.parse(read('fresh-calculation-evidence.json'));
assert.equal(evidence.schema,'sau-sp8072-evidence');assert.equal(evidence.units,'canonical SI');
assert.deepEqual(evidence.study.inputs,project.inputs);close(evidence.result.values[0].value,expected.overallDb);
const lines=read('fresh-spectrum.csv').toString().trim().split(/\r?\n/);
assert.equal(lines[0],'frequency_Hz,lower_Hz,upper_Hz,source_W,dry_source_W,SPL_dB_re20uPa,dry_SPL_dB_re20uPa,pressure_variance_Pa2');
const rows=lines.slice(1).map(row=>row.split(',').map(Number));assert.equal(rows.length,expected.bands.length);
for(let i=0;i<rows.length;i++){
  const b=expected.bands[i],values=[b.frequency,b.lower,b.upper,b.sourceWatts,b.drySourceWatts,b.splDb,b.drySplDb,b.pressureSquared];
  rows[i].forEach((value,j)=>close(value,values[j]));
}
const csvOverallDb=10*Math.log10(rows.reduce((sum,row)=>sum+row[7],0)/4e-10);close(csvOverallDb,expected.overallDb);
const report=read('fresh-report.txt').toString();assert.ok(report.includes('NASA SP-8072 Launch Acoustic Explorer'));
const marker='SOURCE / CALCULATION RECORD\n';assert.ok(report.includes(marker));
const reportEvidence=JSON.parse(report.slice(report.indexOf(marker)+marker.length));
assert.deepEqual(reportEvidence.study.inputs,project.inputs);close(reportEvidence.result.values[0].value,expected.overallDb);
assert.ok(report.includes(`${expected.overallDb} dB re 20 µPa`));
const svg=read('fresh-spectrum.svg').toString();
assert.match(svg,/^<svg /);assert.ok(svg.includes('aria-label="External acoustic band spectrum"'));
assert.ok(svg.includes(`data-chart-x-domain="${expected.bands[0].frequency},${expected.bands.at(-1).frequency}"`));
for(const band of expected.bands)assert.ok(svg.includes(`Band center frequency (Hz): ${band.frequency.toFixed(2)}`));
const names=['fresh-study-export.json','fresh-calculation-evidence.json','fresh-spectrum.csv','fresh-report.txt','fresh-spectrum.svg'];
const files=names.map(name=>({file:'docs/sp8072/evidence/'+name,bytes:statSync(new URL(name,root)).size,sha256:createHash('sha256').update(read(name)).digest('hex')}));
const result={schema:'sau-sp8072-fresh-export-checks',version:1,createdUTC:new Date().toISOString(),passed:true,
  delivery:'Actual app controls clicked once each; Chrome native Save dialogs saved new files within the approved project.',
  displayUnits:project.unitSystem,calculationUnits:project.calculationUnits,overallDb:expected.overallDb,
  csvOverallDb,bandCount:rows.length,inputAgreement:true,reportAgreement:true,evidenceAgreement:true,svgDomainAndPointTitles:true,files,
  limits:'Export consistency and pressure-energy closure, not measurement correlation; import/round-trip is a separate check.'};
writeFileSync(new URL('fresh-export-checks.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,files:files.length,overallDb:expected.overallDb,csvOverallDb}));
