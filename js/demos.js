import {
  PAPER_LAP_TRANSMISSION,
  honeycombCoincidenceFrequency,
  honeycombFrequencySeries,
  honeycombPreset,
  honeycombWaveState,
  inhomogeneousEnergyStudy,
  junctionTransmissionState,
  wavenumberTransmissionStudy
} from './honeycomb-paper.js';
import { twoSubsystemEnergyBalance } from './sea-coupling.js';
import { acs519PreviewSvg, mountAcs519Demo, acs519SupportedDemoIds } from './acs519-demos.js';
import { workflowExpansionPreviewSvg, mountWorkflowExpansionDemo, workflowExpansionSupportedDemoIds } from './workflow-expansion-demos.js';
import { programExpansionPreviewSvg, mountProgramExpansionDemo, programExpansionSupportedDemoIds } from './program-expansion-demos.js';
import { seaParameterPreviewSvg, mountSeaParameterDemo, seaParameterSupportedDemoIds } from './sea-parameters-demos.js';
import { electronicsFatiguePreviewSvg, mountElectronicsFatigueDemo, electronicsFatigueSupportedDemoIds } from './electronics-fatigue-demos.js';
import { mountDemoTakeaway } from './demo-takeaways.js';

const TAU = 2 * Math.PI;
const G0 = 9.80665;
const AIR_C = 343;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const logMap = (x,a,b,A,B)=>A+(Math.log10(x)-Math.log10(a))/(Math.log10(b)-Math.log10(a))*(B-A);

function control(key,label,min,max,step,value,unit=''){
  return `<div class="demo-control"><label for="demo-${key}">${esc(label)} <output id="out-${key}">${value}${unit}</output></label><input id="demo-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" /></div>`;
}
function selectControl(key,label,options,value){
  return `<div class="demo-control"><label for="demo-${key}">${esc(label)}</label><select id="demo-${key}">${options.map(option=>`<option value="${esc(option.value)}" ${option.value===value?'selected':''}>${esc(option.label)}</option>`).join('')}</select></div>`;
}
function springPath(x1,y,x2,turns=9,amp=13){
  const pts=[[x1,y],[x1+12,y]];const a=x1+12,b=x2-12;
  for(let i=0;i<=turns*2;i++){const x=a+(b-a)*i/(turns*2);pts.push([x,y+(i%2?amp:-amp)]);}
  pts.push([x2,y]);
  return pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}
function axesSvg({x=60,y=35,w=760,h=330,xLabel='',yLabel=''}){
  return `<line x1="${x}" y1="${y+h}" x2="${x+w}" y2="${y+h}" stroke="#657176"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y+h}" stroke="#657176"/><text x="${x+w/2}" y="${y+h+38}" text-anchor="middle" font-size="12" fill="#5f6b70">${esc(xLabel)}</text><text x="16" y="${y+h/2}" transform="rotate(-90 16 ${y+h/2})" text-anchor="middle" font-size="12" fill="#5f6b70">${esc(yLabel)}</text>`;
}
function pathXY(xs,ys,sx,sy){return xs.map((x,i)=>`${i?'L':'M'}${sx(x).toFixed(2)},${sy(ys[i]).toFixed(2)}`).join(' ');}

export function demoPreviewSvg(id){
  const electronicsPreview=electronicsFatiguePreviewSvg(id);
  if(electronicsPreview)return electronicsPreview;
  const seaParameterPreview=seaParameterPreviewSvg(id);
  if(seaParameterPreview)return seaParameterPreview;
  const programPreview=programExpansionPreviewSvg(id);
  if(programPreview)return programPreview;
  const workflowPreview=workflowExpansionPreviewSvg(id);
  if(workflowPreview)return workflowPreview;
  const acs519Preview=acs519PreviewSvg(id);
  if(acs519Preview)return acs519Preview;
  const common=`viewBox="0 0 520 180" aria-hidden="true"`;
  if(id==='sdof-motion')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><path d="${springPath(35,90,205,11,10)}" fill="none" stroke="#1e6077" stroke-width="3"/><rect x="205" y="54" width="82" height="72" rx="3" fill="#164453"/><line x1="287" y1="90" x2="470" y2="90" stroke="#ada497"/><path d="M320 118 C350 112 356 42 385 52 C410 61 425 100 470 94" fill="none" stroke="#b96d37" stroke-width="4"/></svg>`;
  if(id==='damping-transmissibility')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><line x1="42" y1="148" x2="490" y2="148" stroke="#899296"/><line x1="42" y1="20" x2="42" y2="148" stroke="#899296"/><path d="M48 135 C125 130 155 25 205 62 C255 99 340 126 488 133" fill="none" stroke="#1e6077" stroke-width="4"/><path d="M48 134 C140 126 182 58 230 82 C290 112 374 125 488 130" fill="none" stroke="#b96d37" stroke-width="3"/><line x1="270" y1="22" x2="270" y2="148" stroke="#172027" stroke-dasharray="5 5"/></svg>`;
  if(id==='two-mode')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><path d="${springPath(25,90,145,7,8)}" fill="none" stroke="#1e6077" stroke-width="3"/><rect x="145" y="56" width="72" height="68" fill="#164453"/><path d="${springPath(217,90,330,7,8)}" fill="none" stroke="#b96d37" stroke-width="3"/><rect x="330" y="50" width="82" height="80" fill="#1e6077"/><path d="${springPath(412,90,500,5,8)}" fill="none" stroke="#1e6077" stroke-width="3"/><path d="M168 38 L190 22 M354 38 L380 18" stroke="#172027" stroke-width="3"/></svg>`;
  if(id==='beam-wave')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><line x1="35" y1="92" x2="490" y2="92" stroke="#ada497" stroke-dasharray="5 5"/><path d="M35 92 C92 32 150 152 207 92 S322 32 379 92 S435 151 490 92" fill="none" stroke="#1e6077" stroke-width="5"/><circle cx="35" cy="92" r="6" fill="#172027"/><circle cx="490" cy="92" r="6" fill="#172027"/></svg>`;
  if(id==='dispersion')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><path d="M20 103 C55 45 85 145 120 92 S185 72 220 100 S285 112 325 89 S395 68 500 96" fill="none" stroke="#1e6077" stroke-width="4"/><circle cx="330" cy="89" r="7" fill="#b96d37"/><circle cx="225" cy="100" r="7" fill="#164453"/><text x="334" y="72" font-size="12" fill="#5f6b70">high f</text><text x="185" y="132" font-size="12" fill="#5f6b70">low f</text></svg>`;
  if(id==='coincidence')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><line x1="45" y1="150" x2="490" y2="150" stroke="#899296"/><line x1="45" y1="18" x2="45" y2="150" stroke="#899296"/><path d="M55 142 C145 127 230 95 480 26" fill="none" stroke="#1e6077" stroke-width="4"/><path d="M55 132 L480 42" fill="none" stroke="#b96d37" stroke-width="4"/><circle cx="390" cy="61" r="7" fill="#172027"/></svg>`;
  if(id==='radiation-efficiency')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><rect x="42" y="55" width="175" height="72" fill="#164453"/><path d="M217 60 C265 38 295 36 335 52 M217 92 C275 64 338 65 392 90 M217 122 C290 92 390 103 485 134" fill="none" stroke="#1e6077" stroke-width="4" opacity=".75"/><path d="M48 91 C75 47 104 137 132 91 S188 47 216 91" fill="none" stroke="#e7e2d8" stroke-width="4"/><text x="330" y="35" font-size="13" fill="#172027">efficient radiation</text></svg>`;
  if(id==='ring')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><circle cx="260" cy="90" r="65" fill="none" stroke="#ada497" stroke-dasharray="5 5"/><path d="M260 18 C302 35 316 54 332 90 C315 126 301 143 260 162 C219 144 204 126 188 90 C205 54 220 35 260 18Z" fill="none" stroke="#1e6077" stroke-width="5"/></svg>`;
  if(id==='psd-response')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><path d="M28 135 L135 135 L190 105 L280 105 L338 130 L490 130" fill="none" stroke="#899296" stroke-width="3"/><path d="M28 150 C155 145 240 145 285 35 C322 145 410 148 490 148" fill="none" stroke="#1e6077" stroke-width="4"/></svg>`;
  if(id==='srs-bank')return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/>${Array.from({length:14},(_,i)=>`<rect x="${28+i*34}" y="${145-(18+105*Math.exp(-(((i-8)/3)**2)))}" width="17" height="${18+105*Math.exp(-(((i-8)/3)**2))}" fill="${i===8?'#b96d37':'#1e6077'}"/>`).join('')}<path d="M20 154 L500 154" stroke="#899296"/></svg>`;
  if(id==='sandwich-regimes')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><line x1="42" y1="146" x2="490" y2="146" stroke="#899296"/><line x1="42" y1="20" x2="42" y2="146" stroke="#899296"/><path d="M48 132 C115 72 210 43 480 26" fill="none" stroke="#b96d37" stroke-width="3"/><path d="M48 132 C118 75 220 60 480 55" fill="none" stroke="#1e6077" stroke-width="5"/><line x1="48" y1="72" x2="490" y2="72" stroke="#376e56" stroke-width="2" stroke-dasharray="6 5"/><line x1="132" y1="20" x2="132" y2="146" stroke="#172027" stroke-dasharray="5 5"/><circle cx="132" cy="72" r="6" fill="#172027"/></svg>';
  if(id==='energy-bias')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><g transform="translate(28 30)"><rect width="464" height="108" fill="#faf8f2" stroke="#899296"/><rect width="68" height="108" fill="#b96d37" opacity=".28"/><rect x="396" width="68" height="108" fill="#b96d37" opacity=".28"/><path d="M0 54 C58 5 116 103 174 54 S290 5 348 54 S406 103 464 54" fill="none" stroke="#1e6077" stroke-width="15" opacity=".65"/><g fill="#172027">'+[[.14,.22],[.28,.72],[.43,.38],[.58,.82],[.73,.18],[.88,.61]].map(p=>`<circle cx="${p[0]*464}" cy="${p[1]*108}" r="5"/>`).join('')+'</g></g></svg>';
  if(id==='wavenumber-transmission')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><g transform="translate(22 26)"><rect width="142" height="112" fill="#164453"/><path d="M-10 100 L50 -10 M25 122 L85 -10 M60 122 L120 -10 M95 122 L155 -10" stroke="#dce9ec" stroke-width="12" opacity=".75"/></g><g transform="translate(190 26)"><rect width="142" height="112" fill="#153844"/><ellipse cx="71" cy="56" rx="51" ry="35" fill="none" stroke="#9abcc7" stroke-width="3"/><circle cx="105" cy="36" r="11" fill="#b96d37"/></g><g transform="translate(358 26)"><rect width="142" height="112" fill="#153844"/><ellipse cx="71" cy="56" rx="51" ry="35" fill="none" stroke="#9abcc7" stroke-width="3"/><circle cx="103" cy="38" r="7" fill="#dce9ec"/></g></svg>';
  if(id==='junction-transmission')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><rect x="32" y="60" width="190" height="28" fill="#164453"/><rect x="298" y="60" width="190" height="28" fill="#1e6077"/><rect x="214" y="45" width="92" height="58" fill="#b96d37" opacity=".8"/><path d="M60 123 C94 95 125 151 160 123 S226 95 260 123" fill="none" stroke="#1e6077" stroke-width="4"/><path d="M300 123 C325 108 345 138 372 123 S425 108 458 123" fill="none" stroke="#899296" stroke-width="3"/><path d="M190 31 H332 M318 22 L332 31 L318 40" fill="none" stroke="#172027" stroke-width="4"/></svg>';
  if(id==='joint-acceptance')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><g transform="translate(18 24)"><rect width="138" height="104" fill="#faf8f2" stroke="#ada497"/><path d="M0 52 C23 12 46 92 69 52 S115 12 138 52" fill="none" stroke="#1e6077" stroke-width="13" opacity=".7"/></g><g transform="translate(174 24)"><rect width="138" height="104" fill="#faf8f2" stroke="#ada497"/><path d="M0 52 C23 12 46 92 69 52 S115 12 138 52" fill="none" stroke="#164453" stroke-width="13" opacity=".82"/><path d="M46 0 V104 M92 0 V104" stroke="#faf8f2" stroke-width="3"/></g><g transform="translate(330 24)"><rect width="172" height="104" fill="#faf8f2" stroke="#ada497"/><path d="M8 88 C42 84 55 72 73 36 S109 72 164 26" fill="none" stroke="#1e6077" stroke-width="4"/><circle cx="104" cy="57" r="6" fill="#b96d37"/></g><text x="87" y="153" text-anchor="middle" font-size="11" fill="#5f6b70">pressure field</text><text x="243" y="153" text-anchor="middle" font-size="11" fill="#5f6b70">panel mode</text><text x="416" y="153" text-anchor="middle" font-size="11" fill="#5f6b70">accepted modal load</text></svg>';
  if(id==='spatial-field')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><g transform="translate(16 25)"><rect width="150" height="130" fill="#faf8f2" stroke="#ada497"/><circle cx="75" cy="65" r="18" fill="none" stroke="#1e6077" stroke-width="10" opacity=".8"/><circle cx="75" cy="65" r="43" fill="none" stroke="#b96d37" stroke-width="13" opacity=".55"/><circle cx="75" cy="65" r="5" fill="#172027"/></g><g transform="translate(185 25)"><rect width="150" height="130" fill="#faf8f2" stroke="#ada497"/><path d="M-25 115 L35 -10 M15 140 L75 -10 M55 140 L115 -10 M95 140 L155 -10 M135 140 L175 55" stroke="#1e6077" stroke-width="18" opacity=".62"/><circle cx="75" cy="65" r="5" fill="#172027"/></g><g transform="translate(354 25)"><rect width="150" height="130" fill="#faf8f2" stroke="#ada497"/><ellipse cx="75" cy="65" rx="57" ry="18" fill="#dce9ec"/><path d="M18 65 C40 25 58 105 78 65 S116 25 138 65" fill="none" stroke="#1e6077" stroke-width="10" opacity=".78"/><circle cx="75" cy="65" r="5" fill="#172027"/><path d="M105 16 H140 M132 9 L140 16 L132 23" fill="none" stroke="#b96d37" stroke-width="3"/></g></svg>';
  if(id==='sea-flow')return '<svg '+common+'><rect width="520" height="180" fill="#e7e2d8"/><rect x="30" y="50" width="145" height="95" fill="#1e6077"/><rect x="345" y="72" width="145" height="73" fill="#164453"/><path d="M185 77 H335 M317 64 L337 77 L317 90" fill="none" stroke="#b96d37" stroke-width="10"/><path d="M335 116 H185 M203 106 L183 116 L203 126" fill="none" stroke="#657176" stroke-width="5"/><path d="M215 27 H305 M288 19 L307 27 L288 35" fill="none" stroke="#172027" stroke-width="4"/><text x="260" y="158" text-anchor="middle" font-size="11" fill="#5f6b70">gross exchange · net energy flow</text></svg>';
  return `<svg ${common}><rect width="520" height="180" fill="#e7e2d8"/><rect x="45" y="50" width="145" height="82" fill="#1e6077"/><rect x="330" y="68" width="145" height="64" fill="#164453"/><path d="M195 80 L325 80" stroke="#b96d37" stroke-width="10"/><path d="M325 115 L195 115" stroke="#899296" stroke-width="4"/></svg>`;
}

