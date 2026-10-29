import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeSorbothaneConfig, randomVibrationClearance, cumulativeIsolationDisplacement } from '../js/sorbothane-analysis.js';
import { clearanceCumulativeSvg, clearanceCumulativeOutput, clearancePanel, clearanceCsv } from '../js/sorbothane-isolation.js';

const close = (a,b) => assert.ok(Math.abs(a-b)<=1e-12*Math.max(Math.abs(b),1e-20),`${a} != ${b}`);
const synthetic = () => ({valid:true,axis:'x',peakFactor:3,converged:true,frequencies:[10,20,40,80],modes:[],
  locations:[{label:'CG',rmsM:[Math.sqrt(2e-7),Math.sqrt(18e-7),0],peakM:[3*Math.sqrt(2e-7),3*Math.sqrt(18e-7),0]}],
  displacementPsdM2PerHz:[[[1e-8,1e-8,0,0],[9e-8,9e-8,0,0],[0,0,0,0]]]});

test('cumulative RMS integrates variance on a nonuniform grid, scales correctly and plateaus without summing RMS increments',()=>{
  const result=synthetic(),before=structuredClone(result),cumulative=cumulativeIsolationDisplacement(result);
  assert.deepEqual(cumulative.frequencies,result.frequencies);
  close(cumulative.rmsM[0][0],0);
  close(cumulative.rmsM[0][1],Math.sqrt(1e-7));
  close(cumulative.rmsM[0][2],Math.sqrt(2e-7));
  close(cumulative.rmsM[0][3],Math.sqrt(2e-7));
  assert.notEqual(cumulative.rmsM[0][2],2*Math.sqrt(1e-7));
  for(let i=0;i<4;i++) {close(cumulative.rmsM[1][i],3*cumulative.rmsM[0][i]);close(cumulative.peakM[0][i],3*cumulative.rmsM[0][i]);}
  assert.deepEqual(cumulative.rmsM[2],[0,0,0,0]);
  assert.deepEqual(result,before);
});

test('cumulative endpoints match the coupled solver RMS and factored travel at CG, corners and mounts for every input',()=>{
  const c=normalizeSorbothaneConfig();c.uncertainty.enabled=false;
  c.isolator.kind='parker-lord-am';c.isolator.productNumber='AM-006-1';c.damping={mode:'manual-q',effectiveQ:6};
  c.environment.random={enabled:true,axis:'x',points:[[10,.001],[100,.003],[500,.001]],peakFactor:4,gapsM:[0,0,0],checkClearance:false};
  for(const axis of ['x','y','z']){
    c.environment.random.axis=axis;
    const result=randomVibrationClearance(c);
    assert.equal(result.valid,true);assert.equal(result.converged,true);
    for(let index=0;index<result.locations.length;index++){
      const cumulative=cumulativeIsolationDisplacement(result,index);
      for(let d=0;d<3;d++){
        close(cumulative.rmsM[d].at(-1),result.locations[index].rmsM[d]);
        close(cumulative.peakM[d].at(-1),result.locations[index].peakM[d]);
        assert.ok(cumulative.rmsM[d].every((v,i)=>Number.isFinite(v)&&(!i||v>=cumulative.rmsM[d][i-1])));
      }
    }
    const csv=clearanceCsv({config:c,clearance:result}),lines=csv.trim().split('\n');
    assert.match(lines[1],/cumulative_rms_in,cumulative_factored_peak_in$/);
    const header=lines[1].split(','),last=lines.at(-1).split(',');
    close(Number(last[header.indexOf('cumulative_rms_in')]),result.locations.at(-1).rmsM[2]/.0254);
    close(Number(last[header.indexOf('cumulative_factored_peak_in')]),result.locations.at(-1).peakM[2]/.0254);
  }
});

test('cumulative plot labels units, input and location; zero spectra stay finite and nonconvergence stays explicit',()=>{
  const result=synthetic();
  for(const scale of ['rms','peak']){
    const svg=clearanceCumulativeSvg(result,0,scale);
    assert.equal((svg.match(/data-sorbo-cumulative-axis=/g)||[]).length,3);
    assert.match(svg,/CG from X base excitation/);
    assert.match(svg,/linear vertical axis/);
    assert.doesNotMatch(svg,/NaN|Infinity/);
  }
  assert.match(clearanceCumulativeOutput(result),/RMS is not peak travel/);
  assert.match(clearanceCumulativeOutput(result,0,'peak'),/not a guaranteed peak/);
  result.displacementPsdM2PerHz[0]=Array.from({length:3},()=>[0,0,0,0]);
  assert.doesNotMatch(clearanceCumulativeSvg(result),/NaN|Infinity/);
  result.converged=false;
  assert.match(clearanceCumulativeOutput(result),/Integration has not converged/);
});

test('cumulative helper rejects missing, malformed or non-finite integration data',()=>{
  for(const result of [null,{valid:false}, {...synthetic(),frequencies:[10,20,20,80]}, {...synthetic(),peakFactor:Infinity}, {...synthetic(),displacementPsdM2PerHz:[[[NaN,0,0,0],[0,0,0,0],[0,0,0,0]]]}])assert.throws(()=>cumulativeIsolationDisplacement(result));
  for(const index of [-1,.5,1])assert.throws(()=>cumulativeIsolationDisplacement(synthetic(),index));
});

test('panel and standalone wire the cumulative view to location and scale controls',()=>{
  const result=synthetic();
  const c=normalizeSorbothaneConfig();
  result.inputGrms=1;result.integrationError=0;result.warnings=[];
  result.locations[0]= {...result.locations[0],id:'cg',kind:'box',peakPsdHz:[10,20,null],marginM:[null,null,null]};
  assert.match(clearancePanel({config:c,clearance:result}),/Cumulative relative displacement/);
  const standalone=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
  assert.match(standalone,/cumulativeIsolationDisplacement/);
  assert.match(standalone,/data-sorbo-cumulative-scale/);
  assert.match(standalone,/data-sorbo-cumulative-output/);
  assert.match(standalone,/cumulative_factored_peak_in/);
});
