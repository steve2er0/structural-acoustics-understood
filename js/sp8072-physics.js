import { SP8072_CURVES, SP8072_DIRECTIVITY, SP8072_DEFLECTORS, SP8072_CORRELATION, SP8072_VERSION } from './sp8072-data.js';

export const SP8072_DEFAULTS = Object.freeze({
  method:'apparent', engines:1, thrust:1e6, velocity:2200, diameter:1.5, efficiency:1,
  cluster:'merged', nozzleRadius:0, nozzlePositions:'', mach:3, ambientSound:343,
  exitDensity:.2, ambientDensity:1.225, pressureRatio:1, nozzleShape:'circular', areaRatio:20,
  altitude:0, receiverX:-25, receiverY:0, receiverZ:20, receiverStep:1,
  deflector:'none', standOffD:4, turn:90, azimuth:0, bendRadiusD:2, branchFraction:.5,
  sourceBasis:'handbook', customSpectrum:'', customAxial:'', customLocal:'', transfer:'no',
  fmin:20, fmax:400, band:'third', linearWidth:10, integration:'integral',
  directivity:'edge', directivityDb:0, positionScale:1, coreScale:1, slices:96, axialMin:.1, axialMax:4.7,
  water:'dry', waterFlow:0, exhaustFlow:0, injectionStationD:4, injectionAngle:90, injectionPressure:0, injectorDiameter:0,
  waterReduction:0, waterCurve:'', waterProvenance:'',
  shieldStartD:4, shieldEndD:40, shieldDb:0, propagationDbPerKm:0, reflectionDb:0, surfaceDb:0, minimumRangeD:.5,
  vehicleMach:0, correlation:'off', separation:0, circumferenceAngle:0, vehicleRadius:3, beta:30
});
export const SP8072_NUMERIC_BOUNDS = {
  engines:[1,64],thrust:[1,1e9],velocity:[100,10000],diameter:[.001,100],efficiency:[.000001,100],
  nozzleRadius:[0,1000],mach:[1,4],ambientSound:[100,1000],exitDensity:[.000001,100],ambientDensity:[.000001,100],pressureRatio:[.001,100],areaRatio:[1,1000],
  altitude:[0,10000],receiverX:[-1e5,1e5],receiverY:[-1e5,1e5],receiverZ:[-1e5,1e5],receiverStep:[.001,100],
  standOffD:[0,1000],turn:[0,170],azimuth:[-360,360],bendRadiusD:[0,100],branchFraction:[.001,.999],
  fmin:[.01,1e6],fmax:[.01,1e6],linearWidth:[.001,1e5],directivityDb:[-60,60],positionScale:[.01,100],coreScale:[.01,100],slices:[8,512],axialMin:[.1,4.6],axialMax:[.11,4.7],
  waterFlow:[0,1e7],exhaustFlow:[0,1e7],injectionStationD:[0,1000],injectionAngle:[0,180],injectionPressure:[0,1e5],injectorDiameter:[0,10],waterReduction:[0,60],
  shieldStartD:[0,1000],shieldEndD:[0,1000],shieldDb:[0,60],propagationDbPerKm:[0,1000],reflectionDb:[-60,60],surfaceDb:[-60,60],minimumRangeD:[.001,100],vehicleMach:[0,.99],
  separation:[0,1000],circumferenceAngle:[0,180],vehicleRadius:[.001,100],beta:[0,90]
};
const choices = {method:['apparent','distributed'],cluster:['merged','independent'],deflector:SP8072_DEFLECTORS.map(d=>d.id),sourceBasis:['handbook','example8','custom'],transfer:['no','yes'],band:['third','octave','linear'],integration:['integral','center'],directivity:['strict','edge','isotropic','entered'],water:['dry','source-scenario'],correlation:['off','longitudinal','circumferential'],nozzleShape:['circular','other']};
const rad = d=>d*Math.PI/180;
export const sp8072PowerSumDb = db=>{if(!db.length)return -Infinity;const top=Math.max(...db);return top===-Infinity?top:top+10*Math.log10(db.reduce((s,v)=>s+10**((v-top)/10),0));};
export function parseSp8072Curve(text, label='Curve', positiveX=true) {
  if(!String(text??'').trim())return null;
  let points;
  try { points=String(text).trim().startsWith('[')?JSON.parse(text):String(text).trim().split(/[;\n]+/).map(row=>row.trim().split(/[,\s]+/).map(Number)); } catch { throw new Error(`${label}: expected x,dB pairs.`); }
  if(!Array.isArray(points)||points.length<2||points.length>256||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(x=>typeof x!=='number'||!Number.isFinite(x))||positiveX&&p[0]<=0||Math.abs(p[1])>200)||points.some((p,i)=>i&&p[0]<=points[i-1][0]))throw new Error(`${label}: provide 2–256 finite, strictly increasing x,dB pairs; positive x and |dB| ≤ 200.`);
  return points;
}
export function normalizeSp8072(input={}) {
  const v={...SP8072_DEFAULTS,...input};
  for(const [key,[min,max]] of Object.entries(SP8072_NUMERIC_BOUNDS)){
    if(v[key]===''||v[key]===null||typeof v[key]==='boolean'||!Number.isFinite(Number(v[key])))throw new Error(`${key}: enter a finite number.`);
    v[key]=Number(v[key]);if(v[key]<min||v[key]>max)throw new Error(`${key}: allowed software range ${min} to ${max}.`);
  }
  for(const [key,options]of Object.entries(choices))if(!options.includes(v[key]))throw new Error(`${key}: unsupported selection.`);
  if(!Number.isInteger(v.engines)||!Number.isInteger(v.slices))throw new Error('engines and slices must be integers.');
  if(v.fmin>=v.fmax)throw new Error('fmin must be below fmax.');
  if(v.axialMin>=v.axialMax)throw new Error('axialMin must be below axialMax.');
  if(v.shieldStartD>v.shieldEndD)throw new Error('shieldStartD must not exceed shieldEndD.');
  const activeCurves=[...(v.sourceBasis==='custom'?(v.method==='apparent'?['customSpectrum']:['customAxial','customLocal']):[]),...(v.water==='source-scenario'?['waterCurve']:[])];
  for(const key of activeCurves)parseSp8072Curve(v[key],key);
  if(v.water==='source-scenario'&&(v.waterReduction>0||String(v.waterCurve).trim())&&!String(v.waterProvenance).trim())throw new Error('waterProvenance: identify the incremental reduction assumption or measurement, relative to this same dry deflector.');
  if(v.method==='apparent'&&(v.shieldDb>0||v.deflector==='covered'))throw new Error('Shielding / covered tunnels require the distributed method (SP-8072 p. 30).');
  if(v.vehicleMach>0&&v.deflector!=='none')throw new Error('Fig. 16 velocity correction supports undeflected flow only. Set vehicleMach to zero for pad deflectors.');
  const d=SP8072_DEFLECTORS.find(d=>d.id===v.deflector);
  if(d.requiresCustom&&v.sourceBasis!=='custom')throw new Error('Conical geometry requires a user-entered source spectrum; Fig. 4 alone supplies no general spectrum.');
  if(['flat6','flat22','curved45'].includes(v.deflector)&&v.sourceBasis==='handbook')throw new Error('This deflector changes source generation. Select its Fig. 8 example or a user spectrum; Fig. 5 similarity is not supported.');
  if(v.sourceBasis==='custom'&&!String(v.customSpectrum).trim()&&v.method==='apparent')throw new Error('customSpectrum: supply density per unit Strouhal number, relative to the entered overall power.');
  if(v.sourceBasis==='custom'&&v.method==='distributed'&&(!String(v.customAxial).trim()||!String(v.customLocal).trim()))throw new Error('Custom distributed sources require customAxial and customLocal curves.');
  if(v.sourceBasis==='example8'&&(!d.spectrum||v.method!=='apparent'))throw new Error('Fig. 8 examples support the apparent-source spectrum only, for listed configurations.');
  if(v.sourceBasis==='example8'&&v.transfer==='no'&&(v.engines!==1||v.standOffD!==d.standOffD||v.turn!==d.turn||v.bendRadiusD!==d.radiusD))throw new Error('Geometry departs from the Fig. 8 example. Enable the explicitly labeled scenario transfer, or restore its preset.');
  if((v.velocity<1800||v.velocity>2600||v.nozzleShape!=='circular')&&v.sourceBasis==='handbook'&&v.transfer==='no')throw new Error('Fig. 5 chemical-rocket similarity is limited to 1800–2600 m/s and standard nozzles. Supply source curves or explicitly enable scenario transfer.');
  return v;
}
// Interpolate in the plotted coordinates: log x / dB for densities,
// log x / log y for Fig. 14 source positions. No implicit extrapolation.
export function sp8072Interpolate(points,x,logY=false) {
  if(x<points[0][0]||x>points.at(-1)[0])throw new Error(`Curve domain ${points[0][0]}–${points.at(-1)[0]} excludes ${x.toPrecision(4)}.`);
  let i=1;while(i<points.length-1&&x>points[i][0])i++;
  const t=Math.log(x/points[i-1][0])/Math.log(points[i][0]/points[i-1][0]);
  return logY?Math.exp(Math.log(points[i-1][1])*(1-t)+Math.log(points[i][1])*t):points[i-1][1]*(1-t)+points[i][1]*t;
}
// Exact integration of each power-law segment of the log-x / dB interpolant.
export function sp8072CurveIntegral(points,lower,upper) {
  let result=0;
  for(let i=1;i<points.length;i++){
    const [x0,y0]=points[i-1],[x1,y1]=points[i],a=Math.max(lower,x0),b=Math.min(upper,x1);
    if(b<=a)continue;const exponent=(y1-y0)/10/Math.log10(x1/x0),valueAtA=10**(y0/10)*(a/x0)**exponent;
    result+=Math.abs(exponent+1)<1e-10?valueAtA*a*Math.log(b/a):valueAtA*a*Math.expm1((exponent+1)*Math.log(b/a))/(exponent+1);
  }
  return result;
}
export function sp8072Directivity(st,angle,mode='strict',entered=0) {
  if(mode==='isotropic')return 0;if(mode==='entered')return entered;
  const {rows,angles}=SP8072_DIRECTIVITY;
  if(angle<20||angle>180)throw new Error('Fig. 10 directivity covers 20–180° from flow. Choose an explicit isotropic/entered scenario for another angle.');
  if(mode==='strict'&&(st<rows[0].st||st>rows.at(-1).st))throw new Error('Fig. 10 Strouhal range is 0.004–0.4. Change bands or choose the labeled nearest-curve scenario.');
  const s=Math.max(rows[0].st,Math.min(rows.at(-1).st,st));
  const atAngle=row=>{let i=1;while(i<angles.length-1&&angle>angles[i])i++;const t=(angle-angles[i-1])/(angles[i]-angles[i-1]);return row.db[i-1]*(1-t)+row.db[i]*t;};
  let j=1;while(j<rows.length-1&&s>rows[j].st)j++;
  const t=Math.log(s/rows[j-1].st)/Math.log(rows[j].st/rows[j-1].st);
  return atAngle(rows[j-1])*(1-t)+atAngle(rows[j])*t;
}
export function sp8072FlowPoint(distance,diameter,v,azimuth=v.azimuth,origin=[0,0,v.altitude]) {
  if(v.deflector==='none')return {position:[origin[0],origin[1],origin[2]-distance],direction:[0,0,-1]};
  const h=v.standOffD*diameter,R=v.bendRadiusD*diameter,B=rad(v.turn),A=rad(azimuth);
  if(distance<h)return {position:[origin[0],origin[1],origin[2]-distance],direction:[0,0,-1]};
  const s=distance-h,t=R>0?Math.min(B,s/R):B,remaining=Math.max(0,s-R*B),horizontal=R*(1-Math.cos(t))+remaining*Math.sin(B),vertical=R*Math.sin(t)+remaining*Math.cos(B);
  return {position:[origin[0]+horizontal*Math.cos(A),origin[1]+horizontal*Math.sin(A),origin[2]-h-vertical],direction:[Math.sin(t)*Math.cos(A),Math.sin(t)*Math.sin(A),-Math.cos(t)]};
}
function bandFraction(curve,f,lo,hi,scale,integration) {
  if(integration==='integral')return sp8072CurveIntegral(curve,lo*scale,hi*scale);
  const x=f*scale;if(x<curve[0][0]||x>curve.at(-1)[0])return 0;
  return 10**(sp8072Interpolate(curve,x)/10)*(hi-lo)*scale;
}
export function calculateSp8072(input={}) {
  const v=normalizeSp8072(input),warnings=[],d=SP8072_DEFLECTORS.find(d=>d.id===v.deflector);
  const add=s=>{if(!warnings.includes(s))warnings.push(s);};
  const customSpectrum=v.sourceBasis==='custom'&&v.method==='apparent'?parseSp8072Curve(v.customSpectrum):null;
  const customAxial=v.sourceBasis==='custom'&&v.method==='distributed'?parseSp8072Curve(v.customAxial):null;
  const customLocal=v.sourceBasis==='custom'&&v.method==='distributed'?parseSp8072Curve(v.customLocal):null;
  const waterCurve=v.water==='source-scenario'?parseSp8072Curve(v.waterCurve):null;
  const spectrum=v.sourceBasis==='example8'?d.spectrum:v.sourceBasis==='custom'?customSpectrum:SP8072_CURVES.spectrum.points;
  const axial=v.sourceBasis==='custom'?customAxial:SP8072_CURVES.axialPower.points,local=v.sourceBasis==='custom'?customLocal:SP8072_CURVES.localSpectrum.points;
  const diameter=v.cluster==='merged'?v.diameter*Math.sqrt(v.engines):v.diameter,flowCount=v.cluster==='merged'?1:v.engines;
  const mechanicalPower=v.engines*v.thrust*v.velocity/2,acousticPower=mechanicalPower*v.efficiency/100;
  const exhaustFlow=v.exhaustFlow>0?v.exhaustFlow:v.engines*Math.PI*v.diameter**2/4*v.exitDensity*v.velocity;
  const coreLength=3.45*(1+.38*v.mach)**2*diameter*v.coreScale,exitSound=v.velocity/v.mach;
  let origins=Array.from({length:flowCount},(_,i)=>[v.nozzleRadius*Math.cos(2*Math.PI*i/flowCount),v.nozzleRadius*Math.sin(2*Math.PI*i/flowCount),v.altitude]);
  if(v.cluster==='merged')origins=[[0,0,v.altitude]];
  if(v.cluster==='independent'&&String(v.nozzlePositions).trim()){
    try{origins=JSON.parse(v.nozzlePositions);}catch{throw new Error('nozzlePositions: provide JSON [[x,y,z],…] in canonical metres.');}
    if(!Array.isArray(origins)||origins.length!==v.engines||origins.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1e5)))throw new Error('nozzlePositions: one finite [x,y,z] coordinate per engine is required.');
  }
  const twin=['twin','flat6','flat22','conical'].includes(v.deflector),branches=twin?[{az:v.azimuth,fraction:v.branchFraction},{az:v.azimuth+180,fraction:1-v.branchFraction}]:[{az:v.azimuth,fraction:1}];
  if(v.cluster==='independent'&&v.engines>1)add('Independent jets use separate equal engines and incoherent powers; plume mixing is excluded. Nozzle spacing has no handbook transition law.');
  if(v.cluster==='merged'&&v.engines>1)add('Eq. 3 assumes a closely mixed cluster. Nozzle spacing is metadata in this model; use independent jets for separated flows.');
  if(v.sourceBasis==='example8')add('Fig. 8 is a reference-specific empirical transfer normalized to undeflected power. Its ordinate already includes source reduction; Fig. 4 efficiencies are not stacked. Water conditions of that historical example are not established here.');
  if(v.transfer==='yes')add('Scenario transfer enabled: finite results outside the handbook engine/configuration similarity are user assumptions, not handbook-validated predictions.');
  if(v.exitDensity<.05||v.exitDensity>v.ambientDensity||v.pressureRatio>2||v.velocity>3000||v.nozzleShape==='other')add('§3.3.1 p. 26 calls for subscale tests for these exhaust/nozzle conditions unless testing is demonstrated unnecessary.');
  if(v.method==='distributed')add(`Distributed core length is ${coreLength.toFixed(2)} m from Fig. 11; local directivity uses far-field Fig. 10 as the handbook empirical assumption (p. 14). Sources outside x/xt=${v.axialMin}–${v.axialMax} are omitted.`);
  if(v.method==='distributed'&&v.deflector!=='none')add('Applying Figs. 11–13 along a deflected path is a preliminary similarity assumption; impingement and the curved-flow source distribution require configuration-specific correlation.');
  if(v.correlation!=='off')add('Correlation is an auxiliary single-direction estimate from Figs. 18–19 using entered beta. It is not a structural-response or cylinder-scattering model.');
  if(v.water==='source-scenario')add(`Water reduction is an entered incremental SOURCE-power scenario relative to the same reference deflector, not a flow-to-reduction law. Flow ratio ${(v.waterFlow/exhaustFlow).toFixed(3)} and injector metadata do not calculate attenuation. Basis: ${v.waterProvenance||'zero-reduction scenario'}.`);
  if(v.shieldDb>0)add('Shielding loss applies once to sources inside the entered path interval; it is a user scenario, without diffraction or a universal tunnel credit.');
  if(v.reflectionDb||v.surfaceDb||v.propagationDbPerKm)add('Entered path loss, additional reflection, and receiver surface gain are separate scenarios. Do not re-enter a measured total receiver correction in more than one stage.');
  const bands=[],sources=[],sourceBudget=new Map(),receiver=[v.receiverX,v.receiverY,v.receiverZ],k=v.band==='third'?3:1,edge=2**(1/(2*k));
  const frequencies=[];for(let i=0;i<=128;i++){const f=v.band==='linear'?v.fmin+i*v.linearWidth:v.fmin*2**(i/k);if(f>v.fmax*(1+1e-12))break;frequencies.push(f);}
  if(frequencies.length>128)throw new Error('Frequency range exceeds 128 bands; increase bandwidth or narrow the range. No bands were silently discarded.');
  if(v.band==='linear'&&v.fmin<=v.linearWidth/2)throw new Error('Linear band lower edge must be above zero.');
  if(frequencies.length<2)throw new Error('Frequency range must contain at least two selected bands.');
  if(flowCount*branches.length*(v.method==='distributed'?v.slices:frequencies.length)>4096)throw new Error('More than 4096 allocated source records. Reduce independent engines, branches, slice count or band count; this is a software bound.');
  const sourcesAt=(f)=>{
    const result=[];
    for(let e=0;e<flowCount;e++)for(let b=0;b<branches.length;b++){
      const branch=branches[b],weight=branch.fraction/flowCount;
      if(v.method==='apparent'){
        const positionCurve=v.deflector==='closed'?SP8072_CURVES.apparentClosed.points:SP8072_CURVES.apparentOpen.points;
        const x=diameter*sp8072Interpolate(positionCurve,f*diameter/v.velocity,true)*v.positionScale;
        result.push({id:`e${e+1}/b${b+1}/f${f.toFixed(4)}`,e,b,x,weight,overallWeight:weight,...sp8072FlowPoint(x,diameter,v,branch.az,origins[e])});
      }else{
        if(v.axialMin<axial[0][0]||v.axialMax>axial.at(-1)[0])throw new Error('Requested axial extent exceeds the source-power curve domain.');
        for(let i=0;i<v.slices;i++){
          const a=v.axialMin*(v.axialMax/v.axialMin)**(i/v.slices),z=v.axialMin*(v.axialMax/v.axialMin)**((i+1)/v.slices),x=coreLength*(a+z)/2,overallWeight=weight*sp8072CurveIntegral(axial,a,z);
          result.push({id:`e${e+1}/b${b+1}/s${i+1}`,e,b,x,weight:overallWeight,overallWeight,...sp8072FlowPoint(x,diameter,v,branch.az,origins[e])});
        }
      }
    }
    return result;
  };
  const distributed=v.method==='distributed'?sourcesAt(frequencies[0]):null;
  for(const f of frequencies){
    const lower=v.band==='linear'?f-v.linearWidth/2:f/edge,upper=v.band==='linear'?f+v.linearWidth/2:f*edge,st=f*diameter/v.velocity,waterDb=v.water==='dry'?0:waterCurve?sp8072Interpolate(waterCurve,f):v.waterReduction;
    if(waterDb<0)throw new Error('waterCurve must contain nonnegative source reductions.');
    let sourceWatts=0,drySourceWatts=0,pressureEnergy=0,dryEnergy=0,unloadedEnergy=0;
    const bandSources=distributed??sourcesAt(f);
    for(const s of bandSources){
      const scale=v.method==='apparent'?diameter/v.velocity:s.x*exitSound/(v.velocity*v.ambientSound),curve=v.method==='apparent'?spectrum:local;
      if(v.method==='distributed'&&v.sourceBasis==='handbook'&&lower*scale<.25)add('Fig. 13 below alpha ≈ 0.25 uses its dashed low-frequency estimate, not a measured local spectrum; reading and similarity uncertainty are greater there.');
      if(lower*scale<curve[0][0]||upper*scale>curve.at(-1)[0])add('Some band/source spectral support lies outside a digitized density curve: tails are omitted, never extrapolated or normalized away. Selected-band OASPL is a truncated estimate.');
      const fraction=bandFraction(curve,f,lower,upper,scale,v.integration),dryWatts=acousticPower*s.weight*fraction,watts=dryWatts*10**(-waterDb/10);
      const delta=receiver.map((x,i)=>x-s.position[i]),r=Math.hypot(...delta);
      if(r<diameter*v.minimumRangeD)throw new Error(`Receiver is within minimumRangeD of source ${s.id}; point-source loading is invalid.`);
      const theta=Math.acos(Math.max(-1,Math.min(1,s.direction.reduce((sum,x,i)=>sum+x*delta[i]/r,0))))*180/Math.PI;
      const di=sp8072Directivity(st,theta,v.directivity,v.directivityDb);
      if(v.directivity==='edge'&&(st<.004||st>.4))add('Fig. 10 St outside 0.004–0.4 uses the explicitly selected nearest-frequency-curve scenario; no measured directivity is claimed there.');
      const shield=v.method==='distributed'&&s.x/diameter>=v.shieldStartD&&s.x/diameter<=v.shieldEndD?v.shieldDb:0;
      const motion=v.vehicleMach>0?20*Math.log10(1-v.vehicleMach):0;
      const gain=10**((-11+di+v.reflectionDb-shield-v.propagationDbPerKm*r/1000+motion)/10)/r**2*1e12;
      sourceWatts+=watts;drySourceWatts+=dryWatts;unloadedEnergy+=watts*gain;pressureEnergy+=watts*gain*10**(v.surfaceDb/10);dryEnergy+=dryWatts*gain*10**(v.surfaceDb/10);
      if(!sourceBudget.has(s.id)){
        const record={...s,range:r,theta,directivityDb:di,selectedBandWatts:watts,receivedBandDb:watts>0?10*Math.log10(watts*gain)+v.surfaceDb:null,totalSourceWatts:0,totalPressureEnergy:0};
        sources.push(record);sourceBudget.set(s.id,record);
      }
      const record=sourceBudget.get(s.id);record.totalSourceWatts+=watts;record.totalPressureEnergy+=watts*gain*10**(v.surfaceDb/10);
    }
    if(pressureEnergy<=0)throw new Error(`No source spectral support in band ${f.toPrecision(4)} Hz. Change bands or supply an identified spectrum.`);
    bands.push({frequency:f,lower,upper,bandwidth:upper-lower,strouhal:st,sourceWatts,drySourceWatts,splDb:10*Math.log10(pressureEnergy),drySplDb:10*Math.log10(dryEnergy),freeFieldDb:10*Math.log10(unloadedEnergy),pressureSquared:4e-10*pressureEnergy,waterDb});
  }
  const overallDb=sp8072PowerSumDb(bands.map(b=>b.splDb)),dryOverallDb=sp8072PowerSumDb(bands.map(b=>b.drySplDb)),selectedSourceWatts=bands.reduce((s,b)=>s+b.sourceWatts,0),drySelectedSourceWatts=bands.reduce((s,b)=>s+b.drySourceWatts,0);
  const axialFraction=v.method==='distributed'?sp8072CurveIntegral(axial,v.axialMin,v.axialMax):1;
  const correlation=v.correlation==='off'?null:bands.map(b=>{
    const a=2*Math.PI*b.frequency/v.ambientSound*(v.correlation==='longitudinal'?v.separation*Math.sin(rad(v.beta)):v.vehicleRadius*rad(v.circumferenceAngle)*Math.cos(rad(v.beta)));
    const points=SP8072_CORRELATION[v.correlation].points;
    if(a>points.at(-1)[0])return {frequency:b.frequency,coordinate:a,coefficient:null};
    let i=1;while(i<points.length-1&&a>points[i][0])i++;const t=(a-points[i-1][0])/(points[i][0]-points[i-1][0]);
    return {frequency:b.frequency,coordinate:a,coefficient:points[i-1][1]*(1-t)+points[i][1]*t};
  });
  if(correlation?.some(c=>c.coefficient===null))add('Correlation outside the inspected curve domain is unavailable; it is not silently continued to zero.');
  add('Selected-band OASPL sums only the listed bands. Missing low/high spectral tails, ignition transients, shock tones, coherent reflections, structural response and internal noise are excluded.');
  return {version:SP8072_VERSION,inputs:v,diameter,flowCount,origins,branches,mechanicalPower,acousticPower,exhaustFlow,waterRatio:v.waterFlow/exhaustFlow,coreLength,exitSound,axialFraction,selectedSourceWatts,drySelectedSourceWatts,sourceFraction:drySelectedSourceWatts/acousticPower,bands,sources:sources.map(s=>({...s,selectedOverallDb:s.totalPressureEnergy>0?10*Math.log10(s.totalPressureEnergy):null})),overallDb,dryOverallDb,pressureRms:2e-5*10**(overallDb/20),warnings,correlation};
}
