// Continuous, exact first-order-hold SDOF state transition. Internal acceleration: m/s².
export const G = 9.80665;
export const SCHEMA = 'sau-flight-response/1';
export const DEFAULTS = Object.freeze({q:10, response:'absolute', fmin:10, fmax:800, pointsPerOctave:48, fs:16384, duration:18, seed:314159, window:1, qualDuration:120, peakModel:'one-exceedance', probability:.95, binWidth:.05});
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function unitsFactor(unit) { assert(['g','m/s^2'].includes(unit), 'Acceleration units must be g or m/s^2.'); return unit==='g'?G:1; }
export function validateSettings(s) {
  for(const k of ['q','fmin','fmax','pointsPerOctave','fs','duration','seed','window','qualDuration','probability','binWidth']) assert(Number.isFinite(s[k]), `${k} must be finite.`);
  assert(s.q>=1 && s.q<=100, 'Q must be between 1 and 100 (underdamped).');
  assert(['absolute','pseudo'].includes(s.response), 'Select absolute or pseudo acceleration.');
  assert(s.fmin>=1 && s.fmax>s.fmin, 'Natural frequencies must increase from at least 1 Hz.');
  assert(s.fs>=20*s.fmax && s.fs<=200000, 'Sample rate must be at least 20 × maximum natural frequency and at most 200 kHz.');
  assert(s.pointsPerOctave>=Math.ceil(6*s.q*Math.LN2) && s.pointsPerOctave<=600, `Use at least ${Math.ceil(6*s.q*Math.LN2)} points/octave for this Q (six points per resonant bandwidth). Refine again to check convergence.`);
  assert(s.duration>0 && s.duration<=120 && s.qualDuration>0 && s.qualDuration<=1e7, 'Record duration must be 0–120 s; qualification duration must be positive and ≤10 million s.');
  assert(Number.isInteger(s.seed) && s.seed>=0 && s.seed<=0xffffffff, 'Seed must be a 32-bit unsigned integer.');
  assert(s.binWidth===.05, 'This version stores 50 ms display bins.');
  assert(s.window>=.05 && s.window<=20 && Math.abs(s.window/.05-Math.round(s.window/.05))<1e-8, 'Display window must be a multiple of 50 ms, between 50 ms and 20 s.');
  assert(['one-exceedance','rayleigh-quantile'].includes(s.peakModel), 'Unknown statistical peak model.');
  assert(s.probability>.5 && s.probability<.9999, 'Envelope probability must be between 0.5 and 0.9999.');
  return s;
}
export function frequencyGrid(s) {
  const count=Math.ceil(Math.log2(s.fmax/s.fmin)*s.pointsPerOctave);
  assert(count<1600, 'Frequency grid exceeds 1600 oscillators. Reduce range or Q.');
  // Nested grids: doubling density retains every previous oscillator, plus the exact upper endpoint.
  return Float64Array.from({length:count+1},(_,i)=>i===count?s.fmax:s.fmin*2**(i/s.pointsPerOctave));
}
export function coefficients(fn,q,fs) {
  const z=1/(2*q), w=2*Math.PI*fn, h=w/fs, d=Math.sqrt(1-z*z), e=Math.exp(-z*h), c=Math.cos(d*h), sn=Math.sin(d*h)/d;
  const p00=e*(c+z*sn),p01=e*sn,p10=-p01,p11=e*(c-z*sn);
  const d0=1-p00,d1=-p10;
  // FOH integral: E = [F^-1 D / dt - F^-1 B], D = F^-1(Φ-I)B.
  const b10=1+(-2*z*d0-d1)/h,b11=d0/h;
  return {p00,p01,p10,p11,b00:d0-b10,b01:d1-b11,b10,b11,z};
}
export function oscillator(fn,q,fs,response='absolute') {
  const c=coefficients(fn,q,fs); let u=0,v=0,previous=0,initialized=false;
  return {step(a){if(!initialized){previous=a;initialized=true;return 0;}const x=c.p00*u+c.p01*v+c.b00*previous+c.b10*a;
    v=c.p10*u+c.p11*v+c.b01*previous+c.b11*a;u=x;previous=a;
    return response==='absolute'?u+2*c.z*v:-u;}, state(){return {u,v,previous};}};
}
export function responseHistory(a,fs,fn,q,response) {
  const y=new Float64Array(a.length);
  // Rest at t=0; the first sample is a forcing endpoint, not a preceding time interval.
  const c=coefficients(fn,q,fs); let u=0,v=0;
  for(let i=1;i<a.length;i++){const x=c.p00*u+c.p01*v+c.b00*a[i-1]+c.b10*a[i];v=c.p10*u+c.p11*v+c.b01*a[i-1]+c.b11*a[i];u=x;y[i]=response==='absolute'?u+2*c.z*v:-u;}
  return y;
}
export function seeded(seed) { let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return (state+.5)/4294967296;}; }
export function synthetic(s) {
  assert(s.fs>=5000,'Synthetic forcing requires sample rate ≥5000 Hz to resolve its 420 Hz dwell and broadband content.');
  const rand=seeded(s.seed), n=Math.round(s.fs*s.duration)+1, a=new Float64Array(n);
  const frequencies=Array.from({length:48},(_,i)=>12*(1200/12)**(i/47));
  const phases=frequencies.map(()=>2*Math.PI*rand());let phase=0;
  for(let i=0;i<n;i++) {const t=i/s.fs, fraction=t/s.duration;
    // 0–3s dwell at 70 Hz, 3–10s sweep 70→420, 10–14s dwell/dither, 14–18s sweep down.
    const f=fraction<1/6?70:fraction<5/9?70+350*(fraction-1/6)/(7/18):fraction<7/9?420+8*Math.sin(2*Math.PI*.8*t):420-330*(fraction-7/9)/(2/9);
    phase+=2*Math.PI*f/s.fs;
    const amp=fraction<1/6?1.15:fraction<5/9?.9:fraction<7/9?1.8:.35;
    const ramp=Math.min(1,t/.3,Math.max(0,(s.duration-t)/.15));
    let broadband=0;for(let k=0;k<frequencies.length;k++) broadband+=Math.cos(2*Math.PI*frequencies[k]*t+phases[k]);
    a[i]=G*ramp*(amp*Math.sin(phase)+.09*broadband/Math.sqrt(24));
  }
  return {a,fs:s.fs,duration:(n-1)/s.fs,source:`Synthetic only · seeded multisine broadband + swept/dithering tone · seed ${s.seed}`,units:'m/s^2',synthetic:true};
}
function csvRows(text) {
  assert(typeof text==='string' && text.length<=60e6, 'CSV is missing or exceeds 60 MB.');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()&&!x.trim().startsWith('#'));
  assert(lines.length>=3, 'CSV requires a header and at least two rows.');
  const header=lines.shift().trim().toLowerCase().split(',').map(x=>x.trim());
  const rows=lines.map((line,i)=>{const p=line.split(',').map(x=>x.trim());assert(p.length===2 && p.every(x=>x!==''), `CSV row ${i+2} requires exactly two values.`);const r=p.map(Number);assert(r.every(Number.isFinite), `CSV row ${i+2} contains a nonfinite number.`);return r;});
  return {header,rows};
}
export function parseFlight(text,unit) {
  const {header,rows}=csvRows(text);assert(header.join(',')==='time_s,acceleration', 'Flight header must be time_s,acceleration.');
  const scale=unitsFactor(unit),dt=rows[1][0]-rows[0][0];assert(dt>0,'Flight timestamps must strictly increase.');
  const origin=rows[0][0];assert(rows.length<=2e6,'Limit: 2 million flight samples.');
  for(let i=0;i<rows.length;i++) assert(Math.abs(rows[i][0]-origin-i*dt)<=Math.max(1e-9,dt*1e-3), `Flight timestamps must be uniform within 0.1% of dt (row ${i+2}); gaps/duplicates are rejected.`);
  const duration=(rows.length-1)*dt;assert(duration>0 && duration<=120,'Imported duration exceeds supported 120 s.');
  assert(1/dt<=200000,'Imported sample rate exceeds 200 kHz.');
  return {a:Float64Array.from(rows,r=>r[1]*scale),fs:1/dt,duration,origin,source:'Local imported flight CSV',units:'m/s^2',inputUnits:unit,synthetic:false};
}
export function parseCurve(text,unit,kind='ers',metadata={}) {
  const {header,rows}=csvRows(text);assert(header.join(',')===(kind==='psd'?'frequency_hz,psd':'frequency_hz,ers'), `Expected frequency_hz,${kind==='psd'?'psd':'ers'} header.`);
  const factor=unitsFactor(unit)**(kind==='psd'?2:1);
  rows.forEach((r,i)=>assert(r[0]>0 && r[1]>0 && (!i || r[0]>rows[i-1][0]), 'Reference frequencies must increase; all frequencies and levels must be finite and strictly positive.'));
  assert(rows.length<=10000,'Reference exceeds 10000 rows.');
  return {f:rows.map(r=>r[0]),y:rows.map(r=>r[1]*factor),kind,metadata:{...metadata,units:'m/s^2',inputUnits:unit}};
}
export function logInterpolate(curve,x) {
  const f=curve.f,y=curve.y;
  if(x<f[0]*(1-1e-12)||x>f.at(-1)*(1+1e-12)) return NaN;
  if(x<=f[0]) return y[0];if(x>=f.at(-1))return y.at(-1);
  let low=0,high=f.length-1;while(high-low>1){const m=(low+high)>>1;if(f[m]<=x)low=m;else high=m;}
  return y[low]*(y[high]/y[low])**(Math.log(x/f[low])/Math.log(f[high]/f[low]));
}
export function referenceOnGrid(curve,grid,s) {
  const m=curve.metadata;
  assert(m.response===s.response && Math.abs(m.q-s.q)<1e-10 && m.convention==='primary+residual', 'ERS metadata must match response type, Q and primary+residual maximax convention.');
  const result=Float64Array.from(grid,f=>logInterpolate(curve,f));
  assert([...result].every(x=>Number.isFinite(x)&&x>0), 'ERS curve does not cover the complete natural-frequency grid. No extrapolation or zero-denominator ratios allowed.');return result;
}
export function transferSquared(f,fn,q,response) {
  const r=f/fn, damping=r/q,den=(1-r*r)**2+damping*damping;
  return (response==='absolute'?1+damping*damping:1)/den;
}
export function peakFactor(n,model,p=.95) {
  assert(n>=10,'Statistical peak estimate requires at least 10 expected response peaks. Increase qualification duration.');
  if(model==='one-exceedance') return Math.sqrt(2*Math.log(n));
  // Maximum of N independent Rayleigh envelopes: F(x)^N = p.
  assert(model==='rayleigh-quantile','Unknown peak model.');return Math.sqrt(-2*Math.log(-Math.expm1(Math.log(p)/n)));
}
export function spectralMoments(curve,fn,q,response,resolution=1) {
  const lo=curve.f[0],hi=curve.f.at(-1),count=Math.ceil(Math.max(1024,Math.log(hi/lo)*q*64)*resolution);
  const xs=[...curve.f,...Array.from({length:count+1},(_,i)=>lo*(hi/lo)**(i/count))].sort((a,b)=>a-b);
  let m0=0,m2=0,m4=0,prevF=xs[0],prev=logInterpolate(curve,prevF)*transferSquared(prevF,fn,q,response);
  for(let i=1;i<xs.length;i++){const f=xs[i],y=logInterpolate(curve,f)*transferSquared(f,fn,q,response),h=f-prevF;m0+=h*(prev+y)/2;m2+=h*(prev*prevF**2+y*f**2)/2;m4+=h*(prev*prevF**4+y*f**4)/2;prevF=f;prev=y;}
  return {m0,m2,m4,rms:Math.sqrt(m0),rate:Math.sqrt(m4/m2)}; // Hz-based moments ⇒ rate in peaks/s
}
export function estimateQualification(curve,grid,s) {
  assert(curve.kind==='psd','A PSD is required.');
  const values=new Float64Array(grid.length),details=[];let error=0,narrowbandMin=1,broadbandCount=0;
  for(let i=0;i<grid.length;i++) {const m=spectralMoments(curve,grid[i],s.q,s.response),fine=spectralMoments(curve,grid[i],s.q,s.response,2),n=fine.rate*s.qualDuration,k=peakFactor(n,s.peakModel,s.probability);
    const irregularity=fine.m2/Math.sqrt(fine.m0*fine.m4);narrowbandMin=Math.min(narrowbandMin,irregularity);if(irregularity<.9)broadbandCount++;
    error=Math.max(error,Math.abs(m.m0/fine.m0-1),Math.abs(m.rate/fine.rate-1));values[i]=fine.rms*k;details.push({...fine,n,peakFactor:k,irregularity});}
  assert([...values].every(x=>Number.isFinite(x)&&x>0),'PSD integration produced invalid reference.');
  assert(error<.005,`PSD numerical refinement differs by ${(100*error).toFixed(2)}%; reference withheld.`);
  return {values,details,integrationError:error,narrowbandMin,broadbandCount,label:`Specified PSD → statistical estimate · ${s.qualDuration} s · ${s.peakModel}`,estimated:true};
}
export const DEMO_PSD='frequency_hz,psd\n10,0.004\n30,0.007\n100,0.007\n500,0.003\n2000,0.001';
export function compute(record,s,progress=()=>{}) {
  validateSettings({...s,fs:record.fs,duration:record.duration});const grid=frequencyGrid(s),fs=record.fs,n=record.a.length;
  assert([...record.a].every(Number.isFinite),'Acceleration record contains nonfinite values.');
  const ringdown=Math.log(1e6)/(Math.PI*s.fmin/s.q),residualSamples=Math.ceil(ringdown*fs),total=n+residualSamples;
  assert(total*grid.length<=350e6,'Calculation exceeds 350 million oscillator steps. Reduce duration, frequency range or grid density.');
  const bins=Math.ceil(total/fs/s.binWidth),peaks=new Float64Array(bins*grid.length),running=new Float64Array(peaks.length),final=new Float64Array(grid.length),primary=new Float64Array(grid.length),residual=new Float64Array(grid.length);
  assert(peaks.byteLength*2<100e6,'Summary storage exceeds 100 MB.');
  for(let k=0;k<grid.length;k++){const c=coefficients(grid[k],s.q,fs);let u=0,v=0,prev=record.a[0],max=0;
    for(let i=1;i<total;i++){const a=i<n?record.a[i]:0,x=c.p00*u+c.p01*v+c.b00*prev+c.b10*a;v=c.p10*u+c.p11*v+c.b01*prev+c.b11*a;u=x;prev=a;
      const y=Math.abs(s.response==='absolute'?u+2*c.z*v:-u),bin=Math.min(bins-1,Math.floor(i/fs/s.binWidth)),idx=bin*grid.length+k;
      if(y>peaks[idx])peaks[idx]=y;if(y>max)max=y;
      if(i<n){if(y>primary[k])primary[k]=y;}else if(y>residual[k])residual[k]=y;
    }
    final[k]=max;let cumulative=0;for(let j=0;j<bins;j++){cumulative=Math.max(cumulative,peaks[j*grid.length+k]);running[j*grid.length+k]=cumulative;}
    if(k%8===0)progress(k/grid.length);
  }
  progress(1);return {grid,peaks,running,final,primary,residual,bins,binWidth:s.binWidth,recordDuration:record.duration,totalDuration:(total-1)/fs,ringdown,fs,source:record.source,synthetic:record.synthetic};
}
export function localCurve(result,bin,window) {
  const count=Math.max(1,Math.round(window/result.binWidth)),first=Math.max(0,bin-count+1),values=new Float64Array(result.grid.length);
  for(let j=first;j<=bin;j++)for(let k=0;k<values.length;k++) values[k]=Math.max(values[k],result.peaks[j*values.length+k]);return values;
}
export function ratio(response,reference) { return Float64Array.from(response,(y,i)=>Number.isFinite(reference[i])&&reference[i]>0?y/reference[i]:NaN); }
