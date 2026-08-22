/* Additional engineering calculators for the complete Structural Acoustics, Understood library. */
import { createEngineeringRegistry } from './engineering-results.js';
import { materials, plateBoundaryPresets, plateModalFrequency } from './calculators.js';
import {
  HONEYCOMB_MODE_DATA,
  PAPER_LAP_TRANSMISSION,
  honeycombCoincidenceFrequency,
  honeycombFrequencySeries,
  honeycombPreset,
  honeycombWaveState,
  inhomogeneousEnergyStudy,
  junctionTransmissionState,
  experimentalSeaInverse,
  seaForwardEnergies
} from './honeycomb-paper.js';
import { clfIdentificationUncertainty, histogram } from './sea-coupling.js';

const G0 = 9.80665;
const AIR_RHO = 1.204;
const AIR_C = 343;
const TWO_PI = 2 * Math.PI;

const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
function positive(v, name) { const x = n(v); if (!(x > 0)) throw new Error(`${name} must be greater than zero.`); return x; }
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const rad = f => TWO_PI * f;
const db10 = x => 10 * Math.log10(Math.max(x, 1e-300));
const fromDb10 = x => 10 ** (x / 10);
const stat = (label, value, unit = '', tone = '') => ({ label, value, unit, tone });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const materialOptions = Object.entries(materials).map(([value, material]) => ({ value, label: material.label }));
const plateBoundaryOptions = Object.entries(plateBoundaryPresets).map(([value, preset]) => ({ value, label: preset.label }));
const syncPanelCavityMaterial = values => {
  const material = materials[values.material] || materials.aluminum;
  return { ...values, E: material.E / 1e9, rho: material.rho, nu: material.nu };
};

function honeycombPanelFromValues(v) {
  if (v.panel_preset === 'panel2') return honeycombPreset('panel2');
  if (v.panel_preset !== 'custom') return honeycombPreset('panel1');
  return {
    id:'custom',name:'Custom honeycomb sandwich panel',
    length:positive(v.panel_length,'Panel length'),width:positive(v.panel_width,'Panel width'),totalMass:positive(v.panel_mass,'Panel mass'),
    faceModulus:positive(v.face_modulus_gpa,'Facesheet modulus')*1e9,facePoisson:n(v.face_poisson,.3),faceThickness:positive(v.face_thickness_mm,'Facesheet thickness')/1000,
    coreThickness:positive(v.core_thickness_mm,'Core thickness')/1000,coreShear:positive(v.core_shear_mpa,'Core shear modulus')*1e6,
    doublerLength:Math.max(0,n(v.doubler_length_mm))/1000,doublerMass:Math.max(0,n(v.doubler_mass))
  };
}

function matrixEvery(matrix, rowStep=3, columnStep=3) {
  return matrix.filter((_,row)=>row%rowStep===0).map(values=>values.filter((_,column)=>column%columnStep===0));
}

function parseNumbers(text) {
  return String(text ?? '').split(/[\s,;\t\r\n]+/).map(Number).filter(Number.isFinite);
}
function parsePairs(text, name = 'data') {
  const rows = String(text ?? '').split(/\r?\n/).map(r => r.trim()).filter(r => r && !r.startsWith('#')).map(r => r.split(/[\s,;\t]+/).map(Number)).filter(r => r.length >= 2 && Number.isFinite(r[0]) && Number.isFinite(r[1])).map(r => [r[0], r[1]]).sort((a,b)=>a[0]-b[0]);
  if (rows.length < 2) throw new Error(`Enter at least two valid ${name} rows.`);
  return rows;
}
function linspace(a, b, count = 100) {
  if (count <= 1) return [a];
  return Array.from({length: count}, (_,i)=>a + (b-a)*i/(count-1));
}
function logspace(a, b, count = 100) {
  if (!(a > 0 && b > a)) return [];
  const la = Math.log10(a), lb = Math.log10(b);
  const values=Array.from({length: count}, (_,i)=>10 ** (la + (lb-la)*i/(count-1)));
  values[0]=a;values[values.length-1]=b;
  return values;
}
function trapz(x, y) {
  let s = 0;
  for (let i=0;i<Math.min(x.length,y.length)-1;i++) s += 0.5*(y[i]+y[i+1])*(x[i+1]-x[i]);
  return s;
}
function interpLogLog(points, x) {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points.at(-1)[0]) return points.at(-1)[1];
  let lo=0, hi=points.length-1;
  while (hi-lo>1) { const mid=(lo+hi)>>1; if (points[mid][0] <= x) lo=mid; else hi=mid; }
  const [x1,y1]=points[lo], [x2,y2]=points[hi];
  if (y1<=0 || y2<=0) return y1+(y2-y1)*(x-x1)/(x2-x1);
  const t=Math.log(x/x1)/Math.log(x2/x1);
  return y1*(y2/y1)**t;
}
function integrateLogLog(points) {
  let total=0;
  for(let i=0;i<points.length-1;i++){
    const [f1,y1]=points[i], [f2,y2]=points[i+1];
    if (!(f2>f1) || y1<0 || y2<0) continue;
    if (y1===0 || y2===0) { total += .5*(y1+y2)*(f2-f1); continue; }
    const p=Math.log(y2/y1)/Math.log(f2/f1);
    const a=y1/f1**p;
    total += Math.abs(p+1)<1e-10 ? a*Math.log(f2/f1) : a*(f2**(p+1)-f1**(p+1))/(p+1);
  }
  return total;
}
function complex(re, im){ return {re,im}; }
function cMul(a,b){ return complex(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re); }
function cConj(a){ return complex(a.re,-a.im); }
function cMag(a){ return Math.hypot(a.re,a.im); }
function cPhase(a){ return Math.atan2(a.im,a.re)*180/Math.PI; }
function cInv(a){ const d=a.re*a.re+a.im*a.im || 1e-300; return complex(a.re/d,-a.im/d); }
function cDiv(a,b){ return cMul(a,cInv(b)); }
function polar(mag,deg){ const p=deg*Math.PI/180; return complex(mag*Math.cos(p),mag*Math.sin(p)); }
function nextPow2(x){ let p=1; while(p<x)p<<=1; return p; }
function prevPow2(x){ let p=1; while((p<<1)<=x)p<<=1; return p; }

function fftReal(input) {
  const N=input.length;
  const re=Float64Array.from(input), im=new Float64Array(N);
  for(let i=1,j=0;i<N;i++){
    let bit=N>>1;
    for(;j&bit;bit>>=1)j^=bit;
    j^=bit;
    if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
  }
  for(let len=2;len<=N;len<<=1){
    const ang=-TWO_PI/len, wr0=Math.cos(ang), wi0=Math.sin(ang);
    for(let i=0;i<N;i+=len){
      let wr=1,wi=0;
      for(let j=0;j<len/2;j++){
        const u=i+j,v=i+j+len/2;
        const tr=wr*re[v]-wi*im[v],ti=wr*im[v]+wi*re[v];
        re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;
        const tmp=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=tmp;
      }
    }
  }
  return {re,im};
}
function detrendLinear(arr){
  const N=arr.length;
  let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<N;i++){sx+=i;sy+=arr[i];sxx+=i*i;sxy+=i*arr[i];}
  const den=N*sxx-sx*sx || 1;
  const b=(N*sxy-sx*sy)/den,a=(sy-b*sx)/N;
  return arr.map((v,i)=>v-(a+b*i));
}
function welch(signal, fs, segmentLength, overlap, windowName='hann', detrend='mean'){
  const N=signal.length;
  let L=prevPow2(Math.min(N,Math.max(16,Math.round(segmentLength))));
  if(L<16) throw new Error('Time history is too short for a PSD estimate.');
  const step=Math.max(1,Math.round(L*(1-clamp(overlap,0,0.95))));
  const w=Array.from({length:L},(_,i)=>windowName==='rectangular'?1:0.5*(1-Math.cos(TWO_PI*i/(L-1))));
  const U=w.reduce((s,x)=>s+x*x,0);
  const out=new Float64Array(L/2+1); let count=0;
  for(let start=0;start+L<=N;start+=step){
    let seg=signal.slice(start,start+L);
    if(detrend==='linear')seg=detrendLinear(seg);
    else if(detrend==='mean'){const mean=seg.reduce((s,x)=>s+x,0)/L;seg=seg.map(x=>x-mean);}
    seg=seg.map((x,i)=>x*w[i]);
    const {re,im}=fftReal(seg);
    for(let k=0;k<=L/2;k++){
      let p=(re[k]*re[k]+im[k]*im[k])/(fs*U);
      if(k>0 && k<L/2)p*=2;
      out[k]+=p;
    }
    count++;
  }
  if(!count)throw new Error('No complete Welch segments fit the time history.');
  for(let k=0;k<out.length;k++)out[k]/=count;
  return {f:Array.from(out,(_,k)=>k*fs/L),psd:Array.from(out),df:fs/L,averages:count,segmentLength:L};
}
function rms(arr){ return Math.sqrt(arr.reduce((s,x)=>s+x*x,0)/Math.max(1,arr.length)); }
function gamma(z){
  const p=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.984369578019571e-6,1.5056327351493116e-7];
  if(z<0.5)return Math.PI/(Math.sin(Math.PI*z)*gamma(1-z));
  z-=1;let x=p[0];for(let i=1;i<p.length;i++)x+=p[i]/(z+i);const t=z+p.length-1.5;return Math.sqrt(TWO_PI)*t**(z+0.5)*Math.exp(-t)*x;
}
function responsePsd(points, fn, zeta){
  return sdofResponsePsd(points,fn,zeta,'absolute-acceleration');
}
function spectralMoments(f,g){
  const m0=trapz(f,g),m1=trapz(f,g.map((x,i)=>x*rad(f[i]))),m2=trapz(f,g.map((x,i)=>x*rad(f[i])**2)),m4=trapz(f,g.map((x,i)=>x*rad(f[i])**4));
  return {m0,m1,m2,m4};
}

const FDS_DAMAGE_METHODS=Object.freeze({
  narrowband:{label:'Narrowband Rayleigh'},
  dirlik:{label:'Dirlik spectral rainflow approximation'},
  rainflow:{label:'Synthesized response + rainflow'}
});

function dirlikParameters(m0,m1,m2,m4){
  const alpha=m0>0&&m4>0?clamp(m2/Math.sqrt(m0*m4),0,1):0,xm=m0>0&&m4>0?(m1/m0)*Math.sqrt(Math.max(0,m2/m4)):0;
  const narrowbandLimit=alpha>.999999;
  if(narrowbandLimit)return {d1:0,d2:0,d3:1,q:1,r:1,alpha,xm,valid:true,narrowbandLimit:true};
  const d1=2*(xm-alpha*alpha)/(1+alpha*alpha),den=1-alpha-d1+d1*d1;
  const r=Math.abs(den)>1e-12?(alpha-xm-d1*d1)/den:NaN,d2=Number.isFinite(r)&&Math.abs(1-r)>1e-12?den/(1-r):NaN,d3=1-d1-d2,q=Math.abs(d1)>1e-12?1.25*(alpha-d3-d2*r)/d1:NaN;
  const valid=[d1,d2,d3,q,r].every(Number.isFinite)&&d1>=-1e-8&&d2>=-1e-8&&d3>=-1e-8&&q>0&&Math.abs(r)>1e-10;
  return valid?{d1:Math.max(0,d1),d2:Math.max(0,d2),d3:Math.max(0,d3),q,r,alpha,xm,valid:true,narrowbandLimit:false}:{d1:0,d2:0,d3:1,q:1,r:1,alpha,xm,valid:false,narrowbandLimit:false};
}

export function spectralFatigueDamageFromMoments({m0,m1,m2,m4,duration=1,b=6,method='narrowband'}={}){
  const T=positive(duration,'Duration'),exponent=positive(b,'S–N exponent'),M0=Math.max(0,n(m0)),M1=Math.max(0,n(m1)),M2=Math.max(0,n(m2)),M4=Math.max(0,n(m4)),sigma=Math.sqrt(M0);
  const zeroCrossingRate=M0>0?Math.sqrt(M2/M0)/TWO_PI:0,peakRate=M2>0?Math.sqrt(M4/M2)/TWO_PI:0,peakMoment=2**(exponent/2)*gamma(1+exponent/2),narrowbandAmplitudeMoment=peakMoment*sigma**exponent,narrowbandDamage=T*zeroCrossingRate*narrowbandAmplitudeMoment;
  const parameters=dirlikParameters(M0,M1,M2,M4),dirlikAmplitudeMoment=parameters.valid?sigma**exponent*(parameters.d1*parameters.q**exponent*gamma(1+exponent)+peakMoment*(parameters.d2*Math.abs(parameters.r)**exponent+parameters.d3)):narrowbandAmplitudeMoment;
  const dirlikDamage=parameters.valid?T*peakRate*Math.max(0,dirlikAmplitudeMoment):narrowbandDamage,selectedMethod=method==='dirlik'?'dirlik':'narrowband';
  return {damage:selectedMethod==='dirlik'?dirlikDamage:narrowbandDamage,narrowbandDamage,dirlikDamage,narrowbandAmplitudeMoment,dirlikAmplitudeMoment,zeroCrossingRate,peakRate,irregularityFactor:parameters.alpha,dirlikParameters:parameters,sigma,duration:T,b:exponent,method:selectedMethod};
}

function normalizeRainflowSamples(value){
  const requested=Math.round(n(value,2048));
  return [1024,2048,4096].reduce((best,candidate)=>Math.abs(candidate-requested)<Math.abs(best-requested)?candidate:best,2048);
}

function deterministicPhaseRandom(seed=537){
  let value=Math.max(1,Math.floor(Math.abs(n(seed,537))))>>>0;
  return ()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};
}

function inverseFft(reInput,imInput){
  const N=reInput.length,re=Float64Array.from(reInput),im=Float64Array.from(imInput);
  for(let i=1,j=0;i<N;i++){
    let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
    if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
  }
  for(let len=2;len<=N;len<<=1){
    const ang=TWO_PI/len,wr0=Math.cos(ang),wi0=Math.sin(ang);
    for(let i=0;i<N;i+=len){
      let wr=1,wi=0;
      for(let j=0;j<len/2;j++){
        const u=i+j,v=i+j+len/2,tr=wr*re[v]-wi*im[v],ti=wr*im[v]+wi*re[v];
        re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;
        const tmp=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=tmp;
      }
    }
  }
  return Array.from(re,value=>value/N);
}

function fdsTurningPoints(values){
  if(values.length<3)return values.map((value,index)=>({index,value}));
  const points=[{index:0,value:values[0]}];
  for(let index=1;index<values.length-1;index++){
    const left=values[index]-values[index-1],right=values[index+1]-values[index];
    if((left>=0&&right<0)||(left<=0&&right>0))points.push({index,value:values[index]});
  }
  points.push({index:values.length-1,value:values.at(-1)});return points;
}

function fdsRainflowCycles(points){
  const stack=[],cycles=[];
  for(const point of points){
    stack.push(point);
    while(stack.length>=3){
      const a=stack.at(-3),b=stack.at(-2),c=stack.at(-1),firstRange=Math.abs(b.value-a.value),secondRange=Math.abs(c.value-b.value);
      if(secondRange<firstRange)break;
      const cycle={amplitude:firstRange/2,count:stack.length===3?.5:1};cycles.push(cycle);
      if(stack.length===3)stack.shift();else stack.splice(stack.length-3,2);
    }
  }
  for(let index=0;index<stack.length-1;index++)cycles.push({amplitude:Math.abs(stack[index+1].value-stack[index].value)/2,count:.5});
  return cycles.filter(cycle=>cycle.amplitude>Number.EPSILON);
}

function synthesizedRainflowPseudoDamage({responseFrequencies,responsePsd,m0,duration,b,seed=537,sampleCount=2048,oscillatorFrequency=1}={}){
  const N=normalizeRainflowSamples(sampleCount),fmin=responseFrequencies[0],fmax=responseFrequencies.at(-1),sampleRate=2.56*fmax,df=sampleRate/N,re=new Float64Array(N),im=new Float64Array(N),random=deterministicPhaseRandom((Math.round(n(seed,537))^Math.round(oscillatorFrequency*1000))>>>0),points=responseFrequencies.map((f,index)=>[f,responsePsd[index]]);
  for(let k=1;k<N/2;k++){
    const f=k*df;if(f<fmin||f>fmax)continue;
    const amplitude=Math.sqrt(Math.max(0,2*interpLogLog(points,f)*df)),phase=TWO_PI*random(),scale=N*amplitude/2;
    re[k]=scale*Math.cos(phase);im[k]=scale*Math.sin(phase);re[N-k]=re[k];im[N-k]=-im[k];
  }
  const raw=inverseFft(re,im),mean=raw.reduce((sum,value)=>sum+value,0)/N,rawRms=Math.sqrt(raw.reduce((sum,value)=>sum+(value-mean)**2,0)/N),targetRms=Math.sqrt(Math.max(0,m0)),history=raw.map(value=>(value-mean)*targetRms/Math.max(rawRms,1e-300)),windowDuration=N/sampleRate,cycles=fdsRainflowCycles(fdsTurningPoints([...history,history[0]])),cycleScale=positive(duration,'Duration')/windowDuration,exponent=positive(b,'S–N exponent'),damage=cycles.reduce((sum,cycle)=>sum+cycle.count*cycleScale*cycle.amplitude**exponent,0);
  return {damage,history,cycles,windowDuration,cycleScale,sampleRate,sampleCount:N,synthesizedRms:Math.sqrt(history.reduce((sum,value)=>sum+value*value,0)/N),cycleCount:cycles.reduce((sum,cycle)=>sum+cycle.count,0)*cycleScale};
}

const FDS_RESPONSE_BASES=Object.freeze({
  'pseudo-velocity':{label:'Pseudo velocity',unit:'m/s'},
  'relative-displacement':{label:'Relative displacement',unit:'m'},
  'absolute-acceleration':{label:'Absolute acceleration',unit:'g'}
});

function uniqueSorted(values){
  return [...new Set(values.filter(Number.isFinite))].sort((a,b)=>a-b);
}