function mountSdof(root){
  root.innerHTML=`<div class="demo-controls">${control('ratio','Frequency ratio r',.15,3,.01,1,'')}${control('zeta','Damping ratio ζ',.01,.35,.005,.05,'')}${control('speed','Animation speed',.2,2,.1,1,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">Move through resonance. Damping suppresses the peak, but it also increases high-frequency force transmission.</div>`;
  const svg=root.querySelector('#demo-svg'),els=['ratio','zeta','speed'].map(k=>root.querySelector(`#demo-${k}`));let raf,start=performance.now();
  function draw(now){const r=+els[0].value,z=+els[1].value,speed=+els[2].value;root.querySelector('#out-ratio').textContent=r.toFixed(2);root.querySelector('#out-zeta').textContent=z.toFixed(3);root.querySelector('#out-speed').textContent=speed.toFixed(1)+'×';const H=1/Math.sqrt((1-r*r)**2+(2*z*r)**2),phase=Math.atan2(2*z*r,1-r*r),t=(now-start)/1000*speed,disp=clamp(24*H,-115,115)*Math.sin(TAU*r*t-phase),massX=265+disp;const fs=Array.from({length:220},(_,i)=>.12+3*i/219),hs=fs.map(q=>1/Math.sqrt((1-q*q)**2+(2*z*q)**2));const sx=q=>550+(q-.12)/(3-.12)*405,sy=q=>375-Math.log10(clamp(q,.08,50)/.08)/Math.log10(50/.08)*320;svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><text x="55" y="40" font-size="15" font-weight="700" fill="#172027">Forced SDOF</text><line x1="40" y1="225" x2="105" y2="225" stroke="#172027" stroke-width="8"/><path d="${springPath(105,225,massX,10,15)}" fill="none" stroke="#1e6077" stroke-width="4"/><rect x="${massX}" y="165" width="120" height="120" rx="5" fill="#164453"/><path d="M${massX+60} 145 L${massX+60} 105" stroke="#b96d37" stroke-width="5"/><path d="M${massX+46} 122 L${massX+60} 102 L${massX+74} 122" fill="none" stroke="#b96d37" stroke-width="5"/><text x="55" y="340" font-size="13" fill="#5f6b70">|H| = ${H.toFixed(2)} · phase = ${(phase*180/Math.PI).toFixed(1)}°</text>${axesSvg({x:550,y:35,w:405,h:340,xLabel:'frequency ratio r',yLabel:'dynamic magnification'})}<path d="${pathXY(fs,hs,sx,sy)}" fill="none" stroke="#1e6077" stroke-width="4"/><circle cx="${sx(r)}" cy="${sy(H)}" r="7" fill="#b96d37"/>`;raf=requestAnimationFrame(draw);}els.forEach(e=>e.addEventListener('input',()=>{}));raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}
function mountDispersion(root){
  root.innerHTML=`<div class="demo-controls">${control('time','Propagation time',0,.08,.001,.025,' s')}${control('stiffness','Bending stiffness scale',.25,4,.05,1,'×')}${control('speed','Animation speed',0,2,.1,.5,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">For a thin plate, bending group speed is twice phase speed and increases with √f. A broadband packet therefore spreads as it travels.</div>`;
  const svg=root.querySelector('#demo-svg'),time=root.querySelector('#demo-time'),stiff=root.querySelector('#demo-stiffness'),speed=root.querySelector('#demo-speed');let raf,last=performance.now();
  function draw(now){let tt=+time.value+(now-last)/1000*(+speed.value)*.02;if(tt>.08)tt=0;time.value=tt;root.querySelector('#out-time').textContent=tt.toFixed(3)+' s';root.querySelector('#out-stiffness').textContent=(+stiff.value).toFixed(2)+'×';root.querySelector('#out-speed').textContent=(+speed.value).toFixed(1)+'×';last=now;const fs=[80,160,320,640,1280],base=[1.1,1.55,2.2,3.1,4.4],scale=(+stiff.value)**.25;let wave='';for(let i=0;i<fs.length;i++){const x=80+base[i]*scale*tt*1700,amp=35/(1+i*.18),y=220;wave+=`<path d="M${x-75} ${y} Q${x-55} ${y-amp} ${x-35} ${y} T${x+5} ${y} T${x+45} ${y}" fill="none" stroke="${i===4?'#b96d37':'#1e6077'}" stroke-width="${5-i*.55}" opacity="${.35+i*.13}"/><circle cx="${x}" cy="${115+i*38}" r="6" fill="${i===4?'#b96d37':'#164453'}"/><text x="${x+10}" y="${119+i*38}" font-size="11" fill="#5f6b70">${fs[i]} Hz</text>`;}svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><text x="45" y="38" font-size="15" font-weight="700" fill="#172027">Broadband flexural packet</text><line x1="55" y1="220" x2="955" y2="220" stroke="#ada497" stroke-width="2"/>${wave}<text x="50" y="395" font-size="13" fill="#5f6b70">Higher-frequency content moves ahead because c<tspan baseline-shift="sub">g</tspan> ∝ f<tspan baseline-shift="super">1/2</tspan>.</text>`;raf=requestAnimationFrame(draw);}raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}
function mountCoincidence(root){
  root.innerHTML=`<div class="demo-controls">${control('thickness','Plate thickness',.5,12,.1,3,' mm')}${control('modulus','Young’s modulus',20,220,1,69,' GPa')}${control('density','Density',1200,8500,50,2700,' kg/m³')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">Coincidence occurs when the plate bending phase speed equals the fluid sound speed—or equivalently when structural and acoustic wavenumbers match.</div>`;
  const svg=root.querySelector('#demo-svg'),inputs=['thickness','modulus','density'].map(k=>root.querySelector(`#demo-${k}`));
  function draw(){const h=+inputs[0].value/1000,E=+inputs[1].value*1e9,rho=+inputs[2].value,nu=.33,D=E*h**3/(12*(1-nu*nu)),m=rho*h,fc=AIR_C**2/TAU*Math.sqrt(m/D),fs=Array.from({length:220},(_,i)=>10**(1+i*3.7/219)),ka=fs.map(f=>TAU*f/AIR_C),kb=fs.map(f=>(m*(TAU*f)**2/D)**.25),sx=f=>70+(Math.log10(f)-1)/3.7*860,all=[...ka,...kb],ymin=Math.min(...all),ymax=Math.max(...all),sy=k=>370-(Math.log10(k)-Math.log10(ymin))/(Math.log10(ymax)-Math.log10(ymin))*315;root.querySelector('#out-thickness').textContent=(h*1000).toFixed(1)+' mm';root.querySelector('#out-modulus').textContent=(E/1e9).toFixed(0)+' GPa';root.querySelector('#out-density').textContent=rho.toFixed(0)+' kg/m³';svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/>${axesSvg({x:70,y:35,w:860,h:335,xLabel:'frequency (Hz, log)',yLabel:'wavenumber (1/m, log)'})}<path d="${pathXY(fs,ka,sx,sy)}" fill="none" stroke="#b96d37" stroke-width="4"/><path d="${pathXY(fs,kb,sx,sy)}" fill="none" stroke="#1e6077" stroke-width="4"/><line x1="${sx(fc)}" y1="35" x2="${sx(fc)}" y2="370" stroke="#172027" stroke-dasharray="7 5"/><circle cx="${sx(fc)}" cy="${sy(TAU*fc/AIR_C)}" r="7" fill="#172027"/><text x="${clamp(sx(fc)+10,90,820)}" y="58" font-size="13" fill="#172027">f<tspan baseline-shift="sub">c</tspan> = ${fc.toFixed(0)} Hz</text><text x="790" y="96" font-size="12" fill="#b96d37">acoustic k</text><text x="790" y="120" font-size="12" fill="#1e6077">bending k</text>`;}
  inputs.forEach(e=>e.addEventListener('input',draw));draw();return()=>{};
}
function mountRing(root){
  root.innerHTML=`<div class="demo-controls">${control('ratio','Frequency / ring frequency',.15,3,.01,1,'')}${control('mode','Circumferential order n',2,7,1,2,'')}${control('speed','Animation speed',0,2,.1,.8,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">Ring frequency is a structural curvature scale, not the acoustic critical frequency. Local shell behavior becomes increasingly plate-like as wavelength becomes small relative to radius.</div>`;
  const svg=root.querySelector('#demo-svg'),rEl=root.querySelector('#demo-ratio'),nEl=root.querySelector('#demo-mode'),sEl=root.querySelector('#demo-speed');let raf,start=performance.now();
  function draw(now){const ratio=+rEl.value,N=+nEl.value,speed=+sEl.value,t=(now-start)/1000*speed,amp=.04+.12/(1+10*(ratio-1)**2),pts=[];for(let i=0;i<=240;i++){const th=TAU*i/240,rr=145*(1+amp*Math.sin(TAU*t)*Math.cos(N*th)),x=340+rr*Math.cos(th),y=220+rr*Math.sin(th);pts.push(`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`);}root.querySelector('#out-ratio').textContent=ratio.toFixed(2);root.querySelector('#out-mode').textContent=N;root.querySelector('#out-speed').textContent=speed.toFixed(1)+'×';const regime=ratio<.7?'curvature / membrane coupling dominant':ratio<1.4?'near ring-frequency transition':'increasingly local plate-like behavior';svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><circle cx="340" cy="220" r="145" fill="none" stroke="#ada497" stroke-dasharray="6 5"/><path d="${pts.join(' ')}Z" fill="#dce9ec" fill-opacity=".55" stroke="#1e6077" stroke-width="5"/><line x1="340" y1="220" x2="485" y2="220" stroke="#899296"/><text x="650" y="95" font-size="17" font-weight="700" fill="#172027">${regime}</text><text x="650" y="135" font-size="13" fill="#5f6b70">f / f<tspan baseline-shift="sub">r</tspan> = ${ratio.toFixed(2)}</text><text x="650" y="174" font-size="13" fill="#5f6b70">circumferential order n = ${N}</text><text x="650" y="235" font-size="13" fill="#5f6b70">The exaggerated deformation is illustrative.</text>`;raf=requestAnimationFrame(draw);}raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}
function mountPsd(root){
  root.innerHTML=`<div class="demo-controls">${control('fn','Resonance frequency',30,1200,5,250,' Hz')}${control('zeta','Damping ratio',.01,.25,.005,.05,'')}${control('level','PSD level scale',.25,4,.05,1,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">The response is the input PSD multiplied by |H(f)|². Move the resonance across the input plateaus and watch both spectral shape and response RMS change.</div>`;
  const svg=root.querySelector('#demo-svg'),els=['fn','zeta','level'].map(k=>root.querySelector(`#demo-${k}`));
  function draw(){const fn=+els[0].value,z=+els[1].value,L=+els[2].value,fs=Array.from({length:300},(_,i)=>10**(1+2.4*i/299)),gin=fs.map(f=>L*(f<80?.004:f<200?.012:f<650?.03:f<1200?.01:.004)),gout=fs.map((f,i)=>{const r=f/fn,H2=(1+(2*z*r)**2)/((1-r*r)**2+(2*z*r)**2);return gin[i]*H2;}),rms=Math.sqrt(fs.slice(1).reduce((s,f,i)=>s+.5*(gout[i]+gout[i+1])*(f-fs[i]),0)),sx=f=>70+(Math.log10(f)-1)/2.4*860,all=[...gin,...gout],ymin=Math.max(1e-5,Math.min(...all)),ymax=Math.max(...all),sy=g=>370-(Math.log10(Math.max(g,ymin))-Math.log10(ymin))/(Math.log10(ymax)-Math.log10(ymin))*315;root.querySelector('#out-fn').textContent=fn.toFixed(0)+' Hz';root.querySelector('#out-zeta').textContent=z.toFixed(3);root.querySelector('#out-level').textContent=L.toFixed(2)+'×';svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/>${axesSvg({x:70,y:35,w:860,h:335,xLabel:'frequency (Hz, log)',yLabel:'PSD (log)'})}<path d="${pathXY(fs,gin,sx,sy)}" fill="none" stroke="#899296" stroke-width="3"/><path d="${pathXY(fs,gout,sx,sy)}" fill="none" stroke="#1e6077" stroke-width="4"/><line x1="${sx(fn)}" y1="35" x2="${sx(fn)}" y2="370" stroke="#b96d37" stroke-dasharray="7 5"/><text x="740" y="70" font-size="13" fill="#172027">response RMS = ${rms.toFixed(2)} g</text><text x="740" y="94" font-size="12" fill="#899296">input PSD</text><text x="740" y="118" font-size="12" fill="#1e6077">response PSD</text>`;}
  els.forEach(e=>e.addEventListener('input',draw));draw();return()=>{};
}
function newmarkBank(A,Td,Q){
  const fs=50000,dt=1/fs,N=Math.ceil(.06*fs),sig=Array.from({length:N},(_,i)=>i*dt<=Td?A*G0*Math.sin(Math.PI*i*dt/Td):0),fns=Array.from({length:26},(_,i)=>10**(1.7+2.0*i/25)),z=1/(2*Q),out=[];
  for(const fn of fns){const wn=TAU*fn,k=wn*wn,c=2*z*wn,b=.25,g=.5,a0=1/(b*dt*dt),a1=g/(b*dt),a2=1/(b*dt),a3=1/(2*b)-1,a4=g/b-1,a5=dt*(g/(2*b)-1),ke=k+a0+a1*c;let x=0,v=0,acc=-sig[0],mx=0;for(let i=1;i<N;i++){const p=-sig[i],pe=p+a0*x+a2*v+a3*acc+c*(a1*x+a4*v+a5*acc),xn=pe/ke,an=a0*(xn-x)-a2*v-a3*acc,vn=v+dt*((1-g)*acc+g*an),aa=-c*vn-k*xn;mx=Math.max(mx,Math.abs(aa/G0));x=xn;v=vn;acc=an;}out.push(mx);}return{fns,out};
}
function mountSrs(root){
  root.innerHTML=`<div class="demo-controls">${control('duration','Half-sine duration',.5,15,.25,4,' ms')}${control('amplitude','Pulse amplitude',1,100,1,20,' g')}${control('q','Oscillator Q',2,30,.5,10,'')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">An SRS is the envelope of peak responses from many differently tuned oscillators. Each bar is one oscillator; the curve connects their maxima.</div>`;
  const svg=root.querySelector('#demo-svg'),els=['duration','amplitude','q'].map(k=>root.querySelector(`#demo-${k}`));let timer;
  function draw(){clearTimeout(timer);timer=setTimeout(()=>{const Td=+els[0].value/1000,A=+els[1].value,Q=+els[2].value,{fns,out}=newmarkBank(A,Td,Q),sx=f=>70+(Math.log10(f)-Math.log10(fns[0]))/(Math.log10(fns.at(-1))-Math.log10(fns[0]))*860,ymax=Math.max(...out)*1.12,sy=y=>370-y/ymax*310;root.querySelector('#out-duration').textContent=(Td*1000).toFixed(2)+' ms';root.querySelector('#out-amplitude').textContent=A.toFixed(0)+' g';root.querySelector('#out-q').textContent=Q.toFixed(1);const bars=fns.map((f,i)=>`<rect x="${sx(f)-6}" y="${sy(out[i])}" width="12" height="${370-sy(out[i])}" fill="${i===out.indexOf(Math.max(...out))?'#b96d37':'#9abcc7'}"/>`).join('');svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/>${axesSvg({x:70,y:35,w:860,h:335,xLabel:'oscillator natural frequency (Hz, log)',yLabel:'peak absolute response (g)'})}${bars}<path d="${pathXY(fns,out,sx,sy)}" fill="none" stroke="#1e6077" stroke-width="4"/><text x="720" y="62" font-size="13" fill="#172027">max SRS = ${Math.max(...out).toFixed(1)} g</text>`;},30);}els.forEach(e=>e.addEventListener('input',draw));draw();return()=>clearTimeout(timer);
}
function complexField(re,im){
  return {re,im,magnitude:Math.hypot(re,im),phase:Math.atan2(im,re)};
}

export function spatialCoherence(model,params={}){
  const x=Number(params.x??0),y=Number(params.y??0);
  const f=Math.max(0,Number(params.frequency??500));
  const c=Math.max(1e-9,Number(params.soundSpeed??343));
  const omega=TAU*f;
  if(model==='diffuse'){
    const kr=omega*Math.hypot(x,y)/c;
    return complexField(Math.abs(kr)<1e-10?1:Math.sin(kr)/kr,0);
  }
  if(model==='plane-wave'){
    const incidence=Number(params.incidence??45)*Math.PI/180;
    const azimuth=Number(params.azimuth??25)*Math.PI/180;
    const phase=-(omega/c)*Math.sin(incidence)*(x*Math.cos(azimuth)+y*Math.sin(azimuth));
    return complexField(Math.cos(phase),Math.sin(phase));
  }
  if(model==='tbl'){
    const velocity=Math.max(1e-9,Number(params.velocity??180));
    const alphaX=Math.max(0,Number(params.alphaX??.12));
    const alphaY=Math.max(0,Number(params.alphaY??.7));
    const magnitude=Math.exp(-omega*(alphaX*Math.abs(x)+alphaY*Math.abs(y))/velocity);
    const phase=-omega*x/velocity;
    return complexField(magnitude*Math.cos(phase),magnitude*Math.sin(phase));
  }
  throw new Error('Unknown spatial field model: '+model);
}

export function jointAcceptance(model,params={}){
  const fieldModel=model==='plane'?'plane-wave':model;
  if(!['uniform','diffuse','plane-wave','tbl'].includes(fieldModel))throw new Error('Unknown joint-acceptance field model: '+model);
  const length=Math.max(.05,Number(params.length??2));
  const width=Math.max(.05,Number(params.width??1.2));
  const modeX=Math.max(1,Math.round(Number(params.modeX??3)));
  const modeY=Math.max(1,Math.round(Number(params.modeY??1)));
  const gridX=clamp(Math.round(Number(params.gridX??25)),7,81);
  const gridY=clamp(Math.round(Number(params.gridY??15)),5,61);
  const xs=Array.from({length:gridX},(_,index)=>((index+.5)/gridX-.5)*length);
  const ys=Array.from({length:gridY},(_,index)=>((index+.5)/gridY-.5)*width);
  const phiX=xs.map(x=>Math.sin(modeX*Math.PI*(x/length+.5)));
  const phiY=ys.map(y=>Math.sin(modeY*Math.PI*(y/width+.5)));
  const cells=gridX*gridY;
  const modeShape=new Float64Array(cells);
  const referenceField=new Float64Array(cells);
  const contribution=new Float64Array(cells);
  let cursor=0;
  for(let iy=0;iy<gridY;iy++){
    for(let ix=0;ix<gridX;ix++){
      modeShape[cursor]=phiX[ix]*phiY[iy];
      referenceField[cursor]=fieldModel==='uniform'?1:spatialCoherence(fieldModel,{...params,x:xs[ix],y:ys[iy]}).re;
      cursor++;
    }
  }

  if(fieldModel!=='diffuse'){
    const frequency=Math.max(0,Number(params.frequency??135));
    const omega=TAU*frequency;
    const soundSpeed=Math.max(1e-9,Number(params.soundSpeed??343));
    const incidence=Number(params.incidence??55)*Math.PI/180;
    const azimuth=Number(params.azimuth??0)*Math.PI/180;
    const velocity=Math.max(1e-9,Number(params.velocity??180));
    const alphaX=Math.max(0,Number(params.alphaX??.12));
    const alphaY=Math.max(0,Number(params.alphaY??.7));
    const solveAxis=(coordinates,shape,axis)=>{
      const re=new Float64Array(coordinates.length),im=new Float64Array(coordinates.length);
      for(let i=0;i<coordinates.length;i++){
        let sumRe=0,sumIm=0;
        for(let j=0;j<coordinates.length;j++){
          const delta=coordinates[i]-coordinates[j];
          let magnitude=1,phase=0;
          if(fieldModel==='plane-wave'){
            const projected=(omega/soundSpeed)*Math.sin(incidence)*(axis==='x'?Math.cos(azimuth):Math.sin(azimuth));
            phase=-projected*delta;
          }else if(fieldModel==='tbl'){
            magnitude=Math.exp(-omega*(axis==='x'?alphaX:alphaY)*Math.abs(delta)/velocity);
            phase=axis==='x'?-omega*delta/velocity:0;
          }
          sumRe+=magnitude*Math.cos(phase)*shape[j];
          sumIm+=magnitude*Math.sin(phase)*shape[j];
        }
        re[i]=sumRe/coordinates.length;im[i]=sumIm/coordinates.length;
      }
      return {re,im};
    };
    const responseX=solveAxis(xs,phiX,'x'),responseY=solveAxis(ys,phiY,'y');
    cursor=0;
    for(let iy=0;iy<gridY;iy++){
      for(let ix=0;ix<gridX;ix++){
        const coupled=responseX.re[ix]*responseY.re[iy]-responseX.im[ix]*responseY.im[iy];
        contribution[cursor]=modeShape[cursor]*coupled;
        cursor++;
      }
    }
  }else{
    for(let i=0;i<cells;i++){
      const ix=i%gridX,iy=Math.floor(i/gridX);
      let coupled=0;
      for(let j=0;j<cells;j++){
        const jx=j%gridX,jy=Math.floor(j/gridX);
        const coherence=spatialCoherence('diffuse',{...params,x:xs[ix]-xs[jx],y:ys[iy]-ys[jy]}).re;
        coupled+=coherence*modeShape[j];
      }
      contribution[i]=modeShape[i]*coupled/cells;
    }
  }
  const raw=contribution.reduce((sum,value)=>sum+value,0)/cells;
  const value=clamp(raw,0,1);
  return {
    jointAcceptance:value,
    modalForceRatio:Math.sqrt(value),
    gridX,gridY,x:xs,y:ys,
    modeShape,referenceField,contribution
  };
}

function mixRgb(a,b,t){
  return a.map((value,index)=>Math.round(value+(b[index]-value)*t));
}
function hslRgb(h,s,l){
  h=((h%360)+360)%360/360;
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const channel=t=>{
    t=(t+1)%1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  return [channel(h+1/3),channel(h),channel(h-1/3)].map(value=>Math.round(255*value));
}
function spatialPalette(mode){
  const colors=new Uint8ClampedArray(256*3);
  const neutral=[231,226,216],cool=[30,96,119],warm=[185,109,55];
  for(let i=0;i<256;i++){
    const t=i/255;
    let rgb;
    if(mode==='magnitude')rgb=mixRgb(neutral,cool,Math.sqrt(t));
    else if(mode==='phase')rgb=hslRgb(205+360*t,.52,.47);
    else {
      const value=2*t-1;
      rgb=value<0?mixRgb(neutral,warm,-value):mixRgb(neutral,cool,value);
    }
    colors.set(rgb,i*3);
  }
  return colors;
}
function drawSpatialArrow(ctx,x1,y1,x2,y2){
  const angle=Math.atan2(y2-y1,x2-x1),head=7;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
  ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle-.6),y2-head*Math.sin(angle-.6));
  ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle+.6),y2-head*Math.sin(angle+.6));
  ctx.stroke();
}

function mountSpatial(root){
  root.classList.add('spatial-demo');
  root.innerHTML=[
    '<div class="spatial-control-groups">',
      '<section class="spatial-control-group" aria-labelledby="spatial-common-controls"><h2 id="spatial-common-controls">Shared field</h2><div class="spatial-control-row">',
        control('frequency','Frequency',25,2500,5,500,' Hz'),
        control('sound-speed','Sound speed',250,1500,1,343,' m/s'),
        '<div class="demo-control"><label for="demo-display">Displayed quantity</label><select id="demo-display"><option value="real">Real correlation</option><option value="magnitude">Magnitude |Γ|</option><option value="phase">Phase ∠Γ</option><option value="animated">Reference-phased animation</option></select></div>',
        control('animation-speed','Animation speed',0,1,.05,.25,'×'),
      '</div></section>',
      '<section class="spatial-control-group" aria-labelledby="spatial-wave-controls"><h2 id="spatial-wave-controls">Plane wave</h2><div class="spatial-control-row">',
        control('incidence','Incidence from normal',0,90,1,55,'°'),
        control('azimuth','Azimuth',-180,180,1,25,'°'),
      '</div></section>',
      '<section class="spatial-control-group" aria-labelledby="spatial-tbl-controls"><h2 id="spatial-tbl-controls">Boundary layer</h2><div class="spatial-control-row">',
        control('velocity','Convection speed',20,350,5,180,' m/s'),
        control('alpha-x','Streamwise decay αx',.02,.8,.01,.12,''),
        control('alpha-y','Spanwise decay αy',.05,1.5,.01,.7,''),
      '</div></section>',
    '</div>',
    '<div class="spatial-plate-grid">',
      '<article class="spatial-plate-panel"><header><p class="eyebrow">Isotropic model</p><h2 id="spatial-title-diffuse">Diffuse acoustic</h2><p id="spatial-metric-diffuse"></p></header><canvas id="spatial-canvas-diffuse" width="300" height="180" aria-labelledby="spatial-title-diffuse spatial-metric-diffuse">Diffuse acoustic spatial correlation over the plate.</canvas></article>',
      '<article class="spatial-plate-panel"><header><p class="eyebrow">Deterministic model</p><h2 id="spatial-title-wave">Propagating wave</h2><p id="spatial-metric-wave"></p></header><canvas id="spatial-canvas-wave" width="300" height="180" aria-labelledby="spatial-title-wave spatial-metric-wave">Propagating plane-wave spatial correlation over the plate.</canvas></article>',
      '<article class="spatial-plate-panel"><header><p class="eyebrow">Corcos model</p><h2 id="spatial-title-tbl">Turbulent boundary layer</h2><p id="spatial-metric-tbl"></p></header><canvas id="spatial-canvas-tbl" width="300" height="180" aria-labelledby="spatial-title-tbl spatial-metric-tbl">Turbulent-boundary-layer spatial correlation over the plate.</canvas></article>',
    '</div>',
    '<div class="spatial-readout"><div class="spatial-legend"><span id="spatial-legend-title">Real correlation</span><div id="spatial-legend-ramp" aria-hidden="true"></div><div class="spatial-legend-labels"><span id="spatial-legend-low">−1</span><span id="spatial-legend-mid">0</span><span id="spatial-legend-high">+1</span></div></div><p id="spatial-probe" aria-live="polite">Reference point: center of the 2.0 m × 1.2 m plate. Γ = 1 + 0i for all three models.</p></div>',
    '<div class="demo-caption">All fields are narrowband complex coherence relative to the plate center. Diffuse acoustic coherence uses the three-dimensional isotropic sinc model; the plane wave is ideally coherent; the boundary layer uses streamwise and spanwise Corcos decay. The animation shows Re{Γe<sup>iωt</sup>}, not a stochastic pressure realization.</div>'
  ].join('');

  const plateLength=2,plateWidth=1.2;
  const models=['diffuse','plane-wave','tbl'];
  const names=['Diffuse acoustic','Propagating wave','Turbulent boundary layer'];
  const canvases=[
    root.querySelector('#spatial-canvas-diffuse'),
    root.querySelector('#spatial-canvas-wave'),
    root.querySelector('#spatial-canvas-tbl')
  ];
  const contexts=canvases.map(canvas=>canvas.getContext('2d'));
  const images=contexts.map((ctx,index)=>ctx.createImageData(canvases[index].width,canvases[index].height));
  const fields=[];
  const start=performance.now();
  let params,animationFrame=0,pendingFrame=0,lastAnimatedFrame=0;

  const input=id=>root.querySelector('#demo-'+id);
  const output=(id,value)=>{const el=root.querySelector('#out-'+id);if(el)el.textContent=value;};
  function readParams(){
    return {
      frequency:+input('frequency').value,
      soundSpeed:+input('sound-speed').value,
      display:input('display').value,
      animationSpeed:+input('animation-speed').value,
      incidence:+input('incidence').value,
      azimuth:+input('azimuth').value,
      velocity:+input('velocity').value,
      alphaX:+input('alpha-x').value,
      alphaY:+input('alpha-y').value
    };
  }
  function updateControls(){
    output('frequency',params.frequency.toFixed(0)+' Hz');
    output('sound-speed',params.soundSpeed.toFixed(0)+' m/s');
    output('animation-speed',params.animationSpeed.toFixed(2)+'×');
    output('incidence',params.incidence.toFixed(0)+'°');
    output('azimuth',params.azimuth.toFixed(0)+'°');
    output('velocity',params.velocity.toFixed(0)+' m/s');
    output('alpha-x',params.alphaX.toFixed(2));
    output('alpha-y',params.alphaY.toFixed(2));
    input('animation-speed').disabled=params.display!=='animated';
    const lambda=params.soundSpeed/params.frequency;
    const projected=Math.sin(params.incidence*Math.PI/180);
    root.querySelector('#spatial-metric-diffuse').textContent='λ = '+lambda.toFixed(3)+' m · first zero at '+(lambda/2).toFixed(3)+' m';
    root.querySelector('#spatial-metric-wave').textContent=projected<1e-6?'uniform phase at normal incidence':'projected λ = '+(lambda/projected).toFixed(3)+' m';
    const omega=TAU*params.frequency;
    root.querySelector('#spatial-metric-tbl').textContent='e-fold lengths: Lx '+(params.velocity/(params.alphaX*omega)).toFixed(3)+' m · Ly '+(params.velocity/(params.alphaY*omega)).toFixed(3)+' m';
    const legendTitle=root.querySelector('#spatial-legend-title');
    const ramp=root.querySelector('#spatial-legend-ramp');
    const low=root.querySelector('#spatial-legend-low'),mid=root.querySelector('#spatial-legend-mid'),high=root.querySelector('#spatial-legend-high');
    if(params.display==='magnitude'){
      legendTitle.textContent='Coherence magnitude |Γ|';ramp.className='magnitude';low.textContent='0';mid.textContent='0.5';high.textContent='1';
    }else if(params.display==='phase'){
      legendTitle.textContent='Wrapped phase ∠Γ';ramp.className='phase';low.textContent='−π';mid.textContent='0';high.textContent='+π';
    }else{
      legendTitle.textContent=params.display==='animated'?'Reference-phased value':'Real correlation Re{Γ}';ramp.className='signed';low.textContent='−1';mid.textContent='0';high.textContent='+1';
    }
  }
  function buildFields(){
    fields.length=0;
    for(let m=0;m<models.length;m++){
      const canvas=canvases[m],re=new Float32Array(canvas.width*canvas.height),im=new Float32Array(re.length);
      let index=0;
      for(let py=0;py<canvas.height;py++){
        const y=(.5-(py+.5)/canvas.height)*plateWidth;
        for(let px=0;px<canvas.width;px++){
          const x=((px+.5)/canvas.width-.5)*plateLength;
          const value=spatialCoherence(models[m],{...params,x,y});
          re[index]=value.re;im[index]=value.im;index++;
        }
      }
      fields.push({re,im});
    }
  }
  function drawOverlay(ctx,model){
    const width=ctx.canvas.width,height=ctx.canvas.height,cx=width/2,cy=height/2;
    ctx.save();
    ctx.strokeStyle='rgba(23,32,39,.28)';ctx.lineWidth=1;
    for(let n=1;n<4;n++){ctx.beginPath();ctx.moveTo(width*n/4,0);ctx.lineTo(width*n/4,height);ctx.stroke();}
    for(let n=1;n<4;n++){ctx.beginPath();ctx.moveTo(0,height*n/4);ctx.lineTo(width,height*n/4);ctx.stroke();}
    ctx.strokeStyle='rgba(23,32,39,.72)';ctx.lineWidth=2;ctx.strokeRect(1,1,width-2,height-2);
    ctx.fillStyle='#faf8f2';ctx.beginPath();ctx.arc(cx,cy,6,0,TAU);ctx.fill();
    ctx.fillStyle='#172027';ctx.beginPath();ctx.arc(cx,cy,3.5,0,TAU);ctx.fill();
    ctx.font='11px system-ui, sans-serif';ctx.fillStyle='#172027';ctx.fillText('center reference',cx+9,cy-8);
    ctx.strokeStyle='#b96d37';ctx.fillStyle='#b96d37';ctx.lineWidth=2;
    if(model==='plane-wave'){
      const angle=params.azimuth*Math.PI/180;
      drawSpatialArrow(ctx,24,24,24+42*Math.cos(angle),24-42*Math.sin(angle));
    }else if(model==='tbl')drawSpatialArrow(ctx,22,24,76,24);
    ctx.fillStyle='rgba(23,32,39,.78)';ctx.fillText('x: '+plateLength.toFixed(1)+' m',9,height-10);
    ctx.save();ctx.translate(width-9,height-10);ctx.rotate(-Math.PI/2);ctx.fillText('y: '+plateWidth.toFixed(1)+' m',0,0);ctx.restore();
    ctx.restore();
  }
  function renderFrame(now){
    const palette=spatialPalette(params.display);
    const animationPhase=TAU*((now-start)/1000)*params.animationSpeed;
    const cosTime=Math.cos(animationPhase),sinTime=Math.sin(animationPhase);
    for(let m=0;m<models.length;m++){
      const field=fields[m],pixels=images[m].data;
      for(let i=0;i<field.re.length;i++){
        let value,paletteIndex;
        if(params.display==='magnitude'){
          value=Math.hypot(field.re[i],field.im[i]);
          paletteIndex=Math.round(clamp(value,0,1)*255);
        }else if(params.display==='phase'){
          value=Math.atan2(field.im[i],field.re[i]);
          paletteIndex=Math.round(clamp((value+Math.PI)/TAU,0,1)*255);
        }else{
          value=params.display==='animated'?field.re[i]*cosTime-field.im[i]*sinTime:field.re[i];
          paletteIndex=Math.round((clamp(value,-1,1)+1)*127.5);
        }
        const source=paletteIndex*3,target=i*4;
        pixels[target]=palette[source];pixels[target+1]=palette[source+1];pixels[target+2]=palette[source+2];pixels[target+3]=255;
      }
      contexts[m].putImageData(images[m],0,0);
      drawOverlay(contexts[m],models[m]);
    }
  }
  function stopAnimation(){
    if(animationFrame)cancelAnimationFrame(animationFrame);
    animationFrame=0;lastAnimatedFrame=0;
  }
  function animate(now){
    if(now-lastAnimatedFrame>=32){renderFrame(now);lastAnimatedFrame=now;}
    animationFrame=requestAnimationFrame(animate);
  }
  function applyInputs(){
    pendingFrame=0;stopAnimation();params=readParams();updateControls();buildFields();renderFrame(performance.now());
    if(params.display==='animated'&&params.animationSpeed>0)animationFrame=requestAnimationFrame(animate);
  }
  function queueInputs(){
    if(pendingFrame)cancelAnimationFrame(pendingFrame);
    pendingFrame=requestAnimationFrame(applyInputs);
  }
  function resetProbe(){
    root.querySelector('#spatial-probe').textContent='Reference point: center of the 2.0 m × 1.2 m plate. Γ = 1 + 0i for all three models.';
  }
  canvases.forEach((canvas,index)=>{
    canvas.addEventListener('pointermove',event=>{
      const rect=canvas.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width*plateLength-plateLength/2;
      const y=plateWidth/2-(event.clientY-rect.top)/rect.height*plateWidth;
      const value=spatialCoherence(models[index],{...params,x,y});
      root.querySelector('#spatial-probe').textContent=names[index]+' · x '+x.toFixed(3)+' m · y '+y.toFixed(3)+' m · |Γ| '+value.magnitude.toFixed(3)+' · phase '+(value.phase*180/Math.PI).toFixed(1)+'°';
    });
    canvas.addEventListener('pointerleave',resetProbe);
  });
  root.querySelectorAll('input,select').forEach(element=>element.addEventListener('input',queueInputs));
  applyInputs();
  return()=>{
    stopAnimation();
    if(pendingFrame)cancelAnimationFrame(pendingFrame);
    root.classList.remove('spatial-demo');
  };
}

function drawAcceptanceMap(canvas,values,gridX,gridY,limit=1){
  const ctx=canvas.getContext('2d'),palette=spatialPalette('real');
  const cellWidth=canvas.width/gridX,cellHeight=canvas.height/gridY;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const scale=Math.max(1e-12,limit);
  for(let iy=0;iy<gridY;iy++){
    for(let ix=0;ix<gridX;ix++){
      const value=clamp(values[iy*gridX+ix]/scale,-1,1);
      const paletteIndex=Math.round((value+1)*127.5),source=paletteIndex*3;
      ctx.fillStyle='rgb('+palette[source]+','+palette[source+1]+','+palette[source+2]+')';
      ctx.fillRect(ix*cellWidth,(gridY-1-iy)*cellHeight,Math.ceil(cellWidth)+.25,Math.ceil(cellHeight)+.25);
    }
  }
  ctx.strokeStyle='rgba(23,32,39,.72)';ctx.lineWidth=2;ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);
  ctx.strokeStyle='rgba(23,32,39,.2)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(canvas.width/2,0);ctx.lineTo(canvas.width/2,canvas.height);
  ctx.moveTo(0,canvas.height/2);ctx.lineTo(canvas.width,canvas.height/2);ctx.stroke();
  ctx.fillStyle='rgba(23,32,39,.78)';ctx.font='11px system-ui, sans-serif';
  ctx.fillText('x',canvas.width-14,canvas.height/2-7);ctx.fillText('y',canvas.width/2+7,13);
}

function drawAcceptanceSweep(canvas,coordinates,values,currentCoordinate,currentValue,options={}){
  const ctx=canvas.getContext('2d'),left=66,right=24,top=32,bottom=48;
  const width=canvas.width-left-right,height=canvas.height-top-bottom;
  const xMin=coordinates[0],xMax=coordinates.at(-1),jMin=1e-5,jMax=1;
  const x=value=>options.xScale==='log'
    ?left+(Math.log10(value)-Math.log10(xMin))/(Math.log10(xMax)-Math.log10(xMin))*width
    :left+(value-xMin)/(xMax-xMin)*width;
  const y=value=>top+(Math.log10(jMax)-Math.log10(clamp(value,jMin,jMax)))/(Math.log10(jMax)-Math.log10(jMin))*height;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#faf8f2';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font='12px system-ui, sans-serif';ctx.fillStyle='#5f6b70';ctx.strokeStyle='#d2cabd';ctx.lineWidth=1;
  for(const tick of [1e-5,1e-4,1e-3,1e-2,1e-1,1]){
    const py=y(tick);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(left+width,py);ctx.stroke();
    ctx.fillText(tick===1?'1':tick.toExponential(0),8,py+4);
  }
  for(const tick of options.xTicks||[]){
    if(tick<xMin||tick>xMax)continue;
    const px=x(tick);ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px,top+height);ctx.stroke();
    ctx.textAlign='center';ctx.fillText(options.formatX?options.formatX(tick):String(tick),px,canvas.height-20);
  }
  for(const [index,marker] of (options.markers||[]).entries()){
    if(marker.value<xMin||marker.value>xMax)continue;
    const px=x(marker.value);
    ctx.save();ctx.strokeStyle=marker.color||'#657176';ctx.lineWidth=1.5;ctx.setLineDash(marker.dash||[6,5]);
    ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px,top+height);ctx.stroke();ctx.restore();
    ctx.fillStyle=marker.color||'#657176';ctx.font='11px system-ui, sans-serif';ctx.textAlign=px>left+width*.72?'right':'left';
    ctx.fillText(marker.label,px+(ctx.textAlign==='right'?-5:5),top+13+index*14);
  }
  ctx.textAlign='left';ctx.strokeStyle='#657176';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,top+height);ctx.lineTo(left+width,top+height);ctx.stroke();
  ctx.strokeStyle='#1e6077';ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();
  coordinates.forEach((coordinate,index)=>{const px=x(coordinate),py=y(values[index]);if(index)ctx.lineTo(px,py);else ctx.moveTo(px,py);});ctx.stroke();
  for(const marker of options.markers||[]){
    if(marker.value<xMin||marker.value>xMax||!Number.isFinite(marker.pointValue))continue;
    ctx.fillStyle='#faf8f2';ctx.strokeStyle=marker.color||'#657176';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(x(marker.value),y(marker.pointValue),5,0,TAU);ctx.fill();ctx.stroke();
  }
  const pointX=x(clamp(currentCoordinate,xMin,xMax)),pointY=y(currentValue);
  ctx.fillStyle='#b96d37';ctx.beginPath();ctx.arc(pointX,pointY,7,0,TAU);ctx.fill();
  ctx.fillStyle='#172027';ctx.font='13px system-ui, sans-serif';ctx.fillText('Joint acceptance J',left,17);
  ctx.textAlign='center';ctx.fillText(options.xLabel||'',left+width/2,canvas.height-4);ctx.textAlign='left';
}

function mountJointAcceptance(root){
  root.classList.add('acceptance-demo');
  root.innerHTML=[
    '<div class="spatial-control-groups acceptance-control-groups">',
      '<section class="spatial-control-group" aria-labelledby="ja-panel-controls"><h2 id="ja-panel-controls">Simply supported panel</h2><div class="spatial-control-row">',
        control('ja-length','Length L',.5,4,.1,2,' m'),
        control('ja-width','Width W',.3,2.5,.1,1.2,' m'),
        control('ja-mode-x','Streamwise mode m',1,6,1,3,''),
        control('ja-mode-y','Spanwise mode n',1,6,1,1,''),
      '</div></section>',
      '<section class="spatial-control-group" aria-labelledby="ja-field-controls"><h2 id="ja-field-controls">Pressure field</h2><div class="spatial-control-row">',
        '<div class="demo-control acceptance-field-select"><label for="demo-ja-field">Field model</label><select id="demo-ja-field"><option value="uniform">Uniform coherent</option><option value="diffuse">Diffuse acoustic</option><option value="plane-wave">Propagating wave</option><option value="tbl" selected>Turbulent boundary layer</option></select></div>',
        control('ja-frequency','Frequency',25,2500,5,135,' Hz'),
        control('ja-sound-speed','Sound speed',250,1500,1,343,' m/s'),
      '</div></section>',
      '<section class="spatial-control-group" aria-labelledby="ja-direction-controls"><h2 id="ja-direction-controls">Direction and coherence</h2><div class="spatial-control-row">',
        control('ja-incidence','Incidence from normal',0,90,1,55,'°'),
        control('ja-azimuth','Azimuth',-180,180,1,0,'°'),
        control('ja-velocity','Convection speed',20,350,5,180,' m/s'),
        control('ja-alpha-x','Streamwise decay αx',.02,.8,.01,.12,''),
        control('ja-alpha-y','Spanwise decay αy',.05,1.5,.01,.7,''),
      '</div></section>',
    '</div>',
    '<div class="acceptance-summary" aria-live="polite">',
      '<div><span>Joint acceptance J<sub>mn</sub></span><strong id="ja-value">—</strong><small>modal-force PSD / (point-pressure PSD × area²)</small></div>',
      '<div><span>Modal force ratio √J</span><strong id="ja-force-ratio">—</strong><small>F<sub>modal,rms</sub> / (p<sub>rms</sub>A)</small></div>',
      '<p id="ja-insight">Calculating the field-to-mode overlap…</p>',
    '</div>',
    '<div class="acceptance-visual-grid">',
      '<article class="spatial-plate-panel"><header><p class="eyebrow">Forcing</p><h2 id="ja-pressure-title">Pressure correlation pattern</h2><p id="ja-pressure-note"></p></header><canvas id="ja-pressure-map" width="300" height="180" aria-labelledby="ja-pressure-title ja-pressure-note">Real pressure coherence relative to the panel center.</canvas></article>',
      '<article class="spatial-plate-panel"><header><p class="eyebrow">Structure</p><h2 id="ja-mode-title">Selected panel mode</h2><p id="ja-mode-note"></p></header><canvas id="ja-mode-map" width="300" height="180" aria-labelledby="ja-mode-title ja-mode-note">Selected simply supported panel mode shape.</canvas></article>',
      '<article class="spatial-plate-panel"><header><p class="eyebrow">Coupling</p><h2 id="ja-contribution-title">Local acceptance contribution</h2><p id="ja-contribution-note"></p></header><canvas id="ja-contribution-map" width="300" height="180" aria-labelledby="ja-contribution-title ja-contribution-note">Signed local contributions to joint acceptance.</canvas></article>',
    '</div>',
    '<section class="acceptance-sweep" aria-labelledby="ja-sweep-title"><header><div><h2 id="ja-sweep-title">Joint acceptance versus convection velocity</h2><p id="ja-peak-note"></p></div></header><canvas id="ja-sweep" width="1000" height="300" aria-labelledby="ja-sweep-title ja-peak-note">Convection-velocity sweep of normalized joint acceptance for the selected TBL field and panel mode.</canvas></section>',
    '<div class="demo-caption">Joint acceptance is the pressure CSD projected twice through the selected mode shape: J<sub>mn</sub> = (1/A²) ∬ φ<sub>mn</sub>(x) Γ(x,x′) φ<sub>mn</sub>(x′) dA dA′. For TBL forcing, sweep U<sub>c</sub> to see where the convective ridge overlaps the streamwise modal wavenumber. Blue regions contribute positively; orange regions cancel. The pressure panel shows Re{Γ} relative to the center—not an instantaneous random-pressure realization.</div>'
  ].join('');

  const input=id=>root.querySelector('#demo-'+id);
  const output=(id,value)=>{const element=root.querySelector('#out-'+id);if(element)element.textContent=value;};
  let pendingFrame=0;
  function readParams(){
    return {
      model:input('ja-field').value,
      length:+input('ja-length').value,width:+input('ja-width').value,
      modeX:Math.round(+input('ja-mode-x').value),modeY:Math.round(+input('ja-mode-y').value),
      frequency:+input('ja-frequency').value,soundSpeed:+input('ja-sound-speed').value,
      incidence:+input('ja-incidence').value,azimuth:+input('ja-azimuth').value,
      velocity:+input('ja-velocity').value,alphaX:+input('ja-alpha-x').value,alphaY:+input('ja-alpha-y').value
    };
  }
  function updateControls(params){
    output('ja-length',params.length.toFixed(1)+' m');output('ja-width',params.width.toFixed(1)+' m');
    output('ja-mode-x',String(params.modeX));output('ja-mode-y',String(params.modeY));
    output('ja-frequency',params.frequency.toFixed(0)+' Hz');output('ja-sound-speed',params.soundSpeed.toFixed(0)+' m/s');
    output('ja-incidence',params.incidence.toFixed(0)+'°');output('ja-azimuth',params.azimuth.toFixed(0)+'°');
    output('ja-velocity',params.velocity.toFixed(0)+' m/s');output('ja-alpha-x',params.alphaX.toFixed(2));output('ja-alpha-y',params.alphaY.toFixed(2));
    const acoustic=params.model==='diffuse'||params.model==='plane-wave',wave=params.model==='plane-wave',tbl=params.model==='tbl';
    input('ja-sound-speed').disabled=!acoustic;input('ja-incidence').disabled=!wave;input('ja-azimuth').disabled=!wave;
    input('ja-velocity').disabled=!tbl;input('ja-alpha-x').disabled=!tbl;input('ja-alpha-y').disabled=!tbl;
  }
  function render(){
    pendingFrame=0;
    const params=readParams();updateControls(params);
    const result=jointAcceptance(params.model,{...params,gridX:25,gridY:15});
    const modelNames={uniform:'Uniform coherent',diffuse:'Diffuse acoustic','plane-wave':'Propagating wave',tbl:'Turbulent boundary layer'};
    root.querySelector('#ja-value').textContent=result.jointAcceptance.toFixed(4);
    root.querySelector('#ja-force-ratio').textContent=result.modalForceRatio.toFixed(4);
    root.querySelector('#ja-mode-note').textContent='φ'+params.modeX+params.modeY+' = sin('+params.modeX+'πx/L) sin('+params.modeY+'πy/W)';
    let fieldNote;
    if(params.model==='uniform')fieldNote='constant phase and full spatial coherence';
    else if(params.model==='diffuse')fieldNote='acoustic wavelength '+(params.soundSpeed/params.frequency).toFixed(3)+' m';
    else if(params.model==='plane-wave'){
      const projected=Math.sin(params.incidence*Math.PI/180);
      fieldNote=projected<1e-6?'uniform phase at normal incidence':'projected wavelength '+(params.soundSpeed/(params.frequency*projected)).toFixed(3)+' m';
    }else fieldNote='convective λ '+(params.velocity/params.frequency).toFixed(3)+' m · panel λx '+(2*params.length/params.modeX).toFixed(3)+' m';
    root.querySelector('#ja-pressure-note').textContent=modelNames[params.model]+' · '+fieldNote;
    const contributionLimit=Math.max(...result.contribution.map(value=>Math.abs(value)),1e-12);
    root.querySelector('#ja-contribution-note').textContent='signed contribution · color normalized to ±'+contributionLimit.toFixed(3);
    drawAcceptanceMap(root.querySelector('#ja-pressure-map'),result.referenceField,result.gridX,result.gridY,1);
    drawAcceptanceMap(root.querySelector('#ja-mode-map'),result.modeShape,result.gridX,result.gridY,1);
    drawAcceptanceMap(root.querySelector('#ja-contribution-map'),result.contribution,result.gridX,result.gridY,contributionLimit);

    const sweepTitle=root.querySelector('#ja-sweep-title'),peakNote=root.querySelector('#ja-peak-note'),sweepCanvas=root.querySelector('#ja-sweep');
    if(params.model==='tbl'){
      const velocityMin=+input('ja-velocity').min,velocityMax=+input('ja-velocity').max;
      const velocities=Array.from({length:111},(_,index)=>velocityMin+(velocityMax-velocityMin)*index/110);
      const values=velocities.map(velocity=>jointAcceptance('tbl',{...params,velocity,gridX:17,gridY:11}).jointAcceptance);
      let peakIndex=0;for(let index=1;index<values.length;index++)if(values[index]>values[peakIndex])peakIndex=index;
      const peakVelocity=velocities[peakIndex],peakValue=values[peakIndex],relative=peakValue>0?result.jointAcceptance/peakValue:0;
      const matchVelocity=2*params.frequency*params.length/params.modeX;
      const interiorPeak=peakIndex>0&&peakIndex<values.length-1;
      const matchInRange=matchVelocity>=velocityMin&&matchVelocity<=velocityMax;
      sweepTitle.textContent='Joint acceptance versus convection velocity';
      peakNote.textContent=(interiorPeak?'full Corcos peak':'largest value in displayed range')+': J = '+peakValue.toFixed(4)+' near Uc = '+peakVelocity.toFixed(0)+' m/s · k_c ≈ k_x estimate: '+matchVelocity.toFixed(0)+' m/s'+(matchInRange?'':' (outside plot)');
      sweepCanvas.setAttribute('aria-label','Joint acceptance versus TBL convection velocity, including the numerical peak and nominal wavenumber-match estimate.');
      root.querySelector('#ja-insight').textContent=peakValue<1e-10
        ?'This pressure field is spatially orthogonal to the selected mode: positive and negative generalized-force contributions cancel.'
        :relative>.8
          ?'The selected convection speed lies on the broad acceptance peak, where the convective pressure pattern strongly overlaps this mode.'
          :params.velocity<peakVelocity
            ?'The shorter convective wavelength creates faster phase variation than this mode accepts efficiently, so more of the loading cancels.'
            :'The longer convective wavelength is smoother than the strongest modal match, so alternating modal regions cancel more of the loading.';
      const markers=[];
      if(matchInRange)markers.push({value:matchVelocity,label:'nominal k_c = k_x',color:'#657176',dash:[7,5]});
      if(interiorPeak)markers.push({value:peakVelocity,pointValue:peakValue,label:'full-model peak',color:'#1e6077',dash:[3,4]});
      drawAcceptanceSweep(sweepCanvas,velocities,values,params.velocity,result.jointAcceptance,{
        xScale:'linear',xTicks:[20,50,100,150,200,250,300,350],xLabel:'convection velocity Uc (m/s)',markers
      });
    }else{
      const frequencies=Array.from({length:48},(_,index)=>25*Math.pow(100,index/47));
      const values=frequencies.map(frequency=>jointAcceptance(params.model,{...params,frequency,gridX:17,gridY:11}).jointAcceptance);
      let peakIndex=0;for(let index=1;index<values.length;index++)if(values[index]>values[peakIndex])peakIndex=index;
      const peakValue=values[peakIndex],relative=peakValue>0?result.jointAcceptance/peakValue:0;
      sweepTitle.textContent='Joint acceptance versus frequency';
      peakNote.textContent='peak in displayed band: J = '+peakValue.toFixed(4)+' near '+frequencies[peakIndex].toFixed(0)+' Hz';
      sweepCanvas.setAttribute('aria-label','Frequency sweep of normalized joint acceptance for the selected field and panel mode.');
      root.querySelector('#ja-insight').textContent=peakValue<1e-10
        ?'This field is spatially orthogonal to the selected mode: its positive and negative generalized-force contributions cancel.'
        :relative>.8
          ?'The selected frequency is near this mode’s strongest spatial match in the displayed band.'
          :relative<.1
            ?'Most of the available pressure loading cancels when projected onto this mode at the selected frequency.'
            :'The field partially matches the mode; positive contributions exceed, but do not eliminate, spatial cancellation.';
      drawAcceptanceSweep(sweepCanvas,frequencies,values,params.frequency,result.jointAcceptance,{
        xScale:'log',xTicks:[25,50,100,200,500,1000,2500],xLabel:'frequency (Hz, log)',
        formatX:tick=>tick>=1000?(tick/1000).toFixed(tick===2500?1:0)+'k':String(tick)
      });
    }
  }
  function queueRender(){
    if(pendingFrame)cancelAnimationFrame(pendingFrame);
    pendingFrame=requestAnimationFrame(render);
  }
  root.querySelectorAll('input,select').forEach(element=>element.addEventListener('input',queueRender));
  render();
  return()=>{if(pendingFrame)cancelAnimationFrame(pendingFrame);root.classList.remove('acceptance-demo');};
}

function mountSandwichRegimes(root){
  root.innerHTML=`<div class="demo-controls">${selectControl('hc-panel','Paper panel',[{value:'panel1',label:'Panel 1 · thick facesheets'},{value:'panel2',label:'Panel 2 · thin facesheets'}],'panel1')}${control('hc-frequency','Evaluation frequency',100,10000,25,1000,' Hz')}${control('hc-loss','Loss factor η',.002,.06,.001,.01,'')}</div><div class="demo-canvas-wrap"><svg id="hc-svg" viewBox="0 0 1000 440" role="img" aria-label="Honeycomb sandwich-panel wave speeds and SEA readiness indicators."></svg></div><div class="demo-caption">The effective wave follows thin-plate bending at low frequency and bends toward the core-shear limit. SEA readiness depends on modes per band and modal overlap—not frequency alone.</div>`;
  const svg=root.querySelector('#hc-svg'),panelInput=root.querySelector('#demo-hc-panel'),frequencyInput=root.querySelector('#demo-hc-frequency'),lossInput=root.querySelector('#demo-hc-loss');
  function draw(){
    const panel=honeycombPreset(panelInput.value),frequency=+frequencyInput.value,loss=+lossInput.value,state=honeycombWaveState(panel,frequency,loss),fc=honeycombCoincidenceFrequency(panel),series=honeycombFrequencySeries(panel,100,10000,180,loss),fs=series.frequencies,states=series.states;
    root.querySelector('#out-hc-frequency').textContent=frequency.toFixed(0)+' Hz';root.querySelector('#out-hc-loss').textContent=loss.toFixed(3);
    const sx=f=>70+(Math.log10(f)-2)/2*620,ymax=Math.max(...states.map(q=>q.bendingSpeed),...states.map(q=>q.shearSpeed))*1.05,sy=c=>370-c/ymax*315;
    const readiness=state.modesThirdOctave>=6&&state.modalOverlap>=1?'modally rich + overlapping':state.modesThirdOctave>=6?'band rich; modes still distinct':state.modesThirdOctave>=3?'transition':'sparse modal band';
    svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/>${axesSvg({x:70,y:35,w:620,h:335,xLabel:'frequency (Hz, log)',yLabel:'wave speed (m/s)'})}<path d="${pathXY(fs,states.map(q=>q.bendingSpeed),sx,sy)}" fill="none" stroke="#b96d37" stroke-width="3"/><path d="${pathXY(fs,states.map(q=>q.effectiveSpeed),sx,sy)}" fill="none" stroke="#1e6077" stroke-width="5"/><path d="${pathXY(fs,states.map(q=>q.shearSpeed),sx,sy)}" fill="none" stroke="#744f78" stroke-width="3"/><line x1="70" y1="${sy(343)}" x2="690" y2="${sy(343)}" stroke="#376e56" stroke-width="2" stroke-dasharray="7 5"/><line x1="${sx(fc)}" y1="35" x2="${sx(fc)}" y2="370" stroke="#172027" stroke-dasharray="6 5"/><line x1="${sx(frequency)}" y1="35" x2="${sx(frequency)}" y2="370" stroke="#657176" stroke-dasharray="3 5"/><circle cx="${sx(frequency)}" cy="${sy(state.effectiveSpeed)}" r="7" fill="#172027"/><text x="505" y="62" font-size="12" fill="#b96d37">pure bending</text><text x="505" y="84" font-size="12" fill="#1e6077">effective sandwich wave</text><text x="505" y="106" font-size="12" fill="#744f78">core-shear limit</text><text x="730" y="62" font-size="13" font-weight="700" fill="#172027">${esc(panel.name)}</text><text x="730" y="105" font-size="12" fill="#5f6b70">coincidence</text><text x="730" y="126" font-size="22" font-weight="700" fill="#172027">${fc.toFixed(0)} Hz</text><text x="730" y="171" font-size="12" fill="#5f6b70">modes / third octave</text><text x="730" y="192" font-size="22" font-weight="700" fill="#172027">${state.modesThirdOctave.toFixed(1)}</text><text x="730" y="237" font-size="12" fill="#5f6b70">modal overlap</text><text x="730" y="258" font-size="22" font-weight="700" fill="#172027">${state.modalOverlap.toFixed(2)}</text><text x="730" y="309" font-size="12" fill="#5f6b70">${readiness}</text><text x="730" y="337" font-size="12" fill="#5f6b70">kᵦa = ${state.kba.toFixed(1)}</text>`;
  }
  [panelInput,frequencyInput,lossInput].forEach(element=>element.addEventListener('input',draw));draw();return()=>{};
}

function divergingColor(value){
  const q=clamp((value+1)/2,0,1),left=[185,109,55],middle=[247,245,238],right=[30,96,119],mix=(a,b,t)=>Math.round(a+(b-a)*t),a=q<.5?left:middle,b=q<.5?middle:right,t=q<.5?q*2:(q-.5)*2;
  return `rgb(${mix(a[0],b[0],t)},${mix(a[1],b[1],t)},${mix(a[2],b[2],t)})`;
}
function sequentialColor(value){
  const q=clamp(value,0,1),a=[20,50,61],b=q<.65?[30,96,119]:[185,109,55],t=q<.65?q/.65:(q-.65)/.35,start=q<.65?a:[30,96,119];
  return `rgb(${Math.round(start[0]+(b[0]-start[0])*t)},${Math.round(start[1]+(b[1]-start[1])*t)},${Math.round(start[2]+(b[2]-start[2])*t)})`;
}
function drawCanvasMatrix(ctx,matrix,x,y,width,height,color,valueTransform=value=>value){
  const rows=matrix.length,columns=matrix[0]?.length||0,cellWidth=width/columns,cellHeight=height/rows;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){ctx.fillStyle=color(valueTransform(matrix[row][column]));ctx.fillRect(x+column*cellWidth,y+row*cellHeight,cellWidth+.6,cellHeight+.6);}
}

function mountEnergyBias(root){
  root.innerHTML=`<div class="demo-controls">${selectControl('eb-panel','Paper panel',[{value:'panel1',label:'Panel 1 · 30.5 kg'},{value:'panel2',label:'Panel 2 · 20.0 kg'}],'panel1')}${control('eb-modex','Lengthwise order',1,18,1,2,'')}${control('eb-modey','Widthwise order',0,10,1,1,'')}${control('eb-sensors','Response points',3,126,1,6,'')}${selectControl('eb-layout','Layout',[{value:'paper-six',label:'Paper-like six points'},{value:'regular',label:'Regular grid'},{value:'halton',label:'Quasi-random'}],'paper-six')}</div><div class="demo-canvas-wrap"><canvas id="eb-canvas" width="1000" height="440" role="img" aria-label="Mode shape over an inhomogeneous panel with response points and energy-estimation bias.">Interactive mode-shape and energy-sampling visualization.</canvas></div><div class="demo-caption">The colored field is an illustrative free-edge-like mode. Heavy end doublers change the correct mass weighting; inadequate sensor spacing makes higher-order patterns placement-sensitive.</div>`;
  const canvas=root.querySelector('#eb-canvas'),ctx=canvas.getContext('2d'),inputs=['panel','modex','modey','sensors','layout'].map(key=>root.querySelector(`#demo-eb-${key}`));
  function draw(){
    const panel=honeycombPreset(inputs[0].value),study=inhomogeneousEnergyStudy({panel,modeX:+inputs[1].value,modeY:+inputs[2].value,sensorCount:+inputs[3].value,layout:inputs[4].value});
    root.querySelector('#out-eb-modex').textContent=study.modeX;root.querySelector('#out-eb-modey').textContent=study.modeY;root.querySelector('#out-eb-sensors').textContent=study.sensorCount;
    ctx.clearRect(0,0,1000,440);ctx.fillStyle='#faf8f2';ctx.fillRect(0,0,1000,440);ctx.fillStyle='#172027';ctx.font='700 15px system-ui';ctx.fillText(`Illustrative mode (${study.modeX}, ${study.modeY})`,50,36);
    const x=50,y=70,w=640,h=300;drawCanvasMatrix(ctx,study.modeMatrix,x,y,w,h,divergingColor);ctx.strokeStyle='#657176';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
    const doublerWidth=w*panel.doublerLength/panel.length;ctx.fillStyle='rgba(185,109,55,.22)';ctx.fillRect(x,y,doublerWidth,h);ctx.fillRect(x+w-doublerWidth,y,doublerWidth,h);ctx.strokeStyle='#b96d37';ctx.setLineDash([5,4]);ctx.strokeRect(x,y,doublerWidth,h);ctx.strokeRect(x+w-doublerWidth,y,doublerWidth,h);ctx.setLineDash([]);
    study.sensors.forEach((sensor,index)=>{ctx.beginPath();ctx.arc(x+sensor.x*w,y+sensor.y*h,study.sensorCount>40?3:5,0,TAU);ctx.fillStyle='#172027';ctx.fill();if(study.sensorCount<=12){ctx.fillStyle='#faf8f2';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText(String(index+1),x+sensor.x*w,y+sensor.y*h+3);ctx.textAlign='left';}});
    ctx.fillStyle='#5f6b70';ctx.font='12px system-ui';ctx.fillText('doubler mass regions',50,395);ctx.fillStyle='#172027';ctx.font='700 13px system-ui';ctx.fillText('Mass-weighted reference',735,88);ctx.font='700 24px system-ui';ctx.fillText(study.exactEnergy.toFixed(2),735,118);ctx.font='12px system-ui';ctx.fillStyle='#5f6b70';ctx.fillText('relative energy',835,116);ctx.fillStyle='#172027';ctx.font='700 13px system-ui';ctx.fillText('Uniform-mass bias',735,170);ctx.font='700 24px system-ui';ctx.fillStyle=Math.abs(study.uniformBias)>10?'#8f423a':'#172027';ctx.fillText(`${study.uniformBias>=0?'+':''}${study.uniformBias.toFixed(1)}%`,735,201);ctx.fillStyle='#172027';ctx.font='700 13px system-ui';ctx.fillText('Sparse-layout bias',735,253);ctx.font='700 24px system-ui';ctx.fillStyle=Math.abs(study.sparseBias)>10?'#8f423a':'#172027';ctx.fillText(`${study.sparseBias>=0?'+':''}${study.sparseBias.toFixed(1)}%`,735,284);ctx.fillStyle='#172027';ctx.font='700 13px system-ui';ctx.fillText('Samples per half-wave',735,336);ctx.font='700 24px system-ui';ctx.fillText(study.samplesPerHalfWave.toFixed(2),735,367);ctx.font='12px system-ui';ctx.fillStyle='#5f6b70';ctx.fillText(study.samplesPerHalfWave<2?'spatial aliasing likely':'nominal spacing resolved',735,393);
    canvas.setAttribute('aria-label',`Mode ${study.modeX}, ${study.modeY} on ${panel.name}. The ${study.sensorCount}-point layout has ${study.sparseBias.toFixed(1)} percent energy bias.`);
  }
  inputs.forEach(element=>element.addEventListener('input',draw));draw();return()=>{};
}

function mountWavenumberTransmission(root){
  root.innerHTML=`<div class="demo-controls">${control('wk-frequency','Frequency',400,4000,50,1000,' Hz')}${control('wk-tau','True transmission τ',.02,.8,.01,.20,'')}${control('wk-angle','Incidence angle',0,70,1,20,'°')}${control('wk-delta','Annular half-width δ',.5,8,.25,3,' 1/m')}</div><div class="demo-canvas-wrap"><canvas id="wk-canvas" width="1000" height="440" role="img" aria-label="Spatial response and wavenumber spectra used to recover junction transmission.">Interactive wavenumber-transmission visualization.</canvas></div><div class="demo-caption">A spatial FRF grid is transformed to k-space, filtered around the expected bending-wavenumber ring, and separated by propagation direction. Aperture, spacing, leakage, and filter width all affect the recovered transmission.</div>`;
  const canvas=root.querySelector('#wk-canvas'),ctx=canvas.getContext('2d'),inputs=['frequency','tau','angle','delta'].map(key=>root.querySelector(`#demo-wk-${key}`));let pending=0;
  function draw(){
    const frequency=+inputs[0].value,tau=+inputs[1].value,angle=+inputs[2].value,delta=+inputs[3].value,study=wavenumberTransmissionStudy({frequency,transmission:tau,incidence:angle,deltaK:delta,nx:18,ny:12});
    root.querySelector('#out-wk-frequency').textContent=frequency.toFixed(0)+' Hz';root.querySelector('#out-wk-tau').textContent=tau.toFixed(2);root.querySelector('#out-wk-angle').textContent=angle.toFixed(0)+'°';root.querySelector('#out-wk-delta').textContent=delta.toFixed(2)+' 1/m';
    ctx.clearRect(0,0,1000,440);ctx.fillStyle='#faf8f2';ctx.fillRect(0,0,1000,440);ctx.fillStyle='#172027';ctx.font='700 14px system-ui';ctx.fillText('Panel 1 spatial FRF · real part',40,35);ctx.fillText('Panel 1 k-space',365,35);ctx.fillText('Panel 2 k-space',690,35);
    drawCanvasMatrix(ctx,study.spatial1.map(row=>row.map(value=>value.re)),40,58,270,210,divergingColor,value=>clamp(value/(1+Math.sqrt(1-tau)),-1,1));
    const allPower=[...study.spectrum1.power.flat(),...study.spectrum2.power.flat()],maximum=Math.max(...allPower,1e-30),powerScale=value=>clamp((10*Math.log10(Math.max(value,maximum*1e-8)/maximum)+80)/80,0,1);
    drawCanvasMatrix(ctx,study.spectrum1.power,365,58,270,210,sequentialColor,powerScale);drawCanvasMatrix(ctx,study.spectrum2.power,690,58,270,210,sequentialColor,powerScale);
    for(const [spectrum,x] of [[study.spectrum1,365],[study.spectrum2,690]]){const kxMax=Math.max(...spectrum.kx.map(Math.abs)),kyMax=Math.max(...spectrum.ky.map(Math.abs)),rx=study.state1.wavenumber/kxMax*135,ry=study.state1.wavenumber/kyMax*105;ctx.strokeStyle='#dce9ec';ctx.setLineDash([6,4]);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+135,163,rx,ry,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#657176';ctx.strokeRect(x,58,270,210);}
    ctx.strokeStyle='#657176';ctx.strokeRect(40,58,270,210);ctx.fillStyle='#172027';ctx.font='700 13px system-ui';ctx.fillText('True transmission',60,323);ctx.font='700 25px system-ui';ctx.fillText(tau.toFixed(3),60,355);ctx.font='700 13px system-ui';ctx.fillText('Recovered transmission',315,323);ctx.font='700 25px system-ui';ctx.fillStyle=Math.abs(study.recoveredTransmission/tau-1)>.15?'#8f423a':'#172027';ctx.fillText(study.recoveredTransmission.toFixed(3),315,355);ctx.fillStyle='#172027';ctx.font='700 13px system-ui';ctx.fillText('Recovery error',610,323);ctx.font='700 25px system-ui';ctx.fillText(`${(100*(study.recoveredTransmission/tau-1)).toFixed(1)}%`,610,355);ctx.font='12px system-ui';ctx.fillStyle='#5f6b70';ctx.fillText(`kᵦ = ${study.state1.wavenumber.toFixed(2)} 1/m · Nyquist kx = ${study.kNyquistX.toFixed(1)} 1/m · grid ${study.nx} × ${study.ny}`,60,402);
    canvas.setAttribute('aria-label',`At ${frequency} hertz, true transmission ${tau.toFixed(3)} is recovered as ${study.recoveredTransmission.toFixed(3)} from the filtered wavenumber spectra.`);
  }
  function queue(){cancelAnimationFrame(pending);pending=requestAnimationFrame(draw);}inputs.forEach(element=>element.addEventListener('input',queue));draw();return()=>cancelAnimationFrame(pending);
}

function mountJunctionTransmission(root){
  root.innerHTML=`<div class="demo-controls">${selectControl('jt-model','Junction model',[{value:'paper-lap',label:'Measured lap trend'},{value:'ideal-line',label:'Ideal continuous line'},{value:'blocking-mass',label:'Sleeve blocking mass'},{value:'point-array',label:'Point-connection array'}],'paper-lap')}${control('jt-frequency','Frequency',300,5000,25,1000,' Hz')}${control('jt-mass','Sleeve mass per length',0,30,.5,15,' kg/m')}${control('jt-spacing','Bolt-region spacing',.08,.45,.005,.254,' m')}</div><div class="demo-canvas-wrap"><svg id="jt-svg" viewBox="0 0 1000 440" role="img" aria-label="Comparison of honeycomb-panel junction transmission models and coupling loss factors."></svg></div><div class="demo-caption">The physical joint—not merely the two panel impedances—controls transmitted power. The paper’s bolted lap joint behaved more like a line junction for CLF conversion, yet transmitted much less than an ideal continuous line.</div>`;
  const svg=root.querySelector('#jt-svg'),inputs=['model','frequency','mass','spacing'].map(key=>root.querySelector(`#demo-jt-${key}`));
  function draw(){
    const p1=honeycombPreset('panel1'),p2=honeycombPreset('panel2'),model=inputs[0].value,frequency=+inputs[1].value,mass=+inputs[2].value,spacing=+inputs[3].value,options={model,blockingMassPerLength:mass,boltSpacing:spacing,jointLength:1.22,connectionCount:5},state=junctionTransmissionState(p1,p2,frequency,options),fs=Array.from({length:150},(_,index)=>300*(5000/300)**(index/149)),models=['paper-lap','ideal-line','blocking-mass','point-array'],colors=['#1e6077','#b96d37','#744f78','#657176'];
    root.querySelector('#out-jt-frequency').textContent=frequency.toFixed(0)+' Hz';root.querySelector('#out-jt-mass').textContent=mass.toFixed(1)+' kg/m';root.querySelector('#out-jt-spacing').textContent=spacing.toFixed(3)+' m';
    const sx=f=>70+Math.log(f/300)/Math.log(5000/300)*620,sy=tau=>370-(Math.log10(clamp(tau,.0005,1))-Math.log10(.0005))/(0-Math.log10(.0005))*315,paths=models.map((name,index)=>{const values=fs.map(f=>junctionTransmissionState(p1,p2,f,{...options,model:name}).tau12);return `<path d="${pathXY(fs,values,sx,sy)}" fill="none" stroke="${colors[index]}" stroke-width="${name===model?5:2.5}" opacity="${name===model?1:.72}"/>`;}).join(''),modelNames={'paper-lap':'measured lap trend','ideal-line':'ideal continuous line','blocking-mass':'sleeve blocking mass','point-array':'point-connection array'};
    const jointFill=model==='blocking-mass'?'#744f78':model==='paper-lap'?'#b96d37':'#657176';
    svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/>${axesSvg({x:70,y:35,w:620,h:335,xLabel:'frequency (Hz, log)',yLabel:'power transmission coefficient (log)'})}${paths}<line x1="${sx(frequency)}" y1="35" x2="${sx(frequency)}" y2="370" stroke="#172027" stroke-dasharray="5 5"/><circle cx="${sx(frequency)}" cy="${sy(state.tau12)}" r="7" fill="#172027"/><text x="90" y="62" font-size="11" fill="#1e6077">measured lap</text><text x="190" y="62" font-size="11" fill="#b96d37">ideal line</text><text x="275" y="62" font-size="11" fill="#744f78">blocking mass</text><text x="385" y="62" font-size="11" fill="#657176">point</text><text x="735" y="54" font-size="13" font-weight="700" fill="#172027">${modelNames[model]}</text><text x="735" y="91" font-size="12" fill="#5f6b70">τ₁₂</text><text x="735" y="116" font-size="24" font-weight="700" fill="#172027">${state.tau12.toFixed(3)}</text><text x="735" y="156" font-size="12" fill="#5f6b70">transmission loss</text><text x="735" y="181" font-size="20" font-weight="700" fill="#172027">${(-10*Math.log10(state.tau12)).toFixed(1)} dB</text><text x="735" y="218" font-size="12" fill="#5f6b70">line CLF η₁₂</text><text x="735" y="243" font-size="20" font-weight="700" fill="#172027">${state.eta12Line.toExponential(2)}</text><rect x="735" y="285" width="92" height="18" fill="#164453"/><rect x="869" y="285" width="92" height="18" fill="#1e6077"/><rect x="820" y="275" width="56" height="38" fill="${jointFill}"/><path d="M760 337 H930 M912 327 L930 337 L912 347" fill="none" stroke="#172027" stroke-width="4"/><text x="735" y="382" font-size="12" fill="#5f6b70">kᵦd = ${state.kbd12.toFixed(2)} · ${state.regime}</text>`;
  }
  inputs.forEach(element=>element.addEventListener('input',draw));draw();return()=>{};
}

function mountSea(root){
  root.innerHTML=`<div class="demo-controls">${control('clf-frequency','Frequency',250,5000,50,1000,' Hz')}${control('clf-coupling','Forward CLF η₁₂',0,.08,.001,.015,'')}${control('clf-density','Modal-density ratio n₂/n₁',.25,4,.05,.5,'')}${control('clf-split','Input-power fraction to subsystem 2',0,1,.01,0,'')}</div><div class="demo-canvas-wrap"><svg id="clf-flow-svg" viewBox="0 0 1000 440" role="img" aria-label="Two-subsystem SEA workbench showing stored energies, internal dissipation, gross bidirectional coupling power, and net power flow."></svg></div><div class="demo-caption">A CLF is an energy-transfer rate: Pᵢ⟶ⱼ = ωηᵢⱼEᵢ. Gross power can travel both ways at once; net flow is their difference, and reciprocity acts on modal-density-weighted CLFs.</div>`;
  const svg=root.querySelector('#clf-flow-svg'),els=['frequency','coupling','density','split'].map(key=>root.querySelector(`#demo-clf-${key}`));
  function draw(){
    const frequency=+els[0].value,eta12=+els[1].value,densityRatio=+els[2].value,powerFraction=+els[3].value,n1=.08,n2=n1*densityRatio,P2=powerFraction,P1=1-P2,result=twoSubsystemEnergyBalance({frequency,n1,n2,eta1:.03,eta2:.05,eta12,P1,P2}),energyMax=Math.max(result.E1,result.E2,1e-30),h1=55+125*result.E1/energyMax,h2=55+125*result.E2/energyMax,grossScale=power=>clamp(3+24*power/result.inputPower,3,30),netRight=result.net12>=0,netColor=Math.abs(result.net12)<.005?'#657176':'#b96d37';
    root.querySelector('#out-clf-frequency').textContent=frequency.toFixed(0)+' Hz';root.querySelector('#out-clf-coupling').textContent=eta12.toFixed(3);root.querySelector('#out-clf-density').textContent=densityRatio.toFixed(2);root.querySelector('#out-clf-split').textContent=powerFraction.toFixed(2);
    const arrow12=`<line x1="372" y1="196" x2="628" y2="196" stroke="#b96d37" stroke-width="${grossScale(result.gross12)}"/><path d="M606 180 L632 196 L606 212" fill="none" stroke="#b96d37" stroke-width="7"/>`,arrow21=`<line x1="628" y1="252" x2="372" y2="252" stroke="#657176" stroke-width="${grossScale(result.gross21)}"/><path d="M394 236 L368 252 L394 268" fill="none" stroke="#657176" stroke-width="7"/>`,netArrow=netRight?`M420 104 H580 M558 92 L582 104 L558 116`:`M580 104 H420 M442 92 L418 104 L442 116`;
    svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><text x="500" y="42" text-anchor="middle" font-size="15" font-weight="700" fill="#172027">Gross exchange occurs in both directions</text><path d="${netArrow}" fill="none" stroke="${netColor}" stroke-width="5"/><text x="500" y="83" text-anchor="middle" font-size="13" fill="#172027">net ${netRight?'1 → 2':'2 → 1'} = ${Math.abs(result.net12).toFixed(3)} W</text><rect x="80" y="140" width="290" height="190" fill="#e7e2d8" stroke="#657176"/><rect x="80" y="${330-h1}" width="290" height="${h1}" fill="#1e6077" opacity=".88"/><rect x="630" y="140" width="290" height="190" fill="#e7e2d8" stroke="#657176"/><rect x="630" y="${330-h2}" width="290" height="${h2}" fill="#164453" opacity=".88"/>${arrow12}${arrow21}<text x="225" y="165" text-anchor="middle" font-size="15" font-weight="700" fill="#172027">Subsystem 1</text><text x="775" y="165" text-anchor="middle" font-size="15" font-weight="700" fill="#172027">Subsystem 2</text><text x="225" y="292" text-anchor="middle" font-size="13" fill="#faf8f2">E₁ = ${result.E1.toExponential(2)} J</text><text x="225" y="315" text-anchor="middle" font-size="12" fill="#faf8f2">E₁/n₁ = ${result.modalEnergy1.toExponential(2)}</text><text x="775" y="292" text-anchor="middle" font-size="13" fill="#faf8f2">E₂ = ${result.E2.toExponential(2)} J</text><text x="775" y="315" text-anchor="middle" font-size="12" fill="#faf8f2">E₂/n₂ = ${result.modalEnergy2.toExponential(2)}</text><text x="500" y="178" text-anchor="middle" font-size="12" fill="#5f6b70">η₁₂ ${result.eta12.toFixed(3)} · η₂₁ ${result.eta21.toFixed(3)}</text><text x="500" y="221" text-anchor="middle" font-size="12" fill="#172027">gross 1 → 2: ${result.gross12.toFixed(3)} W</text><text x="500" y="281" text-anchor="middle" font-size="12" fill="#172027">gross 2 → 1: ${result.gross21.toFixed(3)} W</text><path d="M225 334 V382 M213 362 L225 384 L237 362" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M775 334 V382 M763 362 L775 384 L787 362" fill="none" stroke="#164453" stroke-width="5"/><text x="225" y="410" text-anchor="middle" font-size="12" fill="#172027">dissipation ${result.dissipation1.toFixed(3)} W · input ${P1.toFixed(2)} W</text><text x="775" y="410" text-anchor="middle" font-size="12" fill="#172027">dissipation ${result.dissipation2.toFixed(3)} W · input ${P2.toFixed(2)} W</text><text x="500" y="420" text-anchor="middle" font-size="11" fill="#5f6b70">${result.regime} · balance error ${(100*result.balanceError).toExponential(1)}%</text>`;
    svg.setAttribute('aria-label',`At ${frequency} hertz, gross power from subsystem 1 to 2 is ${result.gross12.toFixed(3)} watts and reverse gross power is ${result.gross21.toFixed(3)} watts. Net flow is ${Math.abs(result.net12).toFixed(3)} watts ${netRight?'from subsystem 1 to 2':'from subsystem 2 to 1'}.`);
  }
  els.forEach(element=>element.addEventListener('input',draw));draw();return()=>{};
}


function mountDamping(root){
  root.innerHTML=`<div class="demo-controls">${control('ratio','Frequency ratio r',.1,5,.01,1,'')}${control('zeta','Damping ratio ζ',.01,.35,.005,.05,'')}${control('speed','Animation speed',0,2,.1,.7,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">Damping reduces the resonance peak but transmits more force well above resonance. Isolation begins only after the transmissibility drops below one.</div>`;
  const svg=root.querySelector('#demo-svg'),rEl=root.querySelector('#demo-ratio'),zEl=root.querySelector('#demo-zeta'),sEl=root.querySelector('#demo-speed');let raf,start=performance.now();
  const tf=(r,z)=>Math.sqrt((1+(2*z*r)**2)/((1-r*r)**2+(2*z*r)**2));
  function draw(now){const r=+rEl.value,z=+zEl.value,speed=+sEl.value,T=tf(r,z),t=(now-start)/1000*speed,move=26*Math.sin(TAU*r*t),trans=clamp(T,0,6);root.querySelector('#out-ratio').textContent=r.toFixed(2);root.querySelector('#out-zeta').textContent=z.toFixed(3);root.querySelector('#out-speed').textContent=speed.toFixed(1)+'×';const rs=Array.from({length:260},(_,i)=>.1+4.9*i/259),sx=x=>520+(x-.1)/4.9*430,sy=y=>370-Math.log10(clamp(y,.08,20)/.08)/Math.log10(20/.08)*320,curves=[.02,z,.2].map((zz,i)=>`<path d="${pathXY(rs,rs.map(q=>tf(q,zz)),sx,sy)}" fill="none" stroke="${i===1?'#b96d37':i===0?'#1e6077':'#899296'}" stroke-width="${i===1?5:3}" opacity="${i===1?1:.75}"/>`).join('');svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><line x1="65" y1="320" x2="430" y2="320" stroke="#657176" stroke-width="5"/><rect x="130" y="${240+move*.15}" width="230" height="65" rx="4" fill="#164453"/><path d="M245 ${235+move*.15} L245 ${165+move}" stroke="#b96d37" stroke-width="7"/><path d="M230 ${185+move} L245 ${160+move} L260 ${185+move}" fill="none" stroke="#b96d37" stroke-width="7"/><path d="M160 320 C175 ${285-16*trans} 195 ${350+14*trans} 210 320 S245 ${285-16*trans} 260 320 S295 ${350+14*trans} 310 320" fill="none" stroke="#1e6077" stroke-width="5"/><text x="70" y="65" font-size="15" font-weight="700" fill="#172027">Transmitted force = ${T.toFixed(2)} × static force</text><text x="70" y="92" font-size="13" fill="#5f6b70">${T<1?'Isolation region':'Amplification region'}</text>${axesSvg({x:520,y:35,w:430,h:335,xLabel:'frequency ratio r',yLabel:'force transmissibility (log)'})}<line x1="520" y1="${sy(1)}" x2="950" y2="${sy(1)}" stroke="#657176" stroke-dasharray="6 5"/><line x1="${sx(Math.sqrt(2))}" y1="35" x2="${sx(Math.sqrt(2))}" y2="370" stroke="#657176" stroke-dasharray="6 5"/><text x="${sx(Math.sqrt(2))+8}" y="55" font-size="11" fill="#5f6b70">r = √2</text>${curves}<circle cx="${sx(r)}" cy="${sy(T)}" r="7" fill="#172027"/>`;raf=requestAnimationFrame(draw);}raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}
function mountTwoMode(root){
  root.innerHTML=`<div class="demo-controls">${control('massratio','Mass ratio m₂/m₁',.3,3,.05,1.4,'')}${control('coupling','Coupling stiffness k₂/k',.05,3,.05,.8,'')}${control('mode','Mode number',1,2,1,1,'')}${control('speed','Animation speed',.2,2,.1,.8,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">The first mode tends to move the masses together; the second tends to move them oppositely. Mass and coupling ratios change both modal frequencies and shape ratios.</div>`;
  const svg=root.querySelector('#demo-svg'),mEl=root.querySelector('#demo-massratio'),kEl=root.querySelector('#demo-coupling'),modeEl=root.querySelector('#demo-mode'),speedEl=root.querySelector('#demo-speed');let raf,start=performance.now();
  function solve(m2,k2){const k11=1+k2,k22=1+k2,a=m2,b=-(k11*m2+k22),c=k11*k22-k2*k2,disc=Math.max(0,b*b-4*a*c),l1=(-b-Math.sqrt(disc))/(2*a),l2=(-b+Math.sqrt(disc))/(2*a),shape=l=>{let y=(k11-l)/k2;const norm=Math.max(1,Math.abs(y));return[1/norm,y/norm];};return{l:[l1,l2],phi:[shape(l1),shape(l2)]};}
  function draw(now){const m2=+mEl.value,k2=+kEl.value,mode=Math.round(+modeEl.value)-1,speed=+speedEl.value,{l,phi}=solve(m2,k2),w=Math.sqrt(l[mode]),q=Math.sin((now-start)/1000*speed*TAU*w),x1=245+65*phi[mode][0]*q,x2=620+65*phi[mode][1]*q;root.querySelector('#out-massratio').textContent=m2.toFixed(2);root.querySelector('#out-coupling').textContent=k2.toFixed(2);root.querySelector('#out-mode').textContent=String(mode+1);root.querySelector('#out-speed').textContent=speed.toFixed(1)+'×';svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><line x1="55" y1="250" x2="945" y2="250" stroke="#657176" stroke-width="5"/><path d="${springPath(70,220,x1,9,13)}" fill="none" stroke="#1e6077" stroke-width="4"/><rect x="${x1}" y="165" width="135" height="110" rx="5" fill="#164453"/><path d="${springPath(x1+135,220,x2,11,13)}" fill="none" stroke="#b96d37" stroke-width="4"/><rect x="${x2}" y="${160-10*(m2-1)}" width="${135+20*(m2-1)}" height="${120+20*(m2-1)}" rx="5" fill="#1e6077"/><path d="${springPath(x2+135+20*(m2-1),220,930,8,13)}" fill="none" stroke="#1e6077" stroke-width="4"/><text x="500" y="52" text-anchor="middle" font-size="16" font-weight="700" fill="#172027">Mode ${mode+1}: ω = ${w.toFixed(3)} normalized rad/s</text><text x="500" y="80" text-anchor="middle" font-size="13" fill="#5f6b70">shape [${phi[mode][0].toFixed(2)}, ${phi[mode][1].toFixed(2)}] · ω₂/ω₁ = ${(Math.sqrt(l[1]/l[0])).toFixed(2)}</text><text x="312" y="315" text-anchor="middle" font-size="13" fill="#172027">m₁</text><text x="${x2+75}" y="315" text-anchor="middle" font-size="13" fill="#172027">m₂</text>`;raf=requestAnimationFrame(draw);}raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}
function mountBeam(root){
  root.innerHTML=`<div class="demo-controls">${control('mode','Mode / wave order',1,6,1,3,'')}${control('view','View: 0 standing, 1 traveling',0,1,1,0,'')}${control('amplitude','Amplitude scale',.3,1.5,.05,1,'×')}${control('speed','Animation speed',.2,2,.1,.8,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">A standing mode is built from counter-propagating waves and has fixed nodes. A traveling flexural wave carries phase along the beam.</div>`;
  const svg=root.querySelector('#demo-svg'),nEl=root.querySelector('#demo-mode'),viewEl=root.querySelector('#demo-view'),ampEl=root.querySelector('#demo-amplitude'),speedEl=root.querySelector('#demo-speed');let raf,start=performance.now();
  function draw(now){const n=Math.round(+nEl.value),travel=+viewEl.value>.5,A=+ampEl.value,speed=+speedEl.value,t=(now-start)/1000*speed,xs=Array.from({length:260},(_,i)=>i/259),ys=xs.map(x=>A*(travel?Math.sin(TAU*n*x-TAU*t):Math.sin(Math.PI*n*x)*Math.cos(TAU*t))),sx=x=>85+x*830,sy=y=>230-95*y,beam=pathXY(xs,ys,sx,sy);root.querySelector('#out-mode').textContent=String(n);root.querySelector('#out-view').textContent=travel?'traveling':'standing';root.querySelector('#out-amplitude').textContent=A.toFixed(2)+'×';root.querySelector('#out-speed').textContent=speed.toFixed(1)+'×';const nodes=!travel?Array.from({length:n+1},(_,i)=>`<circle cx="${sx(i/n)}" cy="230" r="6" fill="#b96d37"/>`).join(''):'';svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><line x1="85" y1="230" x2="915" y2="230" stroke="#ada497" stroke-dasharray="7 6"/><path d="${beam}" fill="none" stroke="#1e6077" stroke-width="7" stroke-linecap="round"/>${nodes}<path d="M70 180 L70 280 M930 180 L930 280" stroke="#172027" stroke-width="8"/><text x="500" y="55" text-anchor="middle" font-size="16" font-weight="700" fill="#172027">${travel?'Traveling flexural wave':'Standing beam mode'} · order ${n}</text><text x="500" y="85" text-anchor="middle" font-size="13" fill="#5f6b70">${travel?'Phase moves left to right; no fixed interior nodes.':`${Math.max(0,n-1)} fixed interior node${n===2?'':'s'} plus the supports.`}</text>`;raf=requestAnimationFrame(draw);}raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}
function mountRadiation(root){
  root.innerHTML=`<div class="demo-controls">${control('ratio','Frequency ratio f/fc',.08,4,.01,.6,'')}${control('order','Panel wave order',1,7,1,3,'')}${control('speed','Animation speed',.2,2,.1,.7,'×')}</div><div class="demo-canvas-wrap"><svg id="demo-svg" viewBox="0 0 1000 440"></svg></div><div class="demo-caption">Below coincidence, most panel wavenumber content lies outside the acoustic radiation circle and radiation is inefficient. Above coincidence, the panel couples much more effectively to propagating sound.</div>`;
  const svg=root.querySelector('#demo-svg'),rEl=root.querySelector('#demo-ratio'),nEl=root.querySelector('#demo-order'),sEl=root.querySelector('#demo-speed');let raf,start=performance.now();
  const sigma=r=>r<1?clamp(.025*r*r/(Math.max(.04,1-r*r)),.005,.18):clamp(.22+.78*(1-Math.exp(-2.2*(r-1))),.22,1);
  function draw(now){const r=+rEl.value,n=Math.round(+nEl.value),speed=+sEl.value,sig=sigma(r),t=(now-start)/1000*speed,A=22*Math.sin(TAU*t),panelPts=Array.from({length:120},(_,i)=>{const x=i/119;return[115+x*285,220+A*Math.sin(Math.PI*n*x)];}),panelPath=panelPts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');root.querySelector('#out-ratio').textContent=r.toFixed(2);root.querySelector('#out-order').textContent=String(n);root.querySelector('#out-speed').textContent=speed.toFixed(1)+'×';const waves=Array.from({length:5},(_,i)=>{const rad=55+i*48+10*Math.sin(TAU*t),op=clamp(sig*(1-i*.1),.03,1);return`<path d="M400 ${220-rad*.55} Q${500+rad*.55} ${220-rad} ${600+rad} 220 M400 ${220+rad*.55} Q${500+rad*.55} ${220+rad} ${600+rad} 220" fill="none" stroke="#1e6077" stroke-width="4" opacity="${op}"/>`;}).join(''),rs=Array.from({length:200},(_,i)=>.08+3.92*i/199),sx=x=>650+(x-.08)/3.92*300,sy=y=>360-y*270;svg.innerHTML=`<rect width="1000" height="440" fill="#faf8f2"/><rect x="100" y="135" width="320" height="170" fill="#e7e2d8" stroke="#657176"/><path d="${panelPath}" fill="none" stroke="#164453" stroke-width="9"/>${waves}<text x="260" y="70" text-anchor="middle" font-size="16" font-weight="700" fill="#172027">${r<1?'Subcritical bending':'Supercritical / radiating bending'}</text><text x="260" y="98" text-anchor="middle" font-size="13" fill="#5f6b70">screening radiation efficiency σ ≈ ${sig.toFixed(3)}</text>${axesSvg({x:650,y:55,w:300,h:305,xLabel:'f / fc',yLabel:'relative radiation efficiency'})}<path d="${pathXY(rs,rs.map(sigma),sx,sy)}" fill="none" stroke="#1e6077" stroke-width="4"/><line x1="${sx(1)}" y1="55" x2="${sx(1)}" y2="360" stroke="#b96d37" stroke-dasharray="6 5"/><circle cx="${sx(r)}" cy="${sy(sig)}" r="7" fill="#172027"/>`;raf=requestAnimationFrame(draw);}raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
}

export const supportedDemoIds = ['sdof-motion','damping-transmissibility','two-mode','beam-wave','dispersion','coincidence','radiation-efficiency','ring','psd-response','srs-bank','sandwich-regimes','energy-bias','wavenumber-transmission','junction-transmission','joint-acceptance','spatial-field','sea-flow',...acs519SupportedDemoIds,...workflowExpansionSupportedDemoIds,...programExpansionSupportedDemoIds,...seaParameterSupportedDemoIds,...electronicsFatigueSupportedDemoIds];

export function mountDemo(root,id){
  let cleanup=mountElectronicsFatigueDemo(root,id);
  if(!cleanup)cleanup=mountSeaParameterDemo(root,id);
  if(!cleanup)cleanup=mountProgramExpansionDemo(root,id);
  if(!cleanup)cleanup=mountWorkflowExpansionDemo(root,id);
  if(!cleanup)cleanup=mountAcs519Demo(root,id);
  if(!cleanup){
    const mounts={
      'sdof-motion':mountSdof,
      'damping-transmissibility':mountDamping,
      'two-mode':mountTwoMode,
      'beam-wave':mountBeam,
      dispersion:mountDispersion,
      coincidence:mountCoincidence,
      'radiation-efficiency':mountRadiation,
      ring:mountRing,
      'psd-response':mountPsd,
      'srs-bank':mountSrs,
      'sandwich-regimes':mountSandwichRegimes,
      'energy-bias':mountEnergyBias,
      'wavenumber-transmission':mountWavenumberTransmission,
      'junction-transmission':mountJunctionTransmission,
      'joint-acceptance':mountJointAcceptance,
      'spatial-field':mountSpatial,
      'sea-flow':mountSea
    };
    cleanup=mounts[id]?.(root);
  }
  if(!cleanup){root.innerHTML='<div class="calc-error"><strong>Demo unavailable.</strong></div>';return()=>{};}
  const takeawayCleanup=mountDemoTakeaway(root,id);
  return()=>{takeawayCleanup();cleanup();};
}