function validatePsdPoints(points,name='PSD'){
  if(!Array.isArray(points)||points.length<2)throw new Error(`Enter at least two valid ${name} rows.`);
  const sorted=points.map(row=>[Number(row[0]),Number(row[1])]).sort((a,b)=>a[0]-b[0]);
  if(sorted.some(([f,g])=>!(f>0)||!(g>=0)))throw new Error(`${name} frequencies must be positive and PSD levels cannot be negative.`);
  if(sorted.some((row,index)=>index>0&&row[0]===sorted[index-1][0]))throw new Error(`${name} frequencies must be unique.`);
  if(!sorted.some(([,g])=>g>0))throw new Error(`${name} must contain at least one positive PSD level.`);
  return sorted;
}

function sdofIntegrationGrid(points,fn,zeta){
  const fmin=points[0][0],fmax=points.at(-1)[0],decades=Math.log10(fmax/fmin);
  const base=logspace(fmin,fmax,Math.max(401,Math.ceil(240*decades)+1));
  const span=Math.min(.8,Math.max(.015,12*Math.max(zeta,1e-5)));
  const localMin=Math.max(fmin,fn*(1-span)),localMax=Math.min(fmax,fn*(1+span));
  const local=localMax>localMin?logspace(localMin,localMax,161):[];
  return uniqueSorted([...base,...local,...points.map(row=>row[0]),...(fn>=fmin&&fn<=fmax?[fn]:[])]);
}

function responseTransferSquared(f,fn,zeta,responseBasis){
  const r=f/fn,den=(1-r*r)**2+(2*zeta*r)**2,wn=rad(fn);
  if(responseBasis==='relative-displacement')return (G0/(wn*wn))**2/den;
  if(responseBasis==='absolute-acceleration')return (1+(2*zeta*r)**2)/den;
  return (G0/wn)**2/den;
}

function sdofResponsePsd(points,fn,zeta,responseBasis='pseudo-velocity'){
  const basis=FDS_RESPONSE_BASES[responseBasis]?responseBasis:'pseudo-velocity';
  const f=sdofIntegrationGrid(points,fn,zeta);
  const response=f.map(freq=>interpLogLog(points,freq)*responseTransferSquared(freq,fn,zeta,basis));
  return {f,response};
}

export function fatigueDamageSpectrumState({
  psdPoints,q=10,duration=60,b=6,frequencies,responseBasis='pseudo-velocity',damageMethod='narrowband',includeRainflow=false,rainflowSeed=537,rainflowSamples=2048
}={}){
  const points=validatePsdPoints(psdPoints,'base acceleration PSD'),Q=positive(q,'Q'),zeta=1/(2*Q),T=positive(duration,'Duration'),exponent=positive(b,'S–N exponent');
  const fns=uniqueSorted((frequencies?.length?frequencies:logspace(points[0][0],points.at(-1)[0],100)).map(Number).filter(f=>f>=points[0][0]&&f<=points.at(-1)[0]));
  if(fns.length<2)throw new Error('The oscillator frequency grid must contain at least two frequencies inside the PSD band.');
  const basis=FDS_RESPONSE_BASES[responseBasis]?responseBasis:'pseudo-velocity',method=FDS_DAMAGE_METHODS[damageMethod]?damageMethod:'narrowband',calculateRainflow=includeRainflow||method==='rainflow';
  const peakMoment=2**(exponent/2)*gamma(exponent/2+1),damage=[],narrowbandDamage=[],dirlikDamage=[],rainflowDamage=[],rmsResponse=[],cycleRate=[],peakRate=[],irregularityFactor=[],spectralM0=[],spectralM1=[],spectralM2=[],spectralM4=[],dirlikFallback=[],rainflowWindowDuration=[],rainflowCycleCount=[];
  for(const fn of fns){
    const {f,response}=sdofResponsePsd(points,fn,zeta,basis),{m0,m1,m2,m4}=spectralMoments(f,response),spectral=spectralFatigueDamageFromMoments({m0,m1,m2,m4,duration:T,b:exponent,method:method==='dirlik'?'dirlik':'narrowband'}),rainflow=calculateRainflow?synthesizedRainflowPseudoDamage({responseFrequencies:f,responsePsd:response,m0,duration:T,b:exponent,seed:rainflowSeed,sampleCount:rainflowSamples,oscillatorFrequency:fn}):null;
    const rainflowValue=rainflow?.damage??NaN,selectedDamage=method==='rainflow'?rainflowValue:method==='dirlik'?spectral.dirlikDamage:spectral.narrowbandDamage;
    rmsResponse.push(spectral.sigma);cycleRate.push(spectral.zeroCrossingRate);peakRate.push(spectral.peakRate);irregularityFactor.push(spectral.irregularityFactor);spectralM0.push(m0);spectralM1.push(m1);spectralM2.push(m2);spectralM4.push(m4);narrowbandDamage.push(spectral.narrowbandDamage);dirlikDamage.push(spectral.dirlikDamage);rainflowDamage.push(rainflowValue);dirlikFallback.push(!spectral.dirlikParameters.valid);rainflowWindowDuration.push(rainflow?.windowDuration??NaN);rainflowCycleCount.push(rainflow?.cycleCount??NaN);damage.push(selectedDamage);
  }
  const maxDamage=Math.max(...damage,Number.MIN_VALUE);
  return {frequencies:fns,damage,narrowbandDamage,dirlikDamage,rainflowDamage,relativeDamage:damage.map(value=>value/maxDamage),rmsResponse,cycleRate,zeroCrossingRate:cycleRate,peakRate,irregularityFactor,spectralM0,spectralM1,spectralM2,spectralM4,dirlikFallback,rainflowWindowDuration,rainflowCycleCount,damageMethod:method,damageMethodLabel:FDS_DAMAGE_METHODS[method].label,rainflowSeed:Math.round(n(rainflowSeed,537)),rainflowSamples:normalizeRainflowSamples(rainflowSamples),responseBasis:basis,responseLabel:FDS_RESPONSE_BASES[basis].label,responseUnit:FDS_RESPONSE_BASES[basis].unit,q:Q,zeta,duration:T,b:exponent,peakMoment};
}

function enforcePsdSlope(frequencies,levels,maxSlopeDbPerOctave){
  const slope=Math.max(0,Number(maxSlopeDbPerOctave));
  if(!(slope>0))return levels.map(level=>Math.max(level,1e-16));
  const out=levels.map(level=>Math.max(level,1e-16));
  for(let pass=0;pass<3;pass++){
    for(let i=1;i<out.length;i++){
      const maxRatio=10**((slope*Math.log2(frequencies[i]/frequencies[i-1]))/10);
      out[i]=clamp(out[i],out[i-1]/maxRatio,out[i-1]*maxRatio);
    }
    for(let i=out.length-2;i>=0;i--){
      const maxRatio=10**((slope*Math.log2(frequencies[i+1]/frequencies[i]))/10);
      out[i]=clamp(out[i],out[i+1]/maxRatio,out[i+1]*maxRatio);
    }
  }
  return out;
}

export function synthesizeDamageEquivalentPsd({
  referencePsdPoints,seedPsdPoints,referenceDuration=60,testDuration=10,q=10,b=6,frequencies,responseBasis='pseudo-velocity',damageMethod='narrowband',rainflowSeed=537,rainflowSamples=2048,objective='match',maxSlopeDbPerOctave=12,toleranceDb=.25,maxIterations=30,relaxation=.65
}={}){
  const reference=validatePsdPoints(referencePsdPoints,'reference PSD'),seed=validatePsdPoints(seedPsdPoints??referencePsdPoints,'seed PSD'),Tref=positive(referenceDuration,'Reference duration'),Ttest=positive(testDuration,'Test duration'),Q=positive(q,'Q'),exponent=positive(b,'S–N exponent');
  const commonMin=Math.max(reference[0][0],seed[0][0]),commonMax=Math.min(reference.at(-1)[0],seed.at(-1)[0]);
  if(commonMax<=commonMin)throw new Error('The target and seed PSDs do not overlap in frequency.');
  const fns=uniqueSorted((frequencies?.length?frequencies:logspace(commonMin,commonMax,100)).map(Number).filter(f=>f>=commonMin&&f<=commonMax));
  if(fns.length<2)throw new Error('At least two synthesis frequencies are required inside the common target/seed PSD band.');
  const target=fatigueDamageSpectrumState({psdPoints:reference,q:Q,duration:Tref,b:exponent,frequencies:fns,responseBasis,damageMethod,rainflowSeed,rainflowSamples});
  const seedState=fatigueDamageSpectrumState({psdPoints:seed,q:Q,duration:Ttest,b:exponent,frequencies:fns,responseBasis,damageMethod,rainflowSeed,rainflowSamples}),seedLevels=fns.map(f=>interpLogLog(seed,f));
  let levels=target.damage.map((damage,index)=>damage>0&&seedState.damage[index]>0?seedLevels[index]*(damage/seedState.damage[index])**(2/exponent):Math.max(seedLevels[index],1e-16));
  levels=enforcePsdSlope(fns,levels,maxSlopeDbPerOctave);
  const limit=Math.max(1,Math.min(100,Math.round(Number(maxIterations)||30))),tol=Math.max(.001,Number(toleranceDb)||.25),alpha=clamp(Number(relaxation)||.65,.05,1),mode=objective==='envelope'?'envelope':'match';
  let achieved,coverageDb=[],iterations=0,converged=false;
  for(let iteration=0;iteration<=limit;iteration++){
    achieved=fatigueDamageSpectrumState({psdPoints:fns.map((f,index)=>[f,levels[index]]),q:Q,duration:Ttest,b:exponent,frequencies:fns,responseBasis,damageMethod,rainflowSeed,rainflowSamples});
    coverageDb=target.damage.map((damage,index)=>damage>0?10*Math.log10(Math.max(achieved.damage[index],1e-300)/damage):0);
    const error=mode==='envelope'?Math.max(0,-Math.min(...coverageDb)):Math.max(...coverageDb.map(Math.abs));
    iterations=iteration;
    if(error<=tol){converged=true;break;}
    if(iteration===limit)break;
    levels=levels.map((level,index)=>{
      if(!(target.damage[index]>0&&achieved.damage[index]>0))return level;
      const ratio=target.damage[index]/achieved.damage[index];
      const correction=mode==='envelope'?Math.max(1,ratio):ratio;
      return clamp(level*correction**(2*alpha/exponent),1e-16,1e4);
    });
    levels=enforcePsdSlope(fns,levels,maxSlopeDbPerOctave);
  }
  const equivalentPsdPoints=fns.map((f,index)=>[f,levels[index]]),referenceLevels=fns.map(f=>interpLogLog(reference,f));
  const maxAbsErrorDb=Math.max(...coverageDb.map(Math.abs)),minimumCoverageDb=Math.min(...coverageDb),meanSquareLogError=coverageDb.reduce((sum,value)=>sum+value*value,0)/coverageDb.length;
  return {reference,seed,target,seedState,achieved,frequencies:fns,referenceLevels,seedLevels,equivalentLevels:levels,equivalentPsdPoints,coverageDb,iterations,converged,objective:mode,toleranceDb:tol,maxAbsErrorDb,minimumCoverageDb,rmsErrorDb:Math.sqrt(meanSquareLogError),referenceGrms:Math.sqrt(integrateLogLog(reference)),seedGrms:Math.sqrt(integrateLogLog(seed)),equivalentGrms:Math.sqrt(integrateLogLog(equivalentPsdPoints)),referenceDuration:Tref,testDuration:Ttest,maxSlopeDbPerOctave:Number(maxSlopeDbPerOctave),damageMethod:target.damageMethod,damageMethodLabel:target.damageMethodLabel,rainflowSeed:target.rainflowSeed,rainflowSamples:target.rainflowSamples,responseBasis:target.responseBasis,responseLabel:target.responseLabel,responseUnit:target.responseUnit};
}
function newmarkSrs(signal, dt, frequencies, zeta){
  const beta=.25,gammaN=.5;
  const pos=[],neg=[],max=[];
  for(const fn of frequencies){
    const wn=rad(fn),k=wn*wn,c=2*zeta*wn;
    const a0=1/(beta*dt*dt),a1=gammaN/(beta*dt),a2=1/(beta*dt),a3=1/(2*beta)-1,a4=gammaN/beta-1,a5=dt*(gammaN/(2*beta)-1);
    const ke=k+a0+a1*c;
    let x=0,v=0,acc=-signal[0],pmax=-Infinity,pmin=Infinity;
    for(let i=1;i<signal.length;i++){
      const p=-signal[i];
      const pe=p+(a0*x+a2*v+a3*acc)+c*(a1*x+a4*v+a5*acc);
      const xn=pe/ke;
      const an=a0*(xn-x)-a2*v-a3*acc;
      const vn=v+dt*((1-gammaN)*acc+gammaN*an);
      const absAcc=-c*vn-k*xn;
      if(absAcc>pmax)pmax=absAcc;if(absAcc<pmin)pmin=absAcc;
      x=xn;v=vn;acc=an;
    }
    pos.push(pmax/G0);neg.push(-pmin/G0);max.push(Math.max(pmax,-pmin)/G0);
  }
  return {pos,neg,max};
}
function solveLinear(A,b){
  const N=A.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let k=0;k<N;k++){
    let p=k;for(let i=k+1;i<N;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
    if(Math.abs(M[p][k])<1e-18)throw new Error('The system matrix is singular.');
    [M[k],M[p]]=[M[p],M[k]];const d=M[k][k];for(let j=k;j<=N;j++)M[k][j]/=d;
    for(let i=0;i<N;i++)if(i!==k){const q=M[i][k];for(let j=k;j<=N;j++)M[i][j]-=q*M[k][j];}
  }
  return M.map(r=>r[N]);
}
function jacobiEigen(A){
  const N=A.length,a=A.map(r=>r.slice()),V=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>i===j?1:0));
  for(let it=0;it<100*N*N;it++){
    let p=0,q=1,max=0;for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)if(Math.abs(a[i][j])>max){max=Math.abs(a[i][j]);p=i;q=j;}
    if(max<1e-12)break;
    const phi=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(phi),s=Math.sin(phi);
    const app=c*c*a[p][p]-2*s*c*a[p][q]+s*s*a[q][q],aqq=s*s*a[p][p]+2*s*c*a[p][q]+c*c*a[q][q];
    for(let k=0;k<N;k++)if(k!==p&&k!==q){const akp=a[k][p],akq=a[k][q];a[k][p]=a[p][k]=c*akp-s*akq;a[k][q]=a[q][k]=s*akp+c*akq;}
    a[p][p]=app;a[q][q]=aqq;a[p][q]=a[q][p]=0;
    for(let k=0;k<N;k++){const vkp=V[k][p],vkq=V[k][q];V[k][p]=c*vkp-s*vkq;V[k][q]=s*vkp+c*vkq;}
  }
  const pairs=a.map((r,i)=>({value:r[i],vector:V.map(row=>row[i])})).sort((x,y)=>y.value-x.value);
  return pairs;
}

const unitOptions = [
  ['m','Length · m'],['mm','Length · mm'],['in','Length · in'],['ft','Length · ft'],
  ['m/s','Velocity · m/s'],['mm/s','Velocity · mm/s'],['in/s','Velocity · in/s'],
  ['m/s2','Acceleration · m/s²'],['g','Acceleration · g'],['in/s2','Acceleration · in/s²'],
  ['N','Force · N'],['lbf','Force · lbf'],['kip','Force · kip'],
  ['Pa','Pressure · Pa'],['kPa','Pressure · kPa'],['psi','Pressure · psi'],['psf','Pressure · psf'],
  ['kg/m3','Density · kg/m³'],['lbm/ft3','Density · lbm/ft³'],
  ['N/m','Stiffness · N/m'],['lbf/in','Stiffness · lbf/in'],
  ['kg','Mass · kg'],['lbm','Mass · lbm']
].map(([value,label])=>({value,label}));
const unitMap={
  'm':['length',1],'mm':['length',1e-3],'in':['length',.0254],'ft':['length',.3048],
  'm/s':['velocity',1],'mm/s':['velocity',1e-3],'in/s':['velocity',.0254],
  'm/s2':['acceleration',1],'g':['acceleration',G0],'in/s2':['acceleration',.0254],
  'N':['force',1],'lbf':['force',4.4482216152605],'kip':['force',4448.2216152605],
  'Pa':['pressure',1],'kPa':['pressure',1000],'psi':['pressure',6894.757293168],'psf':['pressure',47.88025898],
  'kg/m3':['density',1],'lbm/ft3':['density',16.01846337],
  'N/m':['stiffness',1],'lbf/in':['stiffness',175.126835],
  'kg':['mass',1],'lbm':['mass',.45359237]
};

const extraCalculatorDefinitions = {
  'unit-converter': {
    category:'Utilities',basis:'Exact unit scale factors',confidence:'Exact to displayed constants',
    inputs:[{key:'value',label:'Value',type:'number',default:1},{key:'from',label:'From unit',type:'select',default:'g',options:unitOptions},{key:'to',label:'To unit',type:'select',default:'m/s2',options:unitOptions}],
    theory:'<p>Every supported unit is converted to a coherent SI base quantity, then converted to the requested output unit.</p>',assumptions:['Units must describe the same physical dimension.'],example:'1 g equals 9.80665 m/s² by conventional standard gravity.',
    compute(v){const a=unitMap[v.from],b=unitMap[v.to];if(!a||!b||a[0]!==b[0])throw new Error('Choose units from the same physical dimension.');const out=n(v.value)*a[1]/b[1];return{summary:[stat('Converted value',out,v.to),stat('Scale factor',a[1]/b[1],`${v.to}/${v.from}`)],interpretation:`${n(v.value)} ${v.from} = ${out} ${v.to}.`};}
  },

  'acoustic-field': {
    category:'Acoustics',basis:'Progressive plane-wave relations',confidence:'Exact within plane-wave model',
    inputs:[{key:'quantity',label:'Known quantity',type:'select',default:'spl',options:[{value:'spl',label:'Sound pressure level'},{value:'pressure',label:'RMS pressure'},{value:'intensity',label:'Active intensity'}]},{key:'value',label:'Known value',type:'number',default:100},{key:'rho',label:'Fluid density',unit:'kg/m³',type:'number',default:AIR_RHO,min:0.0001},{key:'c',label:'Sound speed',unit:'m/s',type:'number',default:AIR_C,min:0.1}],
    theory:'<p>For a progressive plane wave, I=p²/(ρc), u=p/(ρc), and Lp=20log₁₀(p/20 μPa).</p>',assumptions:['Progressive plane wave or far-field locally plane wave.','Pressure and particle velocity are in phase.'],example:'100 dB re 20 μPa corresponds to 2 Pa RMS.',
    compute(v){const rho=positive(v.rho,'Density'),c=positive(v.c,'Sound speed');let p;if(v.quantity==='spl')p=20e-6*10**(n(v.value)/20);else if(v.quantity==='pressure')p=Math.abs(n(v.value));else p=Math.sqrt(Math.max(0,n(v.value))*rho*c);const I=p*p/(rho*c),u=p/(rho*c),Lp=20*Math.log10(Math.max(p,1e-300)/20e-6);return{summary:[stat('Sound pressure level',Lp,'dB re 20 μPa'),stat('RMS pressure',p,'Pa'),stat('Particle velocity',u,'m/s'),stat('Active intensity',I,'W/m²'),stat('Characteristic impedance',rho*c,'Pa·s/m')],interpretation:`The selected field state has ${p.toPrecision(4)} Pa RMS pressure and ${I.toPrecision(4)} W/m² active intensity under a progressive-wave assumption.`,warnings:['Do not use p=ρcu in a reactive near field, standing wave, or strongly multimodal duct without checking complex impedance.']};}
  },

  isolation: {
    category:'Dynamics',basis:'Linear SDOF transmissibility',confidence:'Exact within model',
    inputs:[{key:'fn',label:'Natural frequency',unit:'Hz',type:'number',default:20,min:1e-6},{key:'zeta',label:'Damping ratio',type:'number',default:.05,min:0.000001,max:2},{key:'frequency',label:'Excitation frequency',unit:'Hz',type:'number',default:80,min:0},{key:'fmin',label:'Plot minimum',unit:'Hz',type:'number',default:1,min:1e-6},{key:'fmax',label:'Plot maximum',unit:'Hz',type:'number',default:400,min:1e-5}],
    theory:'<p>Motion transmissibility is T=√[(1+(2ζr)²)/((1−r²)²+(2ζr)²)]. Force transmissibility has the same form for a harmonically forced isolated mass.</p>',assumptions:['Linear spring and viscous damper.','Rigid foundation and single dominant isolation mode.'],example:'Isolation begins only after r exceeds √2; more damping reduces the peak but increases high-frequency transmission.',
    compute(v){const fn=positive(v.fn,'Natural frequency'),z=positive(v.zeta,'Damping'),f=Math.max(0,n(v.frequency)),fmin=positive(v.fmin,'Plot minimum'),fmax=positive(v.fmax,'Plot maximum');if(fmax<=fmin)throw new Error('Plot maximum must exceed minimum.');const T=ff=>{const r=ff/fn;return Math.sqrt((1+(2*z*r)**2)/((1-r*r)**2+(2*z*r)**2));};const fs=logspace(fmin,fmax,240),ts=fs.map(T),t=T(f);return{summary:[stat('Transmissibility',t),stat('Isolation efficiency',100*(1-t),'%',t<1?'good':'warn'),stat('Frequency ratio',f/fn),stat('Isolation threshold',Math.sqrt(2)*fn,'Hz'),stat('Resonant peak',Math.sqrt(1+4*z*z)/(2*z),'approx.')],interpretation:t<1?`At ${f} Hz, the ideal isolator transmits ${(100*t).toFixed(1)}% of the input amplitude.`:`At ${f} Hz, the system amplifies the input by ${t.toFixed(2)}×.`,plots:[{title:'SDOF motion / force transmissibility',xLabel:'Frequency (Hz)',yLabel:'Transmissibility',xScale:'log',yScale:'log',traces:[trace('T',fs,ts)]}],warnings:['Real isolators have six rigid-body modes, preload effects, nonlinear stiffness, rocking, and attachment flexibility.']};}
  },

  'two-dof': {
    category:'Dynamics',basis:'Linear viscously damped two-mass system',confidence:'Exact matrix solution for stated model',
    inputs:[{key:'m1',label:'Mass 1',unit:'kg',type:'number',default:10,min:1e-8},{key:'m2',label:'Mass 2',unit:'kg',type:'number',default:5,min:1e-8},{key:'k1',label:'Ground spring k₁',unit:'N/m',type:'number',default:1e6,min:1e-8},{key:'k2',label:'Coupling spring k₂',unit:'N/m',type:'number',default:4e5,min:1e-8},{key:'zeta',label:'Nominal element damping',type:'number',default:.02,min:0,max:1},{key:'force',label:'Force on mass 1',unit:'N peak',type:'number',default:100},{key:'fmin',label:'Plot minimum',unit:'Hz',type:'number',default:1,min:.001},{key:'fmax',label:'Plot maximum',unit:'Hz',type:'number',default:150,min:.002}],
    theory:'<p>Natural frequencies follow det(K−ω²M)=0. Harmonic response follows [K+iωC−ω²M]x=F.</p>',assumptions:['Two translational DOFs, linear springs, and viscous element damping.','Force is applied to mass 1; mass 2 has no direct force.'],example:'Weak coupling leaves one mode close to the grounded-mass resonance and one dominated by relative motion.',
    compute(v){const m1=positive(v.m1,'Mass 1'),m2=positive(v.m2,'Mass 2'),k1=positive(v.k1,'k1'),k2=positive(v.k2,'k2'),z=Math.max(0,n(v.zeta)),F=n(v.force),fmin=positive(v.fmin,'Plot minimum'),fmax=positive(v.fmax,'Plot maximum');if(fmax<=fmin)throw new Error('Plot maximum must exceed minimum.');const A=m1*m2,B=-((k1+k2)*m2+k2*m1),C=k1*k2,disc=Math.max(0,B*B-4*A*C),l1=(-B-Math.sqrt(disc))/(2*A),l2=(-B+Math.sqrt(disc))/(2*A),f1=Math.sqrt(l1)/TWO_PI,f2=Math.sqrt(l2)/TWO_PI;const r1=(k1+k2-l1*m1)/k2,r2=(k1+k2-l2*m1)/k2;const norm=x=>{const q=Math.max(1,Math.abs(x));return[1/q,x/q];};const phi1=norm(r1),phi2=norm(r2);const c1=2*z*Math.sqrt(k1*m1),mr=m1*m2/(m1+m2),c2=2*z*Math.sqrt(k2*mr);const fs=logspace(fmin,fmax,300),x1=[],x2=[];for(const f of fs){const w=rad(f);const z11=complex(k1+k2-w*w*m1,w*(c1+c2)),z22=complex(k2-w*w*m2,w*c2),z12=complex(-k2,-w*c2),det=complex(z11.re*z22.re-z11.im*z22.im-(z12.re*z12.re-z12.im*z12.im),z11.re*z22.im+z11.im*z22.re-2*z12.re*z12.im);const X1=cDiv(complex(F*z22.re,F*z22.im),det),X2=cDiv(complex(-F*z12.re,-F*z12.im),det);x1.push(cMag(X1));x2.push(cMag(X2));}return{summary:[stat('Mode 1',f1,'Hz'),stat('Mode 2',f2,'Hz'),stat('Frequency separation',f2-f1,'Hz'),stat('Mode 1 shape',`[${phi1[0].toFixed(3)}, ${phi1[1].toFixed(3)}]`),stat('Mode 2 shape',`[${phi2[0].toFixed(3)}, ${phi2[1].toFixed(3)}]`)],interpretation:`The first mode is ${phi1[1]>=0?'in-phase':'out-of-phase'}; the second is ${phi2[1]>=0?'in-phase':'out-of-phase'}. The FRFs show how each coordinate participates near both modes.`,plots:[{title:'Two-DOF displacement FRFs',xLabel:'Frequency (Hz)',yLabel:'|X/F| scaled by input force (m)',xScale:'log',yScale:'log',traces:[trace('|x₁|',fs,x1),trace('|x₂|',fs,x2)]}],tables:[{title:'Mode shapes (max normalized)',columns:['Mode','Frequency (Hz)','φ₁','φ₂'],rows:[[1,f1,...phi1],[2,f2,...phi2]]}],warnings:['Element-based damping is a convenience model; measured modal damping generally requires a modal or matrix fit.']};}
  },

  'structural-intensity': {
    category:'Structural Acoustics',basis:'Complex harmonic power',confidence:'Exact at the defined interface',
    inputs:[{key:'force_mag',label:'Force magnitude',unit:'N peak',type:'number',default:100,min:0},{key:'force_phase',label:'Force phase',unit:'deg',type:'number',default:0},{key:'velocity_mag',label:'Velocity magnitude',unit:'m/s peak',type:'number',default:.02,min:0},{key:'velocity_phase',label:'Velocity phase',unit:'deg',type:'number',default:-30},{key:'width',label:'Section width',unit:'m',type:'number',default:.5,min:1e-9}],
    theory:'<p>Average harmonic power is P=½Re{F V*}. Reactive power is ½Im{F V*}; apparent power is ½|F||V|.</p>',assumptions:['Force and velocity are conjugate variables at the same interface and frequency.','Entered magnitudes are peak, not RMS.'],example:'Force and velocity in phase produce maximum positive active power; a 90° phase difference produces zero average power.',
    compute(v){const F=polar(Math.max(0,n(v.force_mag)),n(v.force_phase)),V=polar(Math.max(0,n(v.velocity_mag)),n(v.velocity_phase)),S=cMul(F,cConj(V)),P=.5*S.re,Q=.5*S.im,A=.5*cMag(S),w=positive(v.width,'Width');return{summary:[stat('Active power',P,'W',P>=0?'good':'warn'),stat('Reactive power',Q,'var'),stat('Apparent power',A,'VA'),stat('Power factor',A?P/A:0),stat('Line intensity',P/w,'W/m')],interpretation:`The interface carries ${P>=0?'forward':'reverse'} average power of ${Math.abs(P).toPrecision(4)} W; the force–velocity phase difference is ${(n(v.force_phase)-n(v.velocity_phase)).toFixed(1)}°.`,warnings:['Full plate structural intensity can also require bending moments, rotations, shear forces, and spatial derivatives; this tool evaluates one conjugate force–velocity channel.']};}
  },

  'time-psd': {
    category:'Random & Shock',basis:'Welch one-sided PSD estimator',confidence:'Numerical estimate',
    inputs:[{key:'series',label:'Time history',unit:'s, g',type:'textarea',default:'GENERATE',help:'Paste time, acceleration rows or leave GENERATE for a deterministic sample. CSV files can be loaded with the form control.'},{key:'sample_rate',label:'Generated sample rate',unit:'Hz',type:'number',default:2048,min:32},{key:'duration',label:'Generated duration',unit:'s',type:'number',default:4,min:.1},{key:'segment_length',label:'FFT segment length',unit:'samples',type:'number',default:1024,min:16,step:1},{key:'overlap',label:'Overlap',unit:'%',type:'number',default:50,min:0,max:95},{key:'window',label:'Window',type:'select',default:'hann',options:[{value:'hann',label:'Hann'},{value:'rectangular',label:'Rectangular'}]},{key:'detrend',label:'Detrend',type:'select',default:'mean',options:[{value:'mean',label:'Remove mean'},{value:'linear',label:'Remove linear trend'},{value:'none',label:'None'}]}],
    theory:'<p>Welch estimation divides the record into overlapping, windowed segments and averages their one-sided periodograms. PSD RMS is the square root of spectral area.</p>',assumptions:['Uniform sampling and acceleration entered in g.','Aliasing was prevented before sampling.','Window normalization preserves mean-square content.'],example:'The generated record contains tones near 37 and 123 Hz plus deterministic broadband content.',
    compute(v){let t=[],a=[];if(String(v.series).trim().toUpperCase()==='GENERATE'){const fs=positive(v.sample_rate,'Sample rate'),T=positive(v.duration,'Duration'),N=Math.floor(fs*T);let seed=1234567;for(let i=0;i<N;i++){const tt=i/fs;seed=(1664525*seed+1013904223)>>>0;const noise=(seed/4294967296-.5);t.push(tt);a.push(.7*Math.sin(rad(37)*tt)+.25*Math.sin(rad(123)*tt+.7)+.12*noise+.002*tt);}}else{const rows=parsePairs(v.series,'time-history');t=rows.map(r=>r[0]);a=rows.map(r=>r[1]);}if(t.length<32)throw new Error('At least 32 samples are required.');const dts=t.slice(1).map((x,i)=>x-t[i]);const dt=dts.reduce((s,x)=>s+x,0)/dts.length;if(!(dt>0))throw new Error('Time values must increase.');const fs=1/dt,dtSpread=Math.max(...dts.map(x=>Math.abs(x-dt)))/dt;const detr=v.detrend==='none'?'none':v.detrend;const ps=welch(a,fs,n(v.segment_length,1024),n(v.overlap)/100,v.window,detr);const timeRms=rms((detr==='mean')?a.map(x=>x-a.reduce((s,q)=>s+q,0)/a.length):a),psdRms=Math.sqrt(trapz(ps.f,ps.psd));const stride=Math.max(1,Math.ceil(t.length/1500));return{summary:[stat('Sample rate',fs,'Hz'),stat('Duration',t.at(-1)-t[0],'s'),stat('Frequency resolution',ps.df,'Hz'),stat('Welch averages',ps.averages),stat('Time RMS',timeRms,'g'),stat('PSD RMS',psdRms,'g RMS'),stat('RMS closure',100*(psdRms/timeRms-1),'%')],interpretation:`The ${ps.segmentLength}-sample ${v.window} segments produce ${ps.averages} averages at ${ps.df.toFixed(3)} Hz resolution.`,warnings:[...(dtSpread>1e-3?['Sampling intervals vary by more than 0.1%; resample before relying on an FFT PSD.']:[]),...(ps.averages<4?['Fewer than four averages produces high PSD estimator variance.']:[])],plots:[{title:'Time history',xLabel:'Time (s)',yLabel:'Acceleration (g)',traces:[trace('a(t)',t.filter((_,i)=>i%stride===0),a.filter((_,i)=>i%stride===0))]},{title:'One-sided acceleration PSD',xLabel:'Frequency (Hz)',yLabel:'PSD (g²/Hz)',xScale:'log',yScale:'log',traces:[trace('PSD',ps.f.slice(1),ps.psd.slice(1))]}],csv:{filename:'welch-psd.csv',columns:['frequency_hz','psd_g2_per_hz'],rows:ps.f.map((f,i)=>[f,ps.psd[i]])}};}
  },

  'psd-combination': {
    category:'Random & Shock',basis:'Auto- and cross-spectral summation',confidence:'Exact for stated coherence model',
    inputs:[{key:'psd1',label:'PSD 1',unit:'Hz, g²/Hz',type:'textarea',default:'20, 0.004\n80, 0.004\n200, 0.015\n500, 0.015\n1000, 0.006\n2000, 0.006'},{key:'psd2',label:'PSD 2',unit:'Hz, g²/Hz',type:'textarea',default:'20, 0.001\n80, 0.003\n200, 0.003\n500, 0.008\n1000, 0.008\n2000, 0.002'},{key:'rho',label:'Real correlation coefficient',type:'number',default:0,min:-1,max:1,step:.05,help:'Uses G12 = ρ√(G1G2). ρ=0 is independent; ±1 is fully coherent in/opposite phase.'}],
    theory:'<p>G<sub>sum</sub>=G₁+G₂+2Re{G₁₂}. With a real constant correlation coefficient, G₁₂=ρ√(G₁G₂).</p>',assumptions:['Spectra describe concurrent responses of the same quantity, location, axis, resolution, and units.','A real frequency-independent correlation coefficient is an explicit simplification.'],example:'Independent source PSDs add directly. Fully coherent in-phase amplitudes produce (√G₁+√G₂)².',
    compute(v){const p1=parsePairs(v.psd1,'PSD 1'),p2=parsePairs(v.psd2,'PSD 2'),rho=clamp(n(v.rho),-1,1),fmin=Math.max(p1[0][0],p2[0][0]),fmax=Math.min(p1.at(-1)[0],p2.at(-1)[0]);if(fmax<=fmin)throw new Error('The spectra do not overlap in frequency.');const fs=logspace(fmin,fmax,300),g1=fs.map(f=>interpLogLog(p1,f)),g2=fs.map(f=>interpLogLog(p2,f)),gt=fs.map((f,i)=>Math.max(0,g1[i]+g2[i]+2*rho*Math.sqrt(g1[i]*g2[i]))),r1=Math.sqrt(trapz(fs,g1)),r2=Math.sqrt(trapz(fs,g2)),rt=Math.sqrt(trapz(fs,gt));return{summary:[stat('PSD 1 RMS',r1,'g'),stat('PSD 2 RMS',r2,'g'),stat('Combined RMS',rt,'g'),stat('Correlation coefficient',rho),stat('RMS vs independent',100*(rt/Math.sqrt(r1*r1+r2*r2)-1),'%')],interpretation:`With ρ=${rho.toFixed(2)}, the cross term changes the combined RMS to ${rt.toFixed(3)} g over ${fmin.toFixed(1)}–${fmax.toFixed(1)} Hz.`,warnings:['Do not assign a correlation coefficient to statistical envelopes or percentile curves without preserving their parent load cases and joint statistics.'],plots:[{title:'PSD combination',xLabel:'Frequency (Hz)',yLabel:'PSD (g²/Hz)',xScale:'log',yScale:'log',traces:[trace('G₁',fs,g1),trace('G₂',fs,g2),trace('G total',fs,gt,{emphasis:true})]}],csv:{filename:'combined-psd.csv',columns:['frequency_hz','psd1','psd2','combined'],rows:fs.map((f,i)=>[f,g1[i],g2[i],gt[i]])}};}
  },

  'duration-scaling': {
    category:'Random & Shock',basis:'Narrowband fatigue-damage equivalence',confidence:'Screening relation',
    inputs:[{key:'psd',label:'Reference PSD level',unit:'unit²/Hz',type:'number',default:.01,min:0},{key:'duration1',label:'Reference duration',unit:'s',type:'number',default:60,min:.001},{key:'duration2',label:'Target duration',unit:'s',type:'number',default:240,min:.001},{key:'b',label:'S–N inverse-slope exponent b',type:'number',default:6,min:.1},{key:'rms',label:'Reference RMS',unit:'response units',type:'number',default:10,min:0}],
    theory:'<p>For a narrowband Gaussian process with damage rate proportional to σᵇ, equal damage implies G₂/G₁=(T₁/T₂)<sup>2/b</sup> and σ₂/σ₁=(T₁/T₂)<sup>1/b</sup>.</p>',assumptions:['Same spectral shape, resonance distribution, bandwidth, and Gaussian narrowband statistics.','Basquin-like S–N slope and linear Miner damage.'],example:'Quadrupling duration with b=6 reduces equal-damage PSD level by 4^(−1/3), not by a factor of four.',
    compute(v){const G=Math.max(0,n(v.psd)),T1=positive(v.duration1,'Reference duration'),T2=positive(v.duration2,'Target duration'),b=positive(v.b,'S–N exponent'),r=Math.max(0,n(v.rms)),psdRatio=(T1/T2)**(2/b),rmsRatio=(T1/T2)**(1/b),durations=logspace(Math.max(.001,Math.min(T1,T2)/20),Math.max(T1,T2)*20,100),psdFactors=durations.map(duration=>(T1/duration)**(2/b)),rmsFactors=durations.map(duration=>(T1/duration)**(1/b));return{summary:[stat('Target PSD level',G*psdRatio,'unit²/Hz'),stat('PSD scale factor',psdRatio),stat('Target RMS',r*rmsRatio,'response units'),stat('RMS scale factor',rmsRatio),stat('Duration ratio',T2/T1)],interpretation:`For b=${b}, changing duration from ${T1} s to ${T2} s gives an equal-damage PSD factor of ${psdRatio.toFixed(4)}.`,warnings:['Broadband fatigue depends on spectral moments, mean stress, cycle counting, non-Gaussianity, material scatter, and stress transfer. Use this only as a stated screening approximation.'],plots:[{title:'Equal-damage scaling versus duration',xLabel:'Target duration (s)',yLabel:'Scale factor',xScale:'log',yScale:'log',traces:[trace('PSD scale factor',durations,psdFactors,{emphasis:true}),trace('RMS scale factor',durations,rmsFactors)]}]};}
  },

  'extreme-response': {
    category:'Random & Shock',basis:'Rice peak-rate approximation over VRS response',confidence:'Statistical estimate',
    inputs:[{key:'psd',label:'Base acceleration PSD',unit:'Hz, g²/Hz',type:'textarea',default:'20, 0.01\n80, 0.01\n200, 0.04\n500, 0.04\n1000, 0.01\n2000, 0.01'},{key:'q',label:'Oscillator Q',type:'number',default:10,min:.1},{key:'duration',label:'Duration',unit:'s',type:'number',default:60,min:.001},{key:'tail_probability',label:'Exceedance probability',type:'number',default:.01,min:1e-8,max:.5},{key:'points',label:'Oscillator count',type:'number',default:100,min:20,max:300,step:1}],
    theory:'<p>Each oscillator response PSD provides RMS and a characteristic peak rate. A rare-peak factor is estimated from the number of opportunities during the record.</p>',assumptions:['Stationary Gaussian response and a linear SDOF bank.','The peak-opportunity approximation is asymptotic and not a formal tolerance-limit calculation.'],example:'Longer duration increases expected maxima even when RMS response is unchanged.',
    compute(v){const p=parsePairs(v.psd,'PSD'),Q=positive(v.q,'Q'),z=1/(2*Q),T=positive(v.duration,'Duration'),prob=clamp(n(v.tail_probability),1e-8,.5),count=clamp(Math.round(n(v.points,100)),20,300),fns=logspace(Math.max(p[0][0],1),p.at(-1)[0],count),rmsV=[],peak=[],crest=[];for(const fn of fns){const {f,response}=responsePsd(p,fn,z),{m0,m2}=spectralMoments(f,response),sigma=Math.sqrt(Math.max(0,m0)),rate=m0>0?Math.sqrt(m2/m0)/TWO_PI:fn,N=Math.max(1,rate*T),cf=Math.sqrt(Math.max(1,2*Math.log(N/prob)));rmsV.push(sigma);crest.push(cf);peak.push(sigma*cf);}return{summary:[stat('Maximum RMS response',Math.max(...rmsV),'g'),stat('Maximum extreme response',Math.max(...peak),'g'),stat('Peak crest factor range',`${Math.min(...crest).toFixed(2)}–${Math.max(...crest).toFixed(2)}`),stat('Record duration',T,'s')],interpretation:`The extreme-response curve applies a duration- and bandwidth-sensitive Gaussian peak factor to each oscillator response, rather than a single fixed 3σ multiplier.`,warnings:['This is not a P95/P50 or P97.5/C50 tolerance limit. Parameter uncertainty and environment-to-environment scatter require a separate statistical model.'],plots:[{title:'RMS and estimated extreme response spectra',xLabel:'Oscillator natural frequency (Hz)',yLabel:'Acceleration response (g)',xScale:'log',yScale:'log',traces:[trace('RMS VRS',fns,rmsV),trace('Estimated extreme',fns,peak,{emphasis:true})]}],csv:{filename:'extreme-response-spectrum.csv',columns:['fn_hz','rms_g','crest_factor','estimated_peak_g'],rows:fns.map((f,i)=>[f,rmsV[i],crest[i],peak[i]])}};}
  },

  fds: {
    category:'Random & Shock',basis:'Selectable narrowband, Dirlik, or synthesized-rainflow pseudo-damage FDS with iterative damage-equivalent PSD synthesis',confidence:'Frequency-domain test-tailoring screen with explicit method and convergence evidence',
    inputs:[
      {key:'psd',label:'Flight / mission base acceleration PSD',unit:'Hz, g²/Hz',type:'textarea',group:'Flight and test environments',default:'20, 0.005\n80, 0.005\n200, 0.03\n500, 0.03\n1000, 0.008\n2000, 0.008',help:'Paste spreadsheet columns, load CSV/text, or enter one frequency and PSD breakpoint per row. Commas, tabs, spaces, and optional header rows are accepted.'},
      {key:'reference_duration',label:'Flight exposure duration',unit:'s',type:'number',group:'Flight and test environments',default:45,min:.001},
      {key:'test_psd',label:'Test base acceleration PSD',unit:'Hz, g²/Hz',type:'textarea',group:'Flight and test environments',default:'20, 0.008\n80, 0.008\n200, 0.04\n500, 0.04\n1000, 0.012\n2000, 0.012',help:'Enter the controlled test curve using the same frequency and PSD units as the flight environment.'},
      {key:'test_duration',label:'Test duration',unit:'s',type:'number',group:'Flight and test environments',default:180,min:.001},
      {key:'equivalence_direction',label:'Equivalent-damage PSD direction',type:'select',group:'Flight and test environments',default:'flight-to-test',options:[{value:'flight-to-test',label:'Flight damage represented over test duration'},{value:'test-to-flight',label:'Test severity represented over flight duration'}],help:'The default produces the lower, longer-duration test PSD whose FDS matches the shorter flight exposure. The reverse option expresses completed-test severity over the flight duration.'},
      {key:'response_basis',label:'Fatigue response basis',type:'select',group:'FDS model',default:'pseudo-velocity',options:[{value:'pseudo-velocity',label:'Pseudo velocity · conventional FDS screen'},{value:'relative-displacement',label:'Relative displacement'},{value:'absolute-acceleration',label:'Absolute acceleration · legacy screen'}]},
      {key:'q',label:'Oscillator Q',type:'number',group:'FDS model',default:10,min:.5,max:100},
      {key:'b',label:'S–N inverse-slope exponent b',type:'number',group:'FDS model',default:6,min:1,max:20},
      {key:'damage_method',label:'Damage calculation method',type:'select',group:'FDS model',default:'dirlik',options:[{value:'dirlik',label:'Dirlik · PSD-domain rainflow approximation'},{value:'narrowband',label:'Narrowband Rayleigh · conventional FDS'},{value:'rainflow',label:'Synthesized response + rainflow · deterministic cross-check'}],help:'The selected method drives the target FDS and equivalent-PSD iteration. All three methods remain visible for comparison.'},
      {key:'objective',label:'Synthesis objective',type:'select',group:'FDS model',default:'match',options:[{value:'match',label:'Match target FDS'},{value:'envelope',label:'Conservative FDS envelope'}]},
      {key:'rainflow_seed',label:'Rainflow synthesis seed',type:'number',group:'Rainflow cross-check',default:537,min:1,max:2147483647,step:1},
      {key:'rainflow_samples',label:'Samples per synthesized response window',type:'select',group:'Rainflow cross-check',default:2048,options:[{value:1024,label:'1,024 · quick'},{value:2048,label:'2,048 · balanced'},{value:4096,label:'4,096 · higher resolution'}],help:'A deterministic stationary Gaussian response window is synthesized from each oscillator response PSD, RMS-normalized, rainflow-counted, and duration-scaled.'},
      {key:'max_slope',label:'Maximum PSD slope',unit:'dB/oct',type:'number',group:'Synthesis controls',default:12,min:0,max:48},
      {key:'tolerance',label:'FDS convergence tolerance',unit:'dB',type:'number',group:'Synthesis controls',default:.25,min:.01,max:3},
      {key:'iterations',label:'Maximum synthesis iterations',type:'number',group:'Synthesis controls',default:30,min:1,max:100,step:1},
      {key:'points',label:'Oscillator / synthesis points',type:'number',group:'Synthesis controls',default:100,min:30,max:180,step:1}
    ],
    theory:'<p>The flight PSD is the default damage target. Each oscillator in the FDS bank filters the base-acceleration PSD into a response PSD, from which the spectral moments and expected event rates are calculated.</p><h3>Response PSD and spectral moments</h3><div class="equation">S<sub>r</sub>(f; f<sub>n</sub>,Q) = |H<sub>r</sub>(f; f<sub>n</sub>,Q)|<sup>2</sup> G<sub>a</sub>(f)</div><div class="equation">m<sub>j</sub>(f<sub>n</sub>) = ∫<sub>0</sub><sup>∞</sup> (2πf)<sup>j</sup> S<sub>r</sub>(f; f<sub>n</sub>) df, &nbsp; j = 0, 1, 2, 4</div><div class="equation">σ<sub>r</sub> = √m<sub>0</sub>, &nbsp; ν<sub>0</sub><sup>+</sup> = (1/2π)√(m<sub>2</sub>/m<sub>0</sub>), &nbsp; ν<sub>p</sub> = (1/2π)√(m<sub>4</sub>/m<sub>2</sub>)</div><div class="equation">α = ν<sub>0</sub><sup>+</sup>/ν<sub>p</sub> = m<sub>2</sub>/√(m<sub>0</sub>m<sub>4</sub>)</div><p>Here ν<sub>0</sub><sup>+</sup> is the positive-slope zero-crossing rate, ν<sub>p</sub> is the expected peak-occurrence rate, and α approaches one for a narrowband response.</p><h3>Narrowband Rayleigh pseudo-damage</h3><div class="equation">D*<sub>NB</sub> = T ν<sub>0</sub><sup>+</sup> 2<sup>b/2</sup> Γ(1+b/2) σ<sub>r</sub><sup>b</sup></div><h3>Dirlik spectral rainflow approximation</h3><div class="equation">x<sub>m</sub> = (m<sub>1</sub>/m<sub>0</sub>)√(m<sub>2</sub>/m<sub>4</sub>), &nbsp; Z = A/σ<sub>r</sub></div><div class="equation">D<sub>1</sub> = 2(x<sub>m</sub>−α²)/(1+α²), &nbsp; R = (α−x<sub>m</sub>−D<sub>1</sub>²)/(1−α−D<sub>1</sub>+D<sub>1</sub>²)</div><div class="equation">D<sub>2</sub> = (1−α−D<sub>1</sub>+D<sub>1</sub>²)/(1−R), &nbsp; D<sub>3</sub> = 1−D<sub>1</sub>−D<sub>2</sub></div><div class="equation">q<sub>D</sub> = 1.25(α−D<sub>3</sub>−D<sub>2</sub>R)/D<sub>1</sub></div><div class="equation">p<sub>D</sub>(Z) = (D<sub>1</sub>/q<sub>D</sub>)e<sup>−Z/q<sub>D</sub></sup> + (D<sub>2</sub>Z/R²)e<sup>−Z²/(2R²)</sup> + D<sub>3</sub>Ze<sup>−Z²/2</sup></div><div class="equation">D*<sub>D</sub> = T ν<sub>p</sub> σ<sub>r</sub><sup>b</sup>{D<sub>1</sub>q<sub>D</sub><sup>b</sup>Γ(1+b) + 2<sup>b/2</sup>Γ(1+b/2)[D<sub>2</sub>|R|<sup>b</sup>+D<sub>3</sub>]}</div><p>The Dirlik scale q<sub>D</sub> is distinct from oscillator Q. The tool uses the narrowband result as a numerical fallback if a degenerate moment combination cannot form admissible coefficients; Dirlik approaches the Rayleigh result as α→1.</p><h3>Deterministic synthesized-response rainflow</h3><div class="equation">r(t) = Σ<sub>k</sub>√[2S<sub>r</sub>(f<sub>k</sub>)Δf] cos(2πf<sub>k</sub>t+φ<sub>k</sub>)</div><div class="equation">D*<sub>RF</sub> = (T/T<sub>w</sub>) Σ<sub>i</sub> n<sub>i</sub>A<sub>i</sub><sup>b</sup></div><p>The phases φ<sub>k</sub> come from the retained deterministic seed. The representative window is RMS-normalized, closed periodically, rainflow-counted, and scaled from window duration T<sub>w</sub> to exposure T. It is synthesized evidence, not a measured time history.</p><p>All three methods use proportional damage for an S–N relation N∝A<sup>−b</sup>. The S–N intercept and any common peak-to-range convention cancel in FDS ratios.</p><h3>Equivalent-damage PSD</h3><div class="equation">G<sub>eq</sub>/G<sub>flight</sub> = (T<sub>flight</sub>/T<sub>test</sub>)<sup>2/b</sup> &nbsp; (same spectral shape)</div><div class="equation">G<sub>k+1</sub>(f<sub>n</sub>) = G<sub>k</sub>(f<sub>n</sub>) [D<sub>target</sub>(f<sub>n</sub>)/D<sub>k</sub>(f<sub>n</sub>)]<sup>2β/b</sup></div><p>The first relation proves that a longer test has a lower equal-damage PSD when shape and response transfer are unchanged. For unlike shapes, the selected damage method drives the iterative update because adjacent PSD frequencies contribute to each oscillator response; β is the relaxation factor and the slope limit is reapplied after every update.</p>',
    assumptions:['Stationary Gaussian base acceleration and linear SDOF responses over both exposures.','The narrowband option uses Rayleigh amplitudes and zero-crossing cycles; Dirlik uses its empirical four-moment rainflow-range distribution; synthesized rainflow uses a finite deterministic Gaussian response window.','All methods use a common Basquin exponent and linear Miner-type accumulation.','Flight, test, and equivalent spectra use the same oscillator Q, response basis, exponent, overlapping frequency band, and damage convention.'],
    example:'A component sees 45 s of flight vibration and is tested for 180 s. For the same spectral shape and b=6, the equal-damage test PSD factor is (45/180)^(2/6)=0.630; its GRMS factor is √0.630=0.794.',
    references:[
      {title:'Lalanne — Mechanical Vibration and Shock Analysis, Vol. 5: Specification Development',note:'Primary handbook basis for FDS construction, mission synthesis, pseudo-velocity response, and damage-equivalent test specification development.'},
      {title:'Xu et al. — Optimization of Damage Equivalent Accelerated Test Spectrum Derivation Using Multiple Non-Gaussian Vibration Data (2021)',note:'Documents initial FDS inversion, numerical recalculation, iterative PSD updating, convergence error, and ERS cross-checking.'},
      {title:'Larsen and Irvine — A Review of Spectral Methods for Variable Amplitude Fatigue Prediction and New Results (NASA, 2015)',note:'Reviews narrowband and broadband spectral fatigue estimates against time-domain rainflow results and identifies their applicability limits.'}
    ],
    compute(v){
      const flight=parsePairs(v.psd,'flight PSD'),test=parsePairs(v.test_psd,'test PSD'),Q=positive(v.q,'Q'),Tflight=positive(v.reference_duration,'Flight duration'),Ttest=positive(v.test_duration,'Test duration'),b=positive(v.b,'S–N exponent'),method=FDS_DAMAGE_METHODS[v.damage_method]?v.damage_method:'dirlik',rainflowSeed=Math.max(1,Math.round(n(v.rainflow_seed,537))),rainflowSamples=normalizeRainflowSamples(v.rainflow_samples),count=clamp(Math.round(n(v.points,100)),30,180),fmin=Math.max(flight[0][0],test[0][0]),fmax=Math.min(flight.at(-1)[0],test.at(-1)[0]);
      if(fmax<=fmin)throw new Error('The flight and test PSDs do not overlap in frequency.');
      const fns=logspace(Math.max(fmin,1e-6),fmax,count),direction=v.equivalence_direction==='test-to-flight'?'test-to-flight':'flight-to-test';
      const comparisonArgs={q:Q,b,frequencies:fns,responseBasis:v.response_basis,damageMethod:method,includeRainflow:true,rainflowSeed,rainflowSamples},flightFds=fatigueDamageSpectrumState({psdPoints:flight,duration:Tflight,...comparisonArgs}),testFds=fatigueDamageSpectrumState({psdPoints:test,duration:Ttest,...comparisonArgs});
      const testFlightRatio=testFds.damage.map((damage,index)=>damage/Math.max(flightFds.damage[index],1e-300)),testFlightDb=testFlightRatio.map(ratio=>10*Math.log10(Math.max(ratio,1e-300))),minimumTestCoverageDb=Math.min(...testFlightDb),maximumTestCoverageDb=Math.max(...testFlightDb),coveredPercent=100*testFlightRatio.filter(ratio=>ratio>=1).length/testFlightRatio.length;
      const targetPsd=direction==='test-to-flight'?test:flight,seedPsd=direction==='test-to-flight'?flight:test,targetDuration=direction==='test-to-flight'?Ttest:Tflight,equivalentDuration=direction==='test-to-flight'?Tflight:Ttest,targetName=direction==='test-to-flight'?'Test':'Flight',seedName=direction==='test-to-flight'?'Flight':'Test',equivalentName=direction==='test-to-flight'?'Test-damage-equivalent flight-duration PSD':'Flight-damage-equivalent test PSD';
      const state=synthesizeDamageEquivalentPsd({referencePsdPoints:targetPsd,seedPsdPoints:seedPsd,referenceDuration:targetDuration,testDuration:equivalentDuration,q:Q,b,frequencies:fns,responseBasis:v.response_basis,damageMethod:method,rainflowSeed,rainflowSamples,objective:v.objective,maxSlopeDbPerOctave:Math.max(0,n(v.max_slope,12)),toleranceDb:positive(v.tolerance,'Convergence tolerance'),maxIterations:clamp(Math.round(n(v.iterations,30)),1,100)}),equivalentFds=fatigueDamageSpectrumState({psdPoints:state.equivalentPsdPoints,duration:equivalentDuration,...comparisonArgs});
      const flightLevels=fns.map(f=>interpLogLog(flight,f)),testLevels=fns.map(f=>interpLogLog(test,f)),damageUnit=`(${state.responseUnit})^${b}·cycles`,flightGrms=Math.sqrt(integrateLogLog(flight)),testGrms=Math.sqrt(integrateLogLog(test)),minimumIrregularity=Math.min(...flightFds.irregularityFactor,...testFds.irregularityFactor),dirlikFallbackCount=flightFds.dirlikFallback.filter(Boolean).length+testFds.dirlikFallback.filter(Boolean).length+equivalentFds.dirlikFallback.filter(Boolean).length,alerts=[];
      if(!state.converged)alerts.push(`The synthesis stopped after ${state.iterations} iterations with ${state.maxAbsErrorDb.toFixed(2)} dB maximum FDS error; relax the slope limit, increase iterations, or review the target spectrum.`);
      if(state.minimumCoverageDb<-state.toleranceDb)alerts.push(`The achieved FDS is as much as ${Math.abs(state.minimumCoverageDb).toFixed(2)} dB below the target.`);
      if(minimumTestCoverageDb<0)alerts.push(`The test FDS falls as much as ${Math.abs(minimumTestCoverageDb).toFixed(2)} dB below the flight FDS over the common analysis band.`);
      if(method==='narrowband'&&minimumIrregularity<.9)alerts.push(`The selected narrowband model is weak where the response irregularity factor falls to ${minimumIrregularity.toFixed(3)}; compare the Dirlik and synthesized-rainflow curves.`);
      if(dirlikFallbackCount)alerts.push(`Dirlik coefficients reached their narrowband numerical fallback at ${dirlikFallbackCount} method-comparison points; inspect the method ledger before using those ordinates.`);
      if(method==='rainflow')alerts.push(`The equivalent PSD is driven by deterministic synthesized-response rainflow using seed ${rainflowSeed} and ${rainflowSamples} samples per oscillator. Repeat with another seed and higher resolution before release.`);
      if(flight[0][0]!==test[0][0]||flight.at(-1)[0]!==test.at(-1)[0])alerts.push(`The comparison and synthesized PSD are limited to the common ${fmin.toFixed(3)}–${fmax.toFixed(3)} Hz band; unmatched input bands are excluded from the displayed coverage ratio.`);
      if(state.responseBasis==='absolute-acceleration')alerts.push('Absolute acceleration is only a fatigue-driving surrogate when an inertial-force or measured stress relationship justifies it.');
      return{
        summary:[stat('Selected damage method',FDS_DAMAGE_METHODS[method].label),stat('Flight PSD RMS',flightGrms,'g'),stat('Entered test PSD RMS',testGrms,'g'),stat('Flight duration',Tflight,'s'),stat('Test duration',Ttest,'s'),stat('Minimum test / flight damage',minimumTestCoverageDb,'dB',minimumTestCoverageDb>=0?'good':'warn'),stat('Maximum test / flight damage',maximumTestCoverageDb,'dB'),stat('Oscillator frequencies with test coverage',coveredPercent,'%',coveredPercent===100?'good':'warn'),stat('Equivalent-damage PSD RMS',state.equivalentGrms,'g'),stat('Minimum irregularity factor α',minimumIrregularity,'',minimumIrregularity>=.9?'good':'warn'),stat('FDS RMS error',state.rmsErrorDb,'dB',state.converged?'good':'warn'),stat('Convergence',state.converged?'WITHIN TOLERANCE':'REVIEW REQUIRED','',state.converged?'good':'warn')],
        interpretation:`Using ${FDS_DAMAGE_METHODS[method].label.toLowerCase()}, the ${Ttest.toFixed(3)} s entered-test FDS is above or equal to the ${Tflight.toFixed(3)} s flight FDS at ${coveredPercent.toFixed(1)}% of the analyzed oscillator frequencies. The ${equivalentName.toLowerCase()} ${state.converged?'meets':'does not yet meet'} the selected ${targetName.toLowerCase()} FDS within the ${state.toleranceDb.toFixed(2)} dB ${state.objective} criterion.`,
        physicalMeaning:`The PSD plot separates what was flown, the entered test curve, and the equivalent-damage curve. With flight damage represented over a longer test duration, equal damage requires less PSD energy. The selected ${FDS_DAMAGE_METHODS[method].label.toLowerCase()} model drives the test/flight ratio and equivalent-PSD iteration: 0 dB means equal pseudo-damage, positive values mean test coverage, and negative values identify oscillator frequencies where modeled flight exposure is more damaging.`,
        engineeringConsiderations:['Use the actual test-versus-flight FDS ratio to assess qualification coverage; use the selected target-versus-achieved plot only to validate the synthesized equivalent-damage curve.','Compare narrowband, Dirlik, and synthesized-rainflow damage. Agreement supports the stationary-Gaussian spectral approximation; divergence is a sensitivity flag, not proof that one curve is measured truth.','Inspect ν₀⁺, νₚ, and α. Their separation measures response bandwidth and warns when the narrowband Rayleigh cycle model is a weak rainflow surrogate.','Convert the selected oscillator response to local stress or strain and use controlled S–N data before interpreting pseudo-damage as hardware life.','Check shaker force, displacement, velocity, control-channel limits, notching, and an extreme-response spectrum before issuing an equivalent curve as a test specification.'],
        alerts,
        limitations:['Narrowband Rayleigh is a PSD-domain approximation; Dirlik is an empirical PSD-domain rainflow-range approximation; only the synthesized option actually counts cycles, and it counts a finite artificial response record rather than measured flight data.','Synthesized-rainflow damage depends on phase seed, FFT resolution, record length, periodic closure, and duration scaling. Repeat seed and resolution studies before using it as release evidence.','The inverse is not unique; the seed curve, slope constraint, duration, response basis, and selected objective determine which equivalent PSD is returned.','The test/flight result is a spectrum of ratios, not one universal damage ratio; a hardware stress-transfer model is needed to weight the oscillator frequencies for a specific component.','A Gaussian PSD cannot reproduce non-Gaussian peaks, deterministic tones, nonstationarity, multiaxial phase relationships, mean stress, or load-sequence effects.','The pseudo-damage ordinate has no absolute life meaning without a calibrated response-to-stress transfer and an S–N intercept.'],
        validity:{regime:'Linear single-axis stationary random vibration with resonance-resolved numerical integration and a common flight/test FDS convention.',confidence:`Iterative screening result; actual coverage and achieved-versus-target error are calculated directly over ${state.frequencies.length} oscillator frequencies.`},
        presentation:{primaryEvidence:{type:'plot',index:0},primaryEvidenceStack:[{type:'plot',index:0},{type:'plot',index:1},{type:'plot',index:2},{type:'plot',index:3},{type:'plot',index:4},{type:'plot',index:5},{type:'plot',index:6}],primaryEvidenceCount:7,primaryValueCount:12},
        plots:[
          {title:'Flight, test, and FDS-derived equivalent base acceleration PSD',xLabel:'Frequency (Hz)',yLabel:'Base acceleration PSD (g²/Hz)',xScale:'log',yScale:'log',traces:[trace(`Flight · ${Tflight.toFixed(3)} s`,state.frequencies,flightLevels),trace(`Test · ${Ttest.toFixed(3)} s`,state.frequencies,testLevels),trace(`${equivalentName} · ${equivalentDuration.toFixed(3)} s`,state.frequencies,state.equivalentLevels,{emphasis:true})]},
          {title:'Flight and test fatigue damage spectra at their actual durations',xLabel:'Oscillator natural frequency (Hz)',yLabel:`Pseudo-damage index ${damageUnit}`,xScale:'log',yScale:'log',traces:[trace(`Flight FDS · ${Tflight.toFixed(3)} s`,state.frequencies,flightFds.damage),trace(`Test FDS · ${Ttest.toFixed(3)} s`,state.frequencies,testFds.damage,{emphasis:true})]},
          {title:'Test / flight fatigue-damage coverage ratio',xLabel:'Oscillator natural frequency (Hz)',yLabel:'Test damage / flight damage (dB)',xScale:'log',traces:[trace('Test / flight damage',state.frequencies,testFlightDb,{emphasis:true}),trace('Equal damage',state.frequencies,state.frequencies.map(()=>0))]},
          {title:`Selected ${targetName.toLowerCase()} target and achieved equivalent FDS`,xLabel:'Oscillator natural frequency (Hz)',yLabel:`Pseudo-damage index ${damageUnit}`,xScale:'log',yScale:'log',traces:[trace(`${targetName} target FDS`,state.frequencies,state.target.damage),trace('Equivalent PSD achieved FDS',state.frequencies,state.achieved.damage,{emphasis:true})]},
          {title:'Equivalent-PSD FDS error',xLabel:'Oscillator natural frequency (Hz)',yLabel:'Achieved / selected target damage (dB)',xScale:'log',traces:[trace('FDS error',state.frequencies,state.coverageDb,{emphasis:true}),trace('Exact match',state.frequencies,state.frequencies.map(()=>0)),trace('+ tolerance',state.frequencies,state.frequencies.map(()=>state.toleranceDb)),trace('− tolerance',state.frequencies,state.frequencies.map(()=>-state.toleranceDb))]},
          {title:'Zero-crossing and peak-occurrence rates from response spectral moments',xLabel:'Oscillator natural frequency (Hz)',yLabel:'Expected event rate (Hz)',xScale:'log',yScale:'log',traces:[trace('Flight ν₀⁺',state.frequencies,flightFds.zeroCrossingRate),trace('Flight νₚ',state.frequencies,flightFds.peakRate),trace('Test ν₀⁺',state.frequencies,testFds.zeroCrossingRate,{emphasis:true}),trace('Test νₚ',state.frequencies,testFds.peakRate)]},
          {title:'Flight damage method comparison',xLabel:'Oscillator natural frequency (Hz)',yLabel:`Pseudo-damage index ${damageUnit}`,xScale:'log',yScale:'log',traces:[trace('Narrowband Rayleigh',state.frequencies,flightFds.narrowbandDamage,{emphasis:method==='narrowband'}),trace('Dirlik spectral',state.frequencies,flightFds.dirlikDamage,{emphasis:method==='dirlik'}),trace(`Synthesized rainflow · seed ${rainflowSeed}`,state.frequencies,flightFds.rainflowDamage,{emphasis:method==='rainflow'})]}
        ],
        tables:[
          {title:'Flight, test, and synthesis verification ledger',columns:['Frequency (Hz)','Flight PSD (g²/Hz)','Test PSD (g²/Hz)','Equivalent PSD (g²/Hz)','Flight pseudo-damage','Test pseudo-damage','Test / flight damage','Test / flight (dB)','Selected target damage','Achieved equivalent damage','Equivalence error (dB)'],rows:state.frequencies.map((f,index)=>[f,flightLevels[index],testLevels[index],state.equivalentLevels[index],flightFds.damage[index],testFds.damage[index],testFlightRatio[index],testFlightDb[index],state.target.damage[index],state.achieved.damage[index],state.coverageDb[index]])},
          {title:'Damage-method comparison',columns:['Frequency (Hz)','Flight narrowband','Flight Dirlik','Flight synthesized rainflow','Test narrowband','Test Dirlik','Test synthesized rainflow','Equivalent narrowband','Equivalent Dirlik','Equivalent synthesized rainflow'],rows:state.frequencies.map((f,index)=>[f,flightFds.narrowbandDamage[index],flightFds.dirlikDamage[index],flightFds.rainflowDamage[index],testFds.narrowbandDamage[index],testFds.dirlikDamage[index],testFds.rainflowDamage[index],equivalentFds.narrowbandDamage[index],equivalentFds.dirlikDamage[index],equivalentFds.rainflowDamage[index]])},
          {title:'Response spectral moments and event rates',columns:['Frequency (Hz)','Flight m₀','Flight m₁','Flight m₂','Flight m₄','Flight ν₀⁺ (Hz)','Flight νₚ (Hz)','Flight α','Test m₀','Test m₁','Test m₂','Test m₄','Test ν₀⁺ (Hz)','Test νₚ (Hz)','Test α'],rows:state.frequencies.map((f,index)=>[f,flightFds.spectralM0[index],flightFds.spectralM1[index],flightFds.spectralM2[index],flightFds.spectralM4[index],flightFds.zeroCrossingRate[index],flightFds.peakRate[index],flightFds.irregularityFactor[index],testFds.spectralM0[index],testFds.spectralM1[index],testFds.spectralM2[index],testFds.spectralM4[index],testFds.zeroCrossingRate[index],testFds.peakRate[index],testFds.irregularityFactor[index]])},
          {title:'FDS basis ledger',columns:['Quantity','Applied basis'],rows:[['Input','Two one-sided base acceleration PSDs in g²/Hz'],['Flight duration',`${Tflight} s`],['Test duration',`${Ttest} s`],['Equivalent-damage direction',`${targetName} FDS represented over ${equivalentDuration} s, seeded by the ${seedName.toLowerCase()} PSD`],['Response quantity',`${state.responseLabel} in ${state.responseUnit}`],['Oscillator damping',`Q=${Q}; ζ=${state.target.zeta}`],['Fatigue exponent',b],['Selected damage method',FDS_DAMAGE_METHODS[method].label],['Narrowband basis','Positive-slope zero crossings from m₀,m₂ with Rayleigh amplitudes'],['Dirlik basis','Empirical rainflow-amplitude PDF from m₀,m₁,m₂,m₄ and peak rate νₚ'],['Rainflow cross-check',`Deterministic seed ${rainflowSeed}; ${rainflowSamples} samples; representative window ${flightFds.rainflowWindowDuration[0].toPrecision(5)} s`],['Bandwidth diagnostic','Peak-occurrence rate from m₂ and m₄; α=ν₀⁺/νₚ'],['Synthesis objective',state.objective],['PSD slope limit',`${state.maxSlopeDbPerOctave} dB/oct`],['Convergence tolerance',`${state.toleranceDb} dB`]]}
        ],
        csv:{filename:'flight-test-fds-equivalent-psd.csv',columns:['frequency_hz','flight_psd_g2_per_hz','test_psd_g2_per_hz','equivalent_psd_g2_per_hz','flight_pseudo_damage','test_pseudo_damage','test_over_flight_damage_ratio','test_over_flight_db','selected_target_pseudo_damage','achieved_equivalent_pseudo_damage','equivalence_error_db','flight_zero_crossing_rate_hz','flight_peak_rate_hz','flight_irregularity_factor','test_zero_crossing_rate_hz','test_peak_rate_hz','test_irregularity_factor','selected_damage_method','flight_narrowband_damage','flight_dirlik_damage','flight_synthesized_rainflow_damage','test_narrowband_damage','test_dirlik_damage','test_synthesized_rainflow_damage','equivalent_narrowband_damage','equivalent_dirlik_damage','equivalent_synthesized_rainflow_damage','flight_m0','flight_m1','flight_m2','flight_m4','test_m0','test_m1','test_m2','test_m4'],rows:state.frequencies.map((f,index)=>[f,flightLevels[index],testLevels[index],state.equivalentLevels[index],flightFds.damage[index],testFds.damage[index],testFlightRatio[index],testFlightDb[index],state.target.damage[index],state.achieved.damage[index],state.coverageDb[index],flightFds.zeroCrossingRate[index],flightFds.peakRate[index],flightFds.irregularityFactor[index],testFds.zeroCrossingRate[index],testFds.peakRate[index],testFds.irregularityFactor[index],method,flightFds.narrowbandDamage[index],flightFds.dirlikDamage[index],flightFds.rainflowDamage[index],testFds.narrowbandDamage[index],testFds.dirlikDamage[index],testFds.rainflowDamage[index],equivalentFds.narrowbandDamage[index],equivalentFds.dirlikDamage[index],equivalentFds.rainflowDamage[index],flightFds.spectralM0[index],flightFds.spectralM1[index],flightFds.spectralM2[index],flightFds.spectralM4[index],testFds.spectralM0[index],testFds.spectralM1[index],testFds.spectralM2[index],testFds.spectralM4[index]])}
      };
    }
  },

  pyroshock: {
    category:'Random & Shock',basis:'Generated decaying burst and numerical SRS',confidence:'Illustrative screening model',
    inputs:[{key:'sample_rate',label:'Sample rate',unit:'Hz',type:'number',default:100000,min:1000},{key:'duration',label:'Record duration',unit:'s',type:'number',default:.04,min:.001},{key:'peak_g',label:'Burst amplitude',unit:'g peak',type:'number',default:1000,min:0},{key:'center_frequency',label:'Burst center frequency',unit:'Hz',type:'number',default:8000,min:1},{key:'decay_time',label:'Exponential decay time',unit:'s',type:'number',default:.002,min:1e-6},{key:'q',label:'SRS Q',type:'number',default:10,min:.2},{key:'fmin',label:'SRS minimum',unit:'Hz',type:'number',default:100,min:1},{key:'fmax',label:'SRS maximum',unit:'Hz',type:'number',default:20000,min:2}],
    theory:'<p>A decaying high-frequency burst is used to demonstrate pyroshock-like time localization. The SRS is calculated by integrating the relative SDOF equations under base acceleration.</p>',assumptions:['Illustrative generated waveform—not a qualification specification.','Uniform sample rate and sufficient samples per highest SRS oscillator period.'],example:'A short high-frequency burst can have very high peak acceleration while limited low-frequency velocity content.',
    compute(v){const fs=positive(v.sample_rate,'Sample rate'),T=positive(v.duration,'Duration'),A=Math.max(0,n(v.peak_g))*G0,fc=positive(v.center_frequency,'Center frequency'),tau=positive(v.decay_time,'Decay time'),Q=positive(v.q,'Q'),fmin=positive(v.fmin,'SRS minimum'),fmax=positive(v.fmax,'SRS maximum');if(fmax<=fmin)throw new Error('SRS maximum must exceed minimum.');const N=Math.min(120000,Math.floor(fs*T)),dt=1/fs,t=Array.from({length:N},(_,i)=>i*dt),a=t.map(tt=>A*Math.exp(-tt/tau)*(Math.sin(rad(fc)*tt)+.22*Math.sin(rad(.28*fc)*tt+.4)));const fns=logspace(fmin,Math.min(fmax,.2*fs),90),s=newmarkSrs(a,dt,fns,1/(2*Q)),pv50=fns.map(f=>rad(f)*1.27/G0),stride=Math.max(1,Math.ceil(N/2000));return{summary:[stat('Generated peak',Math.max(...a.map(x=>Math.abs(x)))/G0,'g'),stat('Record sample count',N),stat('Samples / burst cycle',fs/fc),stat('SRS maximum',Math.max(...s.max),'g'),stat('SRS Q',Q)],interpretation:`The decaying ${fc.toFixed(0)} Hz burst produces a maximax SRS peak of ${Math.max(...s.max).toFixed(1)} g. Compare spectral slopes and pseudo-velocity—not only peak acceleration.`,warnings:[...(fs/fmax<10?['Fewer than ten samples per highest oscillator period; increase sample rate or reduce SRS maximum.']:[]),'Real pyroshock records require anti-alias verification, mounting checks, zero-shift screening, and specification-specific filtering.'],plots:[{title:'Generated pyroshock-like acceleration',xLabel:'Time (s)',yLabel:'Acceleration (g)',traces:[trace('a(t)',t.filter((_,i)=>i%stride===0),a.filter((_,i)=>i%stride===0).map(x=>x/G0))]},{title:'Maximax SRS with 50 ips reference',xLabel:'Natural frequency (Hz)',yLabel:'SRS acceleration (g)',xScale:'log',yScale:'log',traces:[trace('Maximax SRS',fns,s.max,{emphasis:true}),trace('50 ips reference',fns,pv50,{dash:true})]}],csv:{filename:'generated-pyroshock-srs.csv',columns:['fn_hz','positive_g','negative_g','maximax_g','50ips_g'],rows:fns.map((f,i)=>[f,s.pos[i],s.neg[i],s.max[i],pv50[i]])}};}
  },

  'panel-cavity': {
    category:'Structural Acoustics',basis:'In-vacuo ideal-edge plate and rigid-cavity mode proximity',confidence:'Exact SSSS plate frequencies or Rayleigh plate screening combined with rigid-cavity modes',
    inputs:[{key:'material',label:'Material preset',type:'select',default:'aluminum',options:materialOptions,help:'Preset values populate the editable panel properties below.'},{key:'E',label:'Young’s modulus',unit:'GPa',type:'number',default:68.9,min:.001},{key:'rho',label:'Panel density',unit:'kg/m³',type:'number',default:2700,min:.001},{key:'nu',label:'Poisson ratio',type:'number',default:.33,min:-.9,max:.49},{key:'thickness',label:'Panel thickness',unit:'mm',type:'number',default:3,min:.001},{key:'a',label:'Panel length',unit:'m',type:'number',default:1,min:.001},{key:'b',label:'Panel width',unit:'m',type:'number',default:.6,min:.001},{key:'boundary',label:'Panel edge boundary condition',type:'select',default:'simply-supported',options:plateBoundaryOptions},{key:'depth',label:'Cavity depth',unit:'m',type:'number',default:.5,min:.001},{key:'max_index',label:'Maximum modal index',type:'number',default:5,min:2,max:8,step:1},{key:'tolerance',label:'Frequency tolerance',unit:'%',type:'number',default:10,min:0}],
    syncPreset:syncPanelCavityMaterial,
    theory:'<p>Plate modal families for the selected ideal restraint are compared with rigid-wall rectangular cavity modes. Small frequency detuning is necessary but not sufficient for strong coupling; interface shape overlap and fluid loading still control the coupled response.</p>',assumptions:['Thin isotropic plate with the selected ideal edge restraint.','Rigid rectangular cavity; in-vacuo plate frequencies and no added fluid mass.'],example:'Change cavity depth or plate restraint and watch structural and acoustic modal ladders move through one another.',
    compute(v){const E=positive(v.E,'Modulus')*1e9,rho=positive(v.rho,'Density'),nu=n(v.nu),h=positive(v.thickness,'Thickness')/1000,a=positive(v.a,'Length'),b=positive(v.b,'Width'),d=positive(v.depth,'Depth'),N=clamp(Math.round(n(v.max_index,5)),2,8),tol=Math.max(0,n(v.tolerance)),D=E*h**3/(12*(1-nu*nu)),mA=rho*h,boundary=plateBoundaryPresets[v.boundary]?v.boundary:'simply-supported',boundaryCode=plateBoundaryPresets[boundary].code,sm=[],am=[];for(let m=1;m<=N;m++)for(let q=1;q<=N;q++){const f=plateModalFrequency({boundary,m,n:q,a,b,D,surfaceMass:mA,poisson:nu});sm.push({id:`P(${m},${q})`,f,m,q});}for(let nx=0;nx<=N;nx++)for(let ny=0;ny<=N;ny++)for(let nz=0;nz<=N;nz++){if(nx+ny+nz===0)continue;const f=AIR_C/2*Math.sqrt((nx/a)**2+(ny/b)**2+(nz/d)**2);am.push({id:`A(${nx},${ny},${nz})`,f,nx,ny,nz});}sm.sort((x,y)=>x.f-y.f);am.sort((x,y)=>x.f-y.f);const pairs=[];for(const s of sm)for(const aa of am){const det=100*Math.abs(s.f-aa.f)/((s.f+aa.f)/2);if(det<=tol)pairs.push([s.id,s.f,aa.id,aa.f,det]);}pairs.sort((x,y)=>x[4]-y[4]);const shownPlate=sm.slice(0,Math.min(30,sm.length)),shownCavity=am.slice(0,Math.min(30,am.length));return{summary:[stat('Plate modes',sm.length),stat('Cavity modes',am.length),stat('Pairs within tolerance',pairs.length),stat('Closest detuning',pairs.length?pairs[0][4]:NaN,'%')],interpretation:{summary:pairs.length?`${pairs[0][0]} and ${pairs[0][2]} are the closest ${boundaryCode} plate/cavity pair at ${pairs[0][4].toFixed(2)}% detuning.`:`No ${boundaryCode} plate/cavity pairs fall inside the selected tolerance.`,physicalMeaning:'The primary plot places structural and acoustic natural frequencies on one horizontal scale. Close markers identify opportunities for coupling, but frequency coincidence alone does not show whether the pressure and displacement shapes perform net work across the interface.'},warnings:['Frequency proximity alone does not establish coupling strength. Compute interface modal overlap and include fluid loading in a coupled model.',...(boundaryCode==='SSSS'?[]:[`${boundaryCode} plate frequencies use Rayleigh trial shapes and should be confirmed when boundary accuracy controls the decision.`])],plots:[{title:`${boundaryCode} plate and rigid-cavity modal proximity`,xLabel:'Frequency (Hz)',yLabel:'Mode family (1 cavity · 2 plate)',xScale:'log',yMin:.7,yMax:2.3,traces:[trace('Plate modes',shownPlate.map(mode=>mode.f),shownPlate.map(()=>2),{showPoints:true,hideLine:true,pointRadius:4,pointLabels:shownPlate.map(mode=>mode.id)}),trace('Cavity modes',shownCavity.map(mode=>mode.f),shownCavity.map(()=>1),{showPoints:true,hideLine:true,pointRadius:4,pointLabels:shownCavity.map(mode=>mode.id)})]}],tables:[{title:'Near-frequency mode pairs',columns:['Plate mode','Plate f (Hz)','Cavity mode','Cavity f (Hz)','Detuning (%)'],rows:pairs.slice(0,100)}],presentation:{primaryEvidence:{type:'plot',index:0},primaryValueCount:4}};}
  },

  'fsp-generator': {
    category:'Aero / Distributed Loads',basis:'Hermitian convective exponential CSD eigendecomposition',confidence:'Model-based spatial patterns',
    inputs:[{key:'sensors',label:'Grid points',type:'number',default:12,min:3,max:30,step:1},{key:'spacing',label:'Point spacing',unit:'m',type:'number',default:.08,min:.0001},{key:'frequency',label:'Frequency',unit:'Hz',type:'number',default:500,min:.01},{key:'convection',label:'Convection velocity',unit:'m/s',type:'number',default:200,min:.01},{key:'correlation_length',label:'Coherence e-fold length',unit:'m',type:'number',default:.25,min:.0001},{key:'patterns',label:'Patterns to display',type:'number',default:4,min:1,max:8,step:1}],
    theory:'<p>A convecting CSD kernel Γᵢⱼ=e<sup>−|xᵢ−xⱼ|/Lc</sup>e<sup>−ikc(xᵢ−xⱼ)</sup> is Hermitian. A diagonal phase transform reduces its eigenvalue problem to the real exponential kernel.</p>',assumptions:['One-dimensional uniform field, constant convection speed, and exponential coherence.','Patterns are unit-normalized; scale by the pressure auto PSD before force mapping.'],example:'Short correlation length creates more energetic independent patterns; long correlation length concentrates energy in the first pattern.',
    compute(v){const N=clamp(Math.round(n(v.sensors,12)),3,30),dx=positive(v.spacing,'Spacing'),f=positive(v.frequency,'Frequency'),Uc=positive(v.convection,'Convection velocity'),Lc=positive(v.correlation_length,'Correlation length'),K=clamp(Math.round(n(v.patterns,4)),1,8),x=Array.from({length:N},(_,i)=>i*dx),R=x.map(xi=>x.map(xj=>Math.exp(-Math.abs(xi-xj)/Lc))),eig=jacobiEigen(R),vals=eig.map(e=>Math.max(0,e.value)),total=vals.reduce((s,q)=>s+q,0),traces=[];for(let k=0;k<Math.min(K,N);k++){const vec=eig[k].vector,ph=x.map(xx=>-rad(f)*xx/Uc),real=vec.map((q,i)=>q*Math.cos(ph[i]));traces.push(trace(`FSP ${k+1} (${(100*vals[k]/total).toFixed(1)}%)`,x,real));}const cumulative=vals.reduce((arr,q,i)=>{arr.push((arr[i-1]||0)+q/total);return arr;},[]);return{summary:[stat('First-pattern energy',100*vals[0]/total,'%'),stat('Patterns for 90%',cumulative.findIndex(q=>q>=.9)+1),stat('Convective wavelength',Uc/f,'m'),stat('Array aperture',x.at(-1),'m'),stat('Matrix minimum eigenvalue',Math.min(...vals))],interpretation:`The first ${Math.min(K,N)} patterns represent ${(100*cumulative[Math.min(K,N)-1]).toFixed(1)}% of the model CSD trace. Their spatial phase advances with convection velocity ${Uc} m/s.`,warnings:['A real structural FSP workflow must include surface integration, element areas, coordinate transforms, pressure autospectra, frequency-by-frequency patterns, and truncation error checks.'],heatmaps:[{title:'Coherence-magnitude kernel',matrix:R,labels:x.map(q=>q.toFixed(2))}],plots:[{title:'Leading convective force spatial patterns',xLabel:'Position (m)',yLabel:'Unit pattern amplitude at t=0',traces}],tables:[{title:'Pattern energy fractions',columns:['Pattern','Eigenvalue','Fraction','Cumulative'],rows:vals.map((q,i)=>[i+1,q,q/total,cumulative[i]]).slice(0,Math.min(N,12))}]};}
  },

  'vibroacoustic-scaling': {
    category:'Aero / Distributed Loads',basis:'Explicit power-law, level, and duration factors',confidence:'Exact stated arithmetic; empirical exponents are user supplied',
    inputs:[{key:'spectrum',label:'Reference spectrum',unit:'Hz, PSD',type:'textarea',default:'20, 0.004\n80, 0.004\n200, 0.02\n500, 0.02\n1000, 0.008\n2000, 0.008'},{key:'q1',label:'Reference dynamic pressure',unit:'Pa',type:'number',default:20000,min:.001},{key:'q2',label:'Target dynamic pressure',unit:'Pa',type:'number',default:30000,min:.001},{key:'exponent',label:'PSD power-law exponent',type:'number',default:2,step:.1},{key:'level_delta',label:'Additional spectrum level change',unit:'dB',type:'number',default:0,step:.1},{key:'duration1',label:'Reference duration',unit:'s',type:'number',default:60,min:.001},{key:'duration2',label:'Target duration',unit:'s',type:'number',default:60,min:.001},{key:'fatigue_b',label:'Equal-damage S–N exponent',type:'number',default:6,min:.1},{key:'apply_duration',label:'Duration handling',type:'select',default:'none',options:[{value:'none',label:'Do not alter level'},{value:'damage',label:'Apply narrowband equal-damage scaling'}]}],
    theory:'<p>The target PSD is G₂=G₁(q₂/q₁)ᵐ10<sup>ΔL/10</sup>. Optional equal-damage duration scaling multiplies by (T₁/T₂)<sup>2/b</sup>.</p>',assumptions:['Spectral shape is preserved.','The user-supplied exponent is appropriate to the source, response, and flight regime.','Optional duration scaling uses a narrowband fatigue approximation.'],example:'A pressure-amplitude response proportional to q produces a PSD proportional to q².',
    compute(v){const p=parsePairs(v.spectrum,'spectrum'),q1=positive(v.q1,'Reference q'),q2=positive(v.q2,'Target q'),m=n(v.exponent),dL=n(v.level_delta),T1=positive(v.duration1,'Reference duration'),T2=positive(v.duration2,'Target duration'),b=positive(v.fatigue_b,'S–N exponent'),qFactor=(q2/q1)**m,levelFactor=fromDb10(dL),durationFactor=v.apply_duration==='damage'?(T1/T2)**(2/b):1,factor=qFactor*levelFactor*durationFactor,target=p.map(([f,g])=>[f,g*factor]),r1=Math.sqrt(integrateLogLog(p)),r2=Math.sqrt(integrateLogLog(target));return{summary:[stat('Total PSD factor',factor),stat('Dynamic-pressure factor',qFactor),stat('Level factor',levelFactor),stat('Duration factor',durationFactor),stat('Reference RMS',r1),stat('Target RMS',r2),stat('RMS ratio',r2/r1)],interpretation:`The stated assumptions scale the reference PSD by ${factor.toFixed(4)} (${db10(factor).toFixed(2)} dB), changing RMS by ${(Math.sqrt(factor)).toFixed(4)}×.`,warnings:['This tool intentionally does not label the result as a named empirical method. Program-specific Franken, Barrett, or other scaling implementations must be verified against their controlled source equations and conventions.'],plots:[{title:'Reference and scaled spectrum',xLabel:'Frequency (Hz)',yLabel:'PSD',xScale:'log',yScale:'log',traces:[trace('Reference',p.map(r=>r[0]),p.map(r=>r[1])),trace('Target',target.map(r=>r[0]),target.map(r=>r[1]),{emphasis:true})]}],csv:{filename:'scaled-vibroacoustic-spectrum.csv',columns:['frequency_hz','reference_psd','target_psd'],rows:p.map((r,i)=>[r[0],r[1],target[i][1]])}};}
  },

  'multi-subsystem-sea': {
    category:'SEA & Energy',basis:'Three-subsystem reciprocal SEA power balance',confidence:'Exact linear solution for stated parameters',
    inputs:[{key:'frequency',label:'Band center frequency',unit:'Hz',type:'number',default:1000,min:.01},{key:'eta1',label:'ILF subsystem 1',type:'number',default:.03,min:.000001},{key:'eta2',label:'ILF subsystem 2',type:'number',default:.02,min:.000001},{key:'eta3',label:'ILF subsystem 3',type:'number',default:.05,min:.000001},{key:'n1',label:'Modal density n₁',unit:'modes/Hz',type:'number',default:.08,min:.000001},{key:'n2',label:'Modal density n₂',unit:'modes/Hz',type:'number',default:.15,min:.000001},{key:'n3',label:'Modal density n₃',unit:'modes/Hz',type:'number',default:.25,min:.000001},{key:'eta12',label:'CLF η₁₂',type:'number',default:.01,min:0},{key:'eta13',label:'CLF η₁₃',type:'number',default:.002,min:0},{key:'eta23',label:'CLF η₂₃',type:'number',default:.008,min:0},{key:'P1',label:'Input power 1',unit:'W',type:'number',default:1,min:0},{key:'P2',label:'Input power 2',unit:'W',type:'number',default:0,min:0},{key:'P3',label:'Input power 3',unit:'W',type:'number',default:0,min:0}],
    theory:'<p>At steady state, input power equals internal dissipation plus net coupling flow. Reverse CLFs follow reciprocity nᵢηᵢⱼ=nⱼηⱼᵢ.</p>',assumptions:['Diffuse subsystem fields, weak coupling, linear steady-state response, and valid band modal populations.','Entered modal densities and loss factors use consistent units and conventions.'],example:'Increasing subsystem 3 internal loss can reduce all energies when it acts as an efficient energy sink.',
    compute(v){const f=positive(v.frequency,'Frequency'),w=rad(f),eta=[positive(v.eta1,'eta1'),positive(v.eta2,'eta2'),positive(v.eta3,'eta3')],dens=[positive(v.n1,'n1'),positive(v.n2,'n2'),positive(v.n3,'n3')],P=[Math.max(0,n(v.P1)),Math.max(0,n(v.P2)),Math.max(0,n(v.P3))],clf=Array.from({length:3},()=>[0,0,0]);clf[0][1]=Math.max(0,n(v.eta12));clf[0][2]=Math.max(0,n(v.eta13));clf[1][2]=Math.max(0,n(v.eta23));clf[1][0]=dens[0]*clf[0][1]/dens[1];clf[2][0]=dens[0]*clf[0][2]/dens[2];clf[2][1]=dens[1]*clf[1][2]/dens[2];const A=Array.from({length:3},()=>[0,0,0]);for(let i=0;i<3;i++){A[i][i]=w*(eta[i]+clf[i].reduce((s,q)=>s+q,0));for(let j=0;j<3;j++)if(i!==j)A[i][j]=-w*clf[j][i];}const E=solveLinear(A,P),modal=E.map((q,i)=>q/dens[i]),diss=E.map((q,i)=>w*eta[i]*q),flows=[];for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const net=w*(clf[i][j]*E[i]-clf[j][i]*E[j]);flows.push([`${i+1} → ${j+1}`,net]);}const balance=diss.reduce((s,q)=>s+q,0);return{summary:[stat('Energy E₁',E[0],'J'),stat('Energy E₂',E[1],'J'),stat('Energy E₃',E[2],'J'),stat('Input power',P.reduce((s,q)=>s+q,0),'W'),stat('Dissipated power',balance,'W'),stat('Power balance error',100*(balance/P.reduce((s,q)=>s+q,0)-1),'%')],interpretation:`Subsystem ${modal.indexOf(Math.max(...modal))+1} has the highest modal energy. Net coupling flows are positive in the listed arrow direction.`,warnings:['Check modes per band and modal overlap before interpreting SEA energy as a smooth physical response. Deterministic joints can violate weak-coupling assumptions.'],tables:[{title:'Subsystem energy balance',columns:['Subsystem','Energy (J)','Modal energy (J·Hz/mode)','Internal dissipation (W)'],rows:E.map((q,i)=>[i+1,q,modal[i],diss[i]])},{title:'Net coupling power',columns:['Direction','Net power (W)'],rows:flows}]};}
  },

  'honeycomb-wave': {
    category:'SEA & Energy',basis:'TR 12-007 shear-deformable honeycomb sandwich-panel equations 1–6',confidence:'Analytic within the equivalent-property panel model',
    inputs:[
      {key:'panel_preset',label:'Panel definition',type:'select',default:'panel1',options:[{value:'panel1',label:'TR 12-007 panel 1'},{value:'panel2',label:'TR 12-007 panel 2'},{value:'custom',label:'Custom equivalent panel'}]},
      {key:'frequency',label:'Evaluation frequency',unit:'Hz',type:'number',default:1000,min:1},
      {key:'loss_factor',label:'Panel loss factor η',type:'number',default:.01,min:.000001,max:1},
      {key:'fmin',label:'Plot minimum',unit:'Hz',type:'number',default:100,min:1},
      {key:'fmax',label:'Plot maximum',unit:'Hz',type:'number',default:10000,min:2},
      {key:'panel_length',label:'Custom panel length',unit:'m',type:'number',default:2.13,min:.001},
      {key:'panel_width',label:'Custom panel width',unit:'m',type:'number',default:1.22,min:.001},
      {key:'panel_mass',label:'Custom total mass',unit:'kg',type:'number',default:30.5,min:.001},
      {key:'face_modulus_gpa',label:'Custom facesheet modulus',unit:'GPa',type:'number',default:47.6,min:.001},
      {key:'face_poisson',label:'Custom facesheet Poisson ratio',type:'number',default:.30,min:-.9,max:.49},
      {key:'face_thickness_mm',label:'Custom one-side facesheet thickness',unit:'mm',type:'number',default:2.30,min:.001},
      {key:'core_thickness_mm',label:'Custom core thickness',unit:'mm',type:'number',default:25.4,min:.001},
      {key:'core_shear_mpa',label:'Custom core shear modulus',unit:'MPa',type:'number',default:588,min:.001},
      {key:'doubler_length_mm',label:'Custom doubler length at each end',unit:'mm',type:'number',default:305,min:0},
      {key:'doubler_mass',label:'Custom total doubler mass',unit:'kg',type:'number',default:2.7,min:0}
    ],
    theory:'<p>The effective bending-wave speed combines facesheet flexural rigidity and core transverse-shear rigidity. Modal density and infinite-panel conductance then follow from the actual dispersive speed rather than a thin-plate substitution.</p>',
    assumptions:['Flat equivalent sandwich panel with symmetric facesheets and a frequency-independent equivalent core shear modulus.','Surface mass includes doublers, but the wave model smears their mass over the panel.','Only the flexural/shear wave family is represented; in-plane waves and detailed orthotropy are omitted.'],
    example:'The report presets reproduce coincidence near 300 Hz and approximately six modes per one-third-octave band near 1 kHz.',
    compute(v){
      const panel=honeycombPanelFromValues(v),f=positive(v.frequency,'Frequency'),eta=positive(v.loss_factor,'Loss factor'),fmin=positive(v.fmin,'Plot minimum'),fmax=positive(v.fmax,'Plot maximum');
      if(fmax<=fmin)throw new Error('Plot maximum must exceed plot minimum.');
      const state=honeycombWaveState(panel,f,eta),fc=honeycombCoincidenceFrequency(panel),series=honeycombFrequencySeries(panel,fmin,fmax,180,eta),fs=series.frequencies,states=series.states;
      const seaRegime=state.modesThirdOctave>=6&&state.modalOverlap>=1?'Modally rich and overlapping':state.modesThirdOctave>=6?'Adequate band population; limited overlap':state.modesThirdOctave>=3?'Transition region':'Sparse modal population';
      const measured=(HONEYCOMB_MODE_DATA[panel.id]||[]).map(row=>{const predicted=honeycombWaveState(panel,row[2],eta).effectiveSpeed;return[row[0],row[1],row[2],row[6],predicted,100*(predicted/row[6]-1)];});
      return{
        summary:[stat('Effective wave speed',state.effectiveSpeed,'m/s'),stat('Pure-bending speed',state.bendingSpeed,'m/s'),stat('Core-shear speed',state.shearSpeed,'m/s'),stat('Coincidence frequency',fc,'Hz'),stat('Modal density',state.modalDensity,'modes/Hz'),stat('Modes in one-third octave',state.modesThirdOctave,'modes',state.modesThirdOctave<6?'warn':'good'),stat('Modal overlap',state.modalOverlap,'',state.modalOverlap<1?'warn':'good'),stat('Infinite-panel conductance',state.conductance,'s/kg')],
        interpretation:`At ${f.toFixed(0)} Hz, ${panel.name||'the panel'} has ${state.modesThirdOctave.toFixed(1)} predicted bending modes in a one-third-octave band and ${state.modalOverlap.toFixed(2)} modal overlap: ${seaRegime.toLowerCase()}.`,
        warnings:[...(state.modesThirdOctave<6?['The report used roughly six modes per one-third-octave band as a practical SEA population threshold.']:[]),...(state.modalOverlap<1?['Modal bandwidth remains smaller than average spacing; smooth statistical response is not guaranteed.']:[]),Math.abs(state.thinPlateError)>10?`Thin-plate modal density differs by ${Math.abs(state.thinPlateError).toFixed(1)}% at the evaluation frequency.`:'Check local orthotropy and doubler-induced stiffness before design use.'],
        plots:[
          {title:'Honeycomb sandwich-panel wave speeds',xLabel:'Frequency (Hz)',yLabel:'Wave speed (m/s)',xScale:'log',traces:[trace('Effective',fs,states.map(q=>q.effectiveSpeed),{emphasis:true}),trace('Pure bending',fs,states.map(q=>q.bendingSpeed)),trace('Core shear',fs,states.map(q=>q.shearSpeed)),trace('Sound speed',fs,fs.map(()=>343),{dash:true})]},
          {title:'SEA readiness indicators',xLabel:'Frequency (Hz)',yLabel:'Count / overlap',xScale:'log',yScale:'log',traces:[trace('Modes per third octave',fs,states.map(q=>q.modesThirdOctave)),trace('Modal overlap',fs,states.map(q=>Math.max(q.modalOverlap,1e-6))),trace('Six modes / band',fs,fs.map(()=>6),{dash:true}),trace('Overlap = 1',fs,fs.map(()=>1),{dash:true})]}
        ],
        tables:[{title:'Measured modal-wave-speed cross-check from TR 12-007 Table 2',columns:['m','n','Measured f (Hz)','Measured cb (m/s)','Model ceff (m/s)','Difference (%)'],rows:measured}],
        csv:{filename:'honeycomb-wave-readiness.csv',columns:['frequency_hz','effective_speed_mps','bending_speed_mps','shear_speed_mps','wavenumber_rad_per_m','modal_density_modes_per_hz','modes_per_third_octave','modal_overlap','conductance_s_per_kg'],rows:states.map(q=>[q.frequency,q.effectiveSpeed,q.bendingSpeed,q.shearSpeed,q.wavenumber,q.modalDensity,q.modesThirdOctave,q.modalOverlap,q.conductance])}
      };
    }
  },

  'clf-identification-uncertainty': {
    category:'SEA & Energy',basis:'Two-test SEA power-injection inversion with reproducible Monte Carlo measurement uncertainty',confidence:'Exact forward/inverse model; statistical intervals reflect the entered uncertainty model',
    inputs:[
      {key:'frequency',label:'Band center frequency',unit:'Hz',type:'number',default:1000,min:.01},
      {key:'n1',label:'Subsystem 1 modal density',unit:'modes/Hz',type:'number',default:.028,min:1e-8},
      {key:'n2',label:'Subsystem 2 modal density',unit:'modes/Hz',type:'number',default:.025,min:1e-8},
      {key:'eta1',label:'True internal loss factor η₁',type:'number',default:.012,min:1e-7},
      {key:'eta2',label:'True internal loss factor η₂',type:'number',default:.014,min:1e-7},
      {key:'eta12',label:'True forward CLF η₁₂',type:'number',default:.004,min:0},
      {key:'P1',label:'Drive-1 input power',unit:'W',type:'number',default:.0001,min:1e-20},
      {key:'P2',label:'Drive-2 input power',unit:'W',type:'number',default:.0001,min:1e-20},
      {key:'energyUncertainty',label:'Energy random uncertainty',unit:'% 1σ',type:'number',default:10,min:0,max:80},
      {key:'powerUncertainty',label:'Input-power random uncertainty',unit:'% 1σ',type:'number',default:3,min:0,max:80},
      {key:'energyBias1',label:'Subsystem 1 energy bias',unit:'%',type:'number',default:0,min:-90,max:200},
      {key:'energyBias2',label:'Subsystem 2 energy bias',unit:'%',type:'number',default:0,min:-90,max:200},
      {key:'trials',label:'Monte Carlo trials',type:'number',default:1200,min:20,max:5000,step:20},
      {key:'seed',label:'Reproducible random seed',type:'number',default:12007,step:1}
    ],
    theory:'<p>The forward model generates the four energies from known ILFs and reciprocal CLFs. Each virtual test perturbs energy and input-power measurements, then repeats the complete power-injection inversion. The resulting distribution reveals variance, bias, negative-loss-factor risk, and reciprocity error.</p>',
    assumptions:['Measurement errors are independent lognormal multipliers with the entered one-sigma percentages.','Systematic energy bias is common to both drive cases for each receiving subsystem.','The true system is linear, passive, reciprocal, steady state, and adequately described by two SEA subsystems.','Modal densities are treated as exact; add their uncertainty separately in a project analysis.'],
    example:'Increase energy uncertainty toward 30% or impose unequal subsystem bias to see CLF intervals widen, negative ILFs appear, and reciprocity move away from unity.',
    compute(v){
      const study=clfIdentificationUncertainty(v),truth=study.truth,stats=study.statistics,truthValues={eta1:truth.eta1,eta12:truth.eta12,eta21:truth.eta21,eta2:truth.eta2},labels={eta1:'Internal η₁',eta12:'Forward CLF η₁₂',eta21:'Reverse CLF η₂₁',eta2:'Internal η₂'};
      const rows=['eta1','eta12','eta21','eta2'].map(key=>[labels[key],truthValues[key],stats[key].median,stats[key].p05,stats[key].p95,100*stats[key].standardDeviation/Math.max(Math.abs(stats[key].mean),1e-30),100*stats[key].negativeProbability]);
      const hist12=histogram(study.samples.map(sample=>sample.eta12),30),hist21=histogram(study.samples.map(sample=>sample.eta21),30),warnings=[];
      if(study.anyNegativeProbability>.001)warnings.push(`${(100*study.anyNegativeProbability).toFixed(1)}% of trials produced at least one negative inferred loss factor. Negative values are diagnostics, not physical damping or coupling.`);
      if(stats.eta12.standardDeviation/Math.max(Math.abs(stats.eta12.mean),1e-30)>.2)warnings.push('Forward-CLF relative uncertainty exceeds 20%; improve energy averaging, input-power measurement, or excitation separation before using a single best estimate.');
      if(Math.abs(stats.reciprocityRatio.median-1)>.1)warnings.push('The median reciprocity ratio differs from unity by more than 10%; unequal subsystem energy bias is a likely cause in this virtual experiment.');
      if(Math.abs(study.energyBias1)>0||Math.abs(study.energyBias2)>0)warnings.push('A systematic spatial-energy bias shifts the CLF median and is not removed by more Monte Carlo trials.');
      if(stats.separation.median<.15)warnings.push('The median energy-matrix separation is low; the two drive cases are too similar for a robust inversion.');
      warnings.push('These intervals describe the entered uncertainty model only; calibration correlation, modal-density error, nonstationarity, and subsystem-model error require separate treatment.');
      return{
        summary:[stat('Median forward CLF η₁₂',stats.eta12.median),stat('η₁₂ 90% interval',`${stats.eta12.p05.toExponential(2)} – ${stats.eta12.p95.toExponential(2)}`),stat('Median reverse CLF η₂₁',stats.eta21.median),stat('Median reciprocity ratio',stats.reciprocityRatio.median,'',Math.abs(stats.reciprocityRatio.median-1)>.1?'warn':'good'),stat('Any-negative probability',100*study.anyNegativeProbability,'%',study.anyNegativeProbability>.01?'warn':''),stat('Median matrix separation',stats.separation.median,'',stats.separation.median<.15?'warn':'good')],
        interpretation:`Across ${study.trials} virtual power-injection tests, the median η₁₂ is ${stats.eta12.median.toExponential(3)} versus the true ${truth.eta12.toExponential(3)}. The 90% interval is [${stats.eta12.p05.toExponential(3)}, ${stats.eta12.p95.toExponential(3)}], while the median modal-density-weighted reciprocity ratio is ${stats.reciprocityRatio.median.toFixed(3)}.`,
        warnings,
        plots:[{title:'Identified directional CLF distributions',xLabel:'Coupling loss factor',yLabel:'Trial count',traces:[trace('η₁₂ trials',hist12.centers,hist12.counts),trace('η₂₁ trials',hist21.centers,hist21.counts)]}],
        tables:[{title:'True and identified loss-factor statistics',columns:['Term','True','Median','5th percentile','95th percentile','Relative σ (%)','Negative trials (%)'],rows},{title:'True virtual-test energy matrix',columns:['Receiving subsystem','Drive 1 energy (J)','Drive 2 energy (J)'],rows:[['Subsystem 1',truth.E11,truth.E12],['Subsystem 2',truth.E21,truth.E22]]}],
        csv:{filename:'clf-identification-monte-carlo.csv',columns:['trial','eta1','eta12','eta21','eta2','matrix_separation','reciprocity_ratio'],rows:study.samples.map((sample,index)=>[index+1,sample.eta1,sample.eta12,sample.eta21,sample.eta2,sample.separation,sample.reciprocityRatio])}
      };
    }
  },

  'experimental-sea': {
    category:'SEA & Energy',basis:'Full two-subsystem power-injection inversion from TR 12-007 equations 23–27',confidence:'Exact algebra; measurement conditioning controls practical confidence',
    inputs:[
      {key:'frequency',label:'Band center frequency',unit:'Hz',type:'number',default:1000,min:.01},
      {key:'P1',label:'Input-power transfer for drive 1',unit:'W/N²',type:'number',default:.0001,min:1e-20},
      {key:'P2',label:'Input-power transfer for drive 2',unit:'W/N²',type:'number',default:.0001,min:1e-20},
      {key:'E11',label:'E₁₁: panel 1 energy / drive 1 force²',unit:'J/N²',type:'number',default:1.064768985e-6,min:1e-20},
      {key:'E21',label:'E₂₁: panel 2 energy / drive 1 force²',unit:'J/N²',type:'number',default:2.241618917e-7,min:1e-20},
      {key:'E12',label:'E₁₂: panel 1 energy / drive 2 force²',unit:'J/N²',type:'number',default:2.802023646e-7,min:1e-20},
      {key:'E22',label:'E₂₂: panel 2 energy / drive 2 force²',unit:'J/N²',type:'number',default:8.966475667e-7,min:1e-20},
      {key:'n1',label:'Panel 1 modal density',unit:'modes/Hz',type:'number',default:.028,min:1e-8},
      {key:'n2',label:'Panel 2 modal density',unit:'modes/Hz',type:'number',default:.025,min:1e-8}
    ],
    theory:'<p>Two reciprocal power-injection experiments provide four energy equations. Inverting the complete 4×4 system identifies both internal loss factors and both directional coupling loss factors without substituting the free-panel damping.</p>',
    assumptions:['Steady-state band energies and input powers are normalized consistently by force squared.','Each panel is a valid SEA subsystem for the selected band.','The four energy terms represent the same test configuration and bandwidth.'],
    example:'The default data are generated from η11=0.012, η12=0.004, η21=0.005, and η22=0.014, allowing an exact inversion round trip.',
    compute(v){
      const result=experimentalSeaInverse(v),n1=positive(v.n1,'Panel 1 modal density'),n2=positive(v.n2,'Panel 2 modal density'),etas=[result.eta11,result.eta12,result.eta21,result.eta22];
      const forward=seaForwardEnergies({...result,eta11:result.eta11,eta12:result.eta12,eta21:result.eta21,eta22:result.eta22});
      const closure=Math.max(Math.abs(forward.E11/result.E11-1),Math.abs(forward.E21/result.E21-1),Math.abs(forward.E12/result.E12-1),Math.abs(forward.E22/result.E22-1));
      const reciprocity=n1*result.eta12/(n2*result.eta21),negative=etas.some(value=>value<0),warnings=[];
      if(result.separation<.1)warnings.push('The two energy columns are poorly separated; small measurement errors may create large loss-factor errors.');
      if(negative)warnings.push('At least one inferred loss factor is negative, which is non-passive and usually indicates measurement bias, poor conditioning, or an invalid subsystem model.');
      if(Math.abs(reciprocity-1)>.2)warnings.push('The inferred CLFs differ from the SEA reciprocity relation by more than 20%; check modal densities, energy bias, and test consistency.');
      warnings.push('Surface-averaged energy bias was the dominant unresolved limitation in the report, especially above approximately 1 kHz.');
      return{
        summary:[stat('Internal loss factor η₁₁',result.eta11,'',result.eta11<0?'warn':''),stat('Coupling loss factor η₁₂',result.eta12,'',result.eta12<0?'warn':''),stat('Coupling loss factor η₂₁',result.eta21,'',result.eta21<0?'warn':''),stat('Internal loss factor η₂₂',result.eta22,'',result.eta22<0?'warn':''),stat('Energy-matrix separation',result.separation,'',result.separation<.1?'warn':'good'),stat('Reciprocity ratio n₁η₁₂/n₂η₂₁',reciprocity,'',Math.abs(reciprocity-1)>.2?'warn':'good'),stat('Forward/inverse closure',100*closure,'%')],
        interpretation:`The inversion assigns dissipation within each panel through η₁₁ and η₂₂ and directional junction transfer through η₁₂ and η₂₁. The energy-matrix separation is ${result.separation.toFixed(3)}; values near zero are highly noise-sensitive.`,
        warnings,
        tables:[
          {title:'Power-injection energy matrix',columns:['Receiving subsystem','Drive 1 energy / F²','Drive 2 energy / F²'],rows:[['Panel 1',result.E11,result.E12],['Panel 2',result.E21,result.E22]]},
          {title:'Identified loss factors',columns:['Term','Meaning','Value'],rows:[['η11','Panel 1 internal',result.eta11],['η12','Panel 1 → panel 2 coupling',result.eta12],['η21','Panel 2 → panel 1 coupling',result.eta21],['η22','Panel 2 internal',result.eta22]]}
        ],
        csv:{filename:'experimental-sea-inversion.csv',columns:['frequency_hz','eta11','eta12','eta21','eta22','matrix_separation','reciprocity_ratio'],rows:[[result.frequency,result.eta11,result.eta12,result.eta21,result.eta22,result.separation,reciprocity]]}
      };
    }
  },

  'junction-transmission': {
    category:'SEA & Energy',basis:'TR 12-007 line, point, blocking-mass, measured-transmission, and CLF relations',confidence:'Model comparison; paper-lap curve is an approximate digitization',
    inputs:[
      {key:'frequency',label:'Frequency',unit:'Hz',type:'number',default:1000,min:100,max:10000},
      {key:'joint_model',label:'Junction model',type:'select',default:'paper-lap',options:[{value:'paper-lap',label:'TR 12-007 measured lap-joint trend'},{value:'ideal-line',label:'Ideal continuous line joint'},{value:'blocking-mass',label:'Sleeve blocking-mass approximation'},{value:'point-array',label:'Uncorrelated point-connection array'}]},
      {key:'bolt_spacing',label:'Bolt-region spacing',unit:'m',type:'number',default:.254,min:.001},
      {key:'joint_length',label:'Junction length',unit:'m',type:'number',default:1.22,min:.001},
      {key:'connection_count',label:'Uncorrelated point regions',type:'number',default:5,min:1,max:50,step:1},
      {key:'blocking_mass',label:'Sleeve blocking mass per length',unit:'kg/m',type:'number',default:15,min:0},
      {key:'fmin',label:'Plot minimum',unit:'Hz',type:'number',default:300,min:100},
      {key:'fmax',label:'Plot maximum',unit:'Hz',type:'number',default:5000,min:200}
    ],
    theory:'<p>Transmission coefficient describes wave power crossing the joint. SEA coupling loss factors also depend on panel modal density, junction length or point count, incidence treatment, and the high-transmission Lyon–DeJong correction.</p>',
    assumptions:['The panel presets use equivalent flexural/shear properties from TR 12-007.','The line-junction CLF uses normal-incidence transmission as an approximation to the angular ensemble average.','The sleeve model includes blocking mass but omits joint stiffness and frictional damping.'],
    example:'The report measured lap-joint transmission decreasing from roughly 0.5 near 500 Hz toward 0.1 near 4 kHz—far below the ideal continuous-junction estimate.',
    compute(v){
      const p1=honeycombPreset('panel1'),p2=honeycombPreset('panel2'),f=positive(v.frequency,'Frequency'),fmin=positive(v.fmin,'Plot minimum'),fmax=positive(v.fmax,'Plot maximum');if(fmax<=fmin)throw new Error('Plot maximum must exceed minimum.');
      const options={model:v.joint_model,boltSpacing:positive(v.bolt_spacing,'Bolt spacing'),jointLength:positive(v.joint_length,'Joint length'),connectionCount:Math.max(1,Math.round(n(v.connection_count))),blockingMassPerLength:Math.max(0,n(v.blocking_mass))};
      const selected=junctionTransmissionState(p1,p2,f,options),models=['paper-lap','ideal-line','blocking-mass','point-array'],labels={'paper-lap':'Measured lap trend','ideal-line':'Ideal line','blocking-mass':'Blocking mass','point-array':'Point connection'},comparisons=models.map(model=>{const q=junctionTransmissionState(p1,p2,f,{...options,model});return[labels[model],q.tau12,q.tau21,q.eta12Line,q.eta12Point];});
      const fs=logspace(fmin,fmax,150),curves=Object.fromEntries(models.map(model=>[model,fs.map(freq=>junctionTransmissionState(p1,p2,freq,{...options,model}).tau12)]));
      const warning=v.joint_model==='paper-lap'?'The measured-lap curve is an approximate visual digitization of Figure 48 and should be used for teaching and trend comparison only.':v.joint_model==='blocking-mass'?'The report found that the simple blocking-mass slope did not reproduce the measured sleeve-joint trend.':v.joint_model==='point-array'?'The report data were more consistent with a line-junction CLF than an uncorrelated point-connection CLF.':'A real bolted interface is neither continuous nor infinitely stiff; the ideal line result is an upper-bound comparison.';
      return{
        summary:[stat('Power transmission τ₁₂',selected.tau12),stat('Transmission loss',-10*Math.log10(selected.tau12),'dB'),stat('Line-junction CLF η₁₂',selected.eta12Line),stat('Point-array CLF η₁₂',selected.eta12Point),stat('kᵦd for panel 1',selected.kbd12),stat('Spacing regime',selected.regime),stat('Ideal / selected τ ratio',selected.idealTau12/selected.tau12,'×')],
        interpretation:`At ${f.toFixed(0)} Hz the selected ${labels[v.joint_model]||'junction'} model gives τ₁₂=${selected.tau12.toFixed(3)}. With kᵦd=${selected.kbd12.toFixed(2)}, the bolt spacing is in the ${selected.regime}.`,
        warnings:[warning,'Do not confuse junction transmission with panel joint acceptance: one describes power crossing a connection; the other describes distributed-load projection onto a mode.'],
        plots:[{title:'Panel 1 → panel 2 transmission models',xLabel:'Frequency (Hz)',yLabel:'Power transmission coefficient',xScale:'log',yScale:'log',traces:[trace('Measured lap trend',fs,curves['paper-lap'],{emphasis:true}),trace('Ideal line',fs,curves['ideal-line']),trace('Blocking mass',fs,curves['blocking-mass']),trace('Point connection',fs,curves['point-array'])]}],
        tables:[{title:'Junction models at the evaluation frequency',columns:['Model','τ12','τ21','Line CLF η12','Point-array CLF η12'],rows:comparisons},{title:'Approximate Figure 48 lap-joint data',columns:['Frequency (Hz)','τ12','τ21'],rows:PAPER_LAP_TRANSMISSION.frequency.map((freq,index)=>[freq,PAPER_LAP_TRANSMISSION.tau12[index],PAPER_LAP_TRANSMISSION.tau21[index]])}],
        csv:{filename:'junction-transmission-comparison.csv',columns:['frequency_hz','paper_lap_tau12','ideal_line_tau12','blocking_mass_tau12','point_connection_tau12'],rows:fs.map((freq,index)=>[freq,curves['paper-lap'][index],curves['ideal-line'][index],curves['blocking-mass'][index],curves['point-array'][index]])}
      };
    }
  },

  'inhomogeneous-energy': {
    category:'Test & Signal',basis:'Mass-weighted kinetic energy and sparse spatial sampling from TR 12-007 equations 36–38',confidence:'Exact for the displayed synthetic mode and mass map',
    inputs:[
      {key:'panel_preset',label:'Panel',type:'select',default:'panel1',options:[{value:'panel1',label:'TR 12-007 panel 1'},{value:'panel2',label:'TR 12-007 panel 2'}]},
      {key:'mode_x',label:'Mode order along length',type:'number',default:2,min:1,max:18,step:1},
      {key:'mode_y',label:'Mode order across width',type:'number',default:1,min:0,max:12,step:1},
      {key:'sensor_count',label:'Response points',type:'number',default:6,min:3,max:126,step:1},
      {key:'layout',label:'Sensor layout',type:'select',default:'paper-six',options:[{value:'paper-six',label:'Six-point paper-like layout'},{value:'regular',label:'Regular response grid'},{value:'halton',label:'Distributed quasi-random grid'}]},
      {key:'grid_shift',label:'Regular-grid shift',type:'number',default:0,min:-.45,max:.45,step:.05}
    ],
    theory:'<p>True kinetic energy is mass weighted: E∝vᴴMv. Multiplying a few unweighted velocity samples by total mass assumes that response and mass are sampled representatively—an assumption that fails near heavy doublers and when the vibration field is spatially aliased.</p>',
    assumptions:['The displayed cosine field is an illustrative free-edge-like mode, not a fitted measured mode.','Doubler mass is distributed uniformly over the two report end regions.','Every response point has equal measurement quality and phase is not used in the energy average.'],
    example:'Low-order modes can be underpredicted when heavy moving end regions are ignored; higher orders become extremely sensitive to sensor count and placement.',
    compute(v){
      const panel=honeycombPreset(v.panel_preset==='panel2'?'panel2':'panel1'),study=inhomogeneousEnergyStudy({panel,modeX:Math.round(n(v.mode_x,2)),modeY:Math.round(n(v.mode_y,1)),sensorCount:Math.round(n(v.sensor_count,6)),layout:v.layout,shift:n(v.grid_shift)}),bias=Math.abs(study.sparseBias),warnings=[];
      if(study.sparseBias<0)warnings.push(`The sparse estimate is ${bias.toFixed(1)}% low because its sampled motion misses mass-weighted response.`);else warnings.push(`The sparse estimate is ${bias.toFixed(1)}% high because the sampled points over-represent antinodes.`);
      if(study.samplesPerHalfWave<2)warnings.push('The nominal streamwise sampling is below two points per modal half-wave; spatial aliasing is likely.');
      warnings.push('The report did not endorse a universal empirical correction because self- and cross-energy biases need not be identical.');
      return{
        summary:[stat('Mass-weighted reference energy',study.exactEnergy,'relative J'),stat('Uniform dense estimate',study.uniformEnergy,'relative J'),stat('Sparse sensor estimate',study.sparseEnergy,'relative J'),stat('Uniform-mass bias',study.uniformBias,'%',Math.abs(study.uniformBias)>10?'warn':''),stat('Sparse-layout bias',study.sparseBias,'%',bias>10?'warn':'good'),stat('Samples per streamwise half-wave',study.samplesPerHalfWave,'',study.samplesPerHalfWave<2?'warn':'good')],
        interpretation:`For the displayed (${study.modeX},${study.modeY}) field, the ${study.sensorCount}-point ${study.layout.replace('-', ' ')} layout differs from the mass-weighted reference by ${study.sparseBias.toFixed(1)}%. Moving sensors can change the sign of this error without changing the structure.`,
        warnings,
        heatmaps:[{title:'Illustrative mode shape',matrix:matrixEvery(study.modeMatrix)},{title:'Surface-mass distribution',matrix:matrixEvery(study.massMatrix)},{title:'Local mass-weighted energy contribution',matrix:matrixEvery(study.contributionMatrix)}],
        tables:[{title:'Response-point samples',columns:['Point','x / L','y / W','Mode amplitude','Amplitude²'],rows:study.sensors.map((sensor,index)=>[index+1,sensor.x,sensor.y,sensor.mode,sensor.modeSquared])}],
        csv:{filename:'inhomogeneous-panel-energy-samples.csv',columns:['point','x_over_L','y_over_W','mode_amplitude','mode_amplitude_squared'],rows:study.sensors.map((sensor,index)=>[index+1,sensor.x,sensor.y,sensor.mode,sensor.modeSquared])}
      };
    }
  },

  'insertion-loss': {
    category:'Noise Control',basis:'Band-by-band level comparison and energy sums',confidence:'Exact level arithmetic',
    inputs:[{key:'before',label:'Before spectrum',unit:'Hz, dB',type:'textarea',default:'63, 100\n125, 104\n250, 106\n500, 102\n1000, 98\n2000, 94'},{key:'after',label:'After spectrum',unit:'Hz, dB',type:'textarea',default:'63, 97\n125, 98\n250, 96\n500, 90\n1000, 87\n2000, 86'}],
    theory:'<p>Band insertion loss is Lbefore−Lafter. Overall insertion loss is the difference between separately energy-summed overall levels—not the arithmetic average of band IL.</p>',assumptions:['Matched operating state, measurement geometry, bandwidths, and instrumentation.','Before and after rows use corresponding center frequencies.'],example:'A treatment can have 10 dB IL in many bands but a smaller overall IL when an untreated low-frequency band dominates.',
    compute(v){const a=parsePairs(v.before,'before spectrum'),b=parsePairs(v.after,'after spectrum'),map=new Map(b.map(r=>[String(r[0]),r[1]])),rows=[];for(const [f,L] of a)if(map.has(String(f)))rows.push([f,L,map.get(String(f)),L-map.get(String(f))]);if(!rows.length)throw new Error('No matching center frequencies were found.');const oa=db10(rows.reduce((s,r)=>s+fromDb10(r[1]),0)),ob=db10(rows.reduce((s,r)=>s+fromDb10(r[2]),0));return{summary:[stat('Overall before',oa,'dB'),stat('Overall after',ob,'dB'),stat('Overall insertion loss',oa-ob,'dB'),stat('Best band IL',Math.max(...rows.map(r=>r[3])),'dB'),stat('Worst band IL',Math.min(...rows.map(r=>r[3])),'dB')],interpretation:`The energy-summed overall level changes by ${(oa-ob).toFixed(2)} dB across the matched bands.`,plots:[{title:'Before and after spectra',xLabel:'Frequency (Hz)',yLabel:'Level (dB)',xScale:'log',traces:[trace('Before',rows.map(r=>r[0]),rows.map(r=>r[1])),trace('After',rows.map(r=>r[0]),rows.map(r=>r[2]))]},{title:'Insertion loss by band',xLabel:'Frequency (Hz)',yLabel:'Insertion loss (dB)',xScale:'log',traces:[trace('IL',rows.map(r=>r[0]),rows.map(r=>r[3]))]}],tables:[{title:'Band insertion loss',columns:['Frequency (Hz)','Before (dB)','After (dB)','IL (dB)'],rows}],csv:{filename:'insertion-loss.csv',columns:['frequency_hz','before_db','after_db','insertion_loss_db'],rows}};}
  },

  'lined-duct': {
    category:'Noise Control',basis:'User-supplied attenuation-rate budget',confidence:'Exact budget; attenuation model supplied by user',
    inputs:[{key:'attenuation',label:'Liner attenuation rate',unit:'Hz, dB/m',type:'textarea',default:'125, 0.8\n250, 1.8\n500, 4.5\n1000, 7.0\n2000, 5.0\n4000, 2.5'},{key:'length',label:'Lined length',unit:'m',type:'number',default:1.5,min:0},{key:'end_loss',label:'Additional end / transition loss',unit:'dB',type:'number',default:0},{key:'input_level',label:'Input spectrum',unit:'Hz, dB',type:'textarea',default:'125, 105\n250, 105\n500, 103\n1000, 101\n2000, 98\n4000, 94'}],
    theory:'<p>Band attenuation is the supplied dB-per-length value times lined length, plus any independently justified transition loss.</p>',assumptions:['Attenuation-rate data already reflects duct geometry, liner impedance, flow, temperature, and mode content.','Losses are applicable over the entered length and do not saturate.'],example:'Use manufacturer, test, or validated model attenuation rates rather than inferring them from absorption coefficient alone.',
    compute(v){const rate=parsePairs(v.attenuation,'attenuation rate'),input=parsePairs(v.input_level,'input spectrum'),L=Math.max(0,n(v.length)),end=n(v.end_loss),map=new Map(input.map(r=>[String(r[0]),r[1]])),rows=[];for(const [f,a] of rate)if(map.has(String(f))){const loss=a*L+end,Lin=map.get(String(f));rows.push([f,a,loss,Lin,Lin-loss]);}if(!rows.length)throw new Error('No matching frequencies were found between rate and input spectra.');const before=db10(rows.reduce((s,r)=>s+fromDb10(r[3]),0)),after=db10(rows.reduce((s,r)=>s+fromDb10(r[4]),0));return{summary:[stat('Lined length',L,'m'),stat('Overall input',before,'dB'),stat('Overall output',after,'dB'),stat('Overall attenuation',before-after,'dB'),stat('Maximum band attenuation',Math.max(...rows.map(r=>r[2])),'dB')],interpretation:`Applying the supplied attenuation-rate curve over ${L} m reduces the energy-summed level by ${(before-after).toFixed(2)} dB.`,warnings:['Absorption coefficient alone does not uniquely determine lined-duct attenuation. Use validated modal/impedance analysis or measured dB-per-length data for design.'],plots:[{title:'Predicted lined-duct spectra',xLabel:'Frequency (Hz)',yLabel:'Level (dB)',xScale:'log',traces:[trace('Input',rows.map(r=>r[0]),rows.map(r=>r[3])),trace('Output',rows.map(r=>r[0]),rows.map(r=>r[4]))]}],tables:[{title:'Attenuation budget',columns:['Frequency (Hz)','Rate (dB/m)','Total loss (dB)','Input (dB)','Output (dB)'],rows}],csv:{filename:'lined-duct-budget.csv',columns:['frequency_hz','rate_db_per_m','loss_db','input_db','output_db'],rows}};}
  }
};

export const extraCalculatorRegistry = createEngineeringRegistry(extraCalculatorDefinitions);
