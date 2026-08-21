/* Reusable decision visuals for electronics vibration-fatigue tools and demos. */

const C = Object.freeze({
  ink: '#172027', teal: '#1e6077', dark: '#164453', rust: '#b96d37', purple: '#744f78',
  muted: '#657176', grid: '#ada497', paper: '#faf8f2', wash: '#e7e2d8', pale: '#dce9ec',
  green: '#376e56', amber: '#c29135', red: '#a64535', white: '#fff'
});

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const fmt = (value, digits = 3) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number !== 0 && (Math.abs(number) >= 1e4 || Math.abs(number) < 1e-3)) return number.toExponential(2);
  return number.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '');
};
const linePath = (xs, ys, sx, sy) => xs.map((value, index) => `${index ? 'L' : 'M'}${sx(value).toFixed(2)},${sy(ys[index]).toFixed(2)}`).join(' ');
const log10 = value => Math.log10(Math.max(Number(value), 1e-30));
const ratioColor = ratio => ratio <= 0.7 ? C.green : ratio <= 1 ? C.amber : C.red;
const lerp = (a, b, t) => a + (b - a) * t;
const sampleIndices = (length, maximum = 320) => {
  if (length <= maximum) return Array.from({ length }, (_, index) => index);
  return [...new Set(Array.from({ length: maximum }, (_, index) => Math.round(index * (length - 1) / (maximum - 1))))];
};
const mmValue = (value, system) => system === 'English' ? value * 0.03937007874 : value;
const mmUnit = system => system === 'English' ? 'in' : 'mm';
const stressValue = (value, system) => system === 'English' ? value * 0.1450377377 : value;
const stressUnit = system => system === 'English' ? 'ksi' : 'MPa';

function rootSvg(title, description, body, width = 1000, height = 560) {
  return `<svg class="electronics-engineering-visual" data-engineering-visual-svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(`${title}. ${description}`)}"><title>${esc(title)}</title><desc>${esc(description)}</desc><rect width="${width}" height="${height}" fill="${C.paper}"/>${body}</svg>`;
}

function heading(title, eyebrow = 'ENGINEERING VIEW') {
  return `<text x="48" y="28" font-size="11" letter-spacing="1.4" fill="${C.rust}">${esc(eyebrow)}</text><text x="48" y="54" font-size="20" font-weight="700" fill="${C.ink}">${esc(title)}</text>`;
}

function linearTicks(min, max, count, formatter = value => fmt(value, 1)) {
  return Array.from({ length: count }, (_, index) => {
    const value = lerp(min, max, index / Math.max(1, count - 1));
    return { value, label: formatter(value) };
  });
}

function axes({ x, y, w, h, xLabel, yLabel, xTicks = [], yTicks = [], sx, sy, grid = true }) {
  const verticals = xTicks.map(tick => `<path d="M${sx(tick.value)} ${y}V${y + h}" stroke="${C.grid}" opacity="${grid ? .3 : 0}"/><text x="${sx(tick.value)}" y="${y + h + 20}" text-anchor="middle" font-size="11" fill="${C.muted}">${esc(tick.label)}</text>`).join('');
  const horizontals = yTicks.map(tick => `<path d="M${x} ${sy(tick.value)}H${x + w}" stroke="${C.grid}" opacity="${grid ? .3 : 0}"/><text x="${x - 9}" y="${sy(tick.value) + 4}" text-anchor="end" font-size="11" fill="${C.muted}">${esc(tick.label)}</text>`).join('');
  return `${verticals}${horizontals}<path d="M${x} ${y}V${y + h}H${x + w}" fill="none" stroke="${C.muted}"/><text x="${x + w / 2}" y="${y + h + 42}" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(xLabel)}</text>${yLabel ? `<text x="${x - 48}" y="${y + h / 2}" transform="rotate(-90 ${x - 48} ${y + h / 2})" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(yLabel)}</text>` : ''}`;
}

function pcbMotionVisual(view) {
  const state = view.state || {};
  const system = view.displaySystem || 'SI';
  const bx = 58, by = 92, bw = 540, bh = 276;
  const xf = clamp(finite(view.xFraction, .5), 0, 1), yf = clamp(finite(view.yFraction, .5), 0, 1);
  const px = bx + bw * xf, py = by + bh * yf;
  const phase = finite(view.phase, 1);
  const cells = Array.from({ length: 18 }, (_, ix) => Array.from({ length: 10 }, (_, iy) => {
    const amplitude = Math.abs(Math.sin(Math.PI * (ix + .5) / 18) * Math.sin(Math.PI * (iy + .5) / 10));
    return `<rect x="${bx + ix * bw / 18}" y="${by + iy * bh / 10}" width="${bw / 18 + .4}" height="${bh / 10 + .4}" fill="${C.teal}" opacity="${.08 + .72 * amplitude}"/>`;
  }).join('')).join('');
  const sideX = q => bx + bw * q;
  const deflection = Math.max(8, 34 * clamp(Math.abs(finite(state.responseCenterMm, .25)) / .5, .15, 1));
  const sideY = q => 470 - phase * deflection * Math.sin(Math.PI * q);
  const boardQ = Array.from({ length: 81 }, (_, index) => index / 80);
  const local = mmValue(finite(state.responseLocalMm), system), allowable = mmValue(finite(state.localAllowableMm), system);
  const maxBar = Math.max(local, allowable, 1e-9) * 1.15;
  const demandHeight = 150 * local / maxBar, allowableHeight = 150 * allowable / maxBar;
  const color = ratioColor(finite(state.ratio));
  const body = `${heading(view.title || 'Board motion and attachment demand')}
    <text x="58" y="78" font-size="12" fill="${C.muted}">PLAN VIEW · FIRST BENDING-MODE RESPONSE FIELD</text>
    ${cells}<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="none" stroke="${C.dark}" stroke-width="4"/>
    <g fill="${C.ink}">${[[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8"/><circle cx="${x}" cy="${y}" r="3" fill="${C.paper}"/>`).join('')}</g>
    <path d="M${bx + bw/2 - 12} ${by + bh/2}H${bx + bw/2 + 12}M${bx + bw/2} ${by + bh/2 - 12}V${by + bh/2 + 12}" stroke="${C.paper}" stroke-width="2" opacity=".8"/>
    <g transform="translate(${px} ${py})"><rect x="-32" y="-20" width="64" height="40" rx="4" fill="${C.rust}" stroke="${C.white}" stroke-width="3"/><path d="M-23 -25V-20M-11 -25V-20M1 -25V-20M13 -25V-20M25 -25V-20M-23 20V25M-11 20V25M1 20V25M13 20V25M25 20V25" stroke="${C.ink}" stroke-width="3"/><circle r="5" fill="${C.white}"/></g>
    <path d="M${px} ${py}L635 110" stroke="${C.rust}" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="58" y="398" font-size="12" fill="${C.muted}">EXAGGERATED SIDE SECTION · COMMON VISUAL PHASE</text>
    <path d="${linePath(boardQ, boardQ.map(sideY), sideX, value => value)}" fill="none" stroke="${C.teal}" stroke-width="9"/>
    <path d="M${bx} 458V492M${bx+bw} 458V492" stroke="${C.ink}" stroke-width="10"/>
    <rect x="${sideX(xf)-28}" y="${sideY(xf)-45}" width="56" height="28" rx="4" fill="${C.dark}"/>
    <path d="M${sideX(xf)-18} ${sideY(xf)-17}L${sideX(xf)-13} ${sideY(xf)-1}M${sideX(xf)+18} ${sideY(xf)-17}L${sideX(xf)+13} ${sideY(xf)-1}" stroke="${color}" stroke-width="6"/>
    <text x="650" y="98" font-size="12" fill="${C.muted}">SELECTED ATTACHMENT</text><text x="650" y="126" font-size="17" font-weight="700" fill="${C.ink}">${esc(view.packageLabel || 'Component')}</text>
    <text x="650" y="154" font-size="12" fill="${C.muted}">position (${fmt(xf,2)}, ${fmt(yf,2)}) · r = ${fmt(state.locationFactor,3)}</text>
    <path d="M650 190H947" stroke="${C.grid}" opacity=".5"/>
    <text x="690" y="222" text-anchor="middle" font-size="12" fill="${C.muted}">local demand</text><text x="805" y="222" text-anchor="middle" font-size="12" fill="${C.muted}">allowable</text>
    <rect x="662" y="${390-demandHeight}" width="56" height="${demandHeight}" fill="${color}"/><rect x="777" y="${390-allowableHeight}" width="56" height="${allowableHeight}" fill="${C.dark}"/>
    <text x="690" y="${382-demandHeight}" text-anchor="middle" font-size="12" fill="${C.ink}">${fmt(local,4)}</text><text x="805" y="${382-allowableHeight}" text-anchor="middle" font-size="12" fill="${C.ink}">${fmt(allowable,4)}</text>
    <text x="748" y="414" text-anchor="middle" font-size="12" fill="${C.muted}">${mmUnit(system)} · 3σ relative displacement</text>
    <rect x="650" y="448" width="297" height="60" rx="7" fill="${color}"/><text x="798" y="474" text-anchor="middle" font-size="12" fill="${C.white}">${finite(state.ratio)<=1?'SCREEN PASSES':'REVIEW REQUIRED'}</text><text x="798" y="497" text-anchor="middle" font-size="22" font-weight="700" fill="${C.white}">demand / allowable ${fmt(state.ratio,2)}</text>`;
  return rootSvg(view.title || 'Board motion and attachment demand', 'PCB mode shape, selected component, deflected side section, and demand versus allowable displacement.', body);
}

function responseChainVisual(view) {
  const state = view.state || {};
  const frequencies = state.frequencies || [];
  if (frequencies.length < 2) return rootSvg(view.title || 'PSD response chain', 'No frequency-response data available.', `${heading(view.title || 'PSD response chain')}<text x="50" y="110" fill="${C.muted}">No spectrum available.</text>`);
  const fx0 = log10(frequencies[0]), fx1 = log10(frequencies.at(-1));
  const indices = sampleIndices(frequencies.length);
  const displayFrequencies = indices.map(index => frequencies[index]);
  const x = 78, w = 670, laneH = 90, laneGap = 18, top = 82;
  const sx = frequency => x + (log10(frequency)-fx0)/(fx1-fx0)*w;
  const lanes = [
    { label: 'BASE PSD', values: state.inputPsd, color: C.muted, unit: 'g²/Hz', fill: false },
    { label: 'MODAL |Hₐ|²', values: state.accelerationH2, color: C.rust, unit: 'gain²', fill: false },
    { label: 'PCB RESPONSE PSD', values: state.accelerationPsd, color: C.teal, unit: 'g²/Hz', fill: true },
    { label: 'RELATIVE-DISPLACEMENT PSD', values: state.relativeDisplacementPsdMm2, color: C.purple, unit: 'mm²/Hz', fill: true }
  ];
  const laneMarkup = lanes.map((lane, index) => {
    const y = top + index * (laneH + laneGap);
    const logs = lane.values.map(log10), lo = Math.min(...logs), hi = Math.max(...logs);
    const sy = value => y + laneH - (log10(value)-lo)/Math.max(hi-lo,1e-9)*laneH;
    const displayValues = indices.map(pointIndex => lane.values[pointIndex]);
    const curve = linePath(displayFrequencies,displayValues,sx,sy);
    return `<text x="${x}" y="${y-7}" font-size="10" letter-spacing="1" fill="${lane.color}">${lane.label}</text><rect x="${x}" y="${y}" width="${w}" height="${laneH}" fill="${C.wash}" opacity=".35"/><path d="${curve}${lane.fill?`L${sx(displayFrequencies.at(-1))},${y+laneH}L${sx(displayFrequencies[0])},${y+laneH}Z`:''}" fill="${lane.fill?lane.color:'none'}" fill-opacity=".13" stroke="${lane.color}" stroke-width="${index===2?4:3}"/><text x="${x+w-4}" y="${y+15}" text-anchor="end" font-size="10" fill="${C.muted}">${lane.unit}</text>`;
  }).join('');
  const fn = finite(view.naturalFrequencyHz || state.naturalFrequencyHz, 1);
  const fnx = sx(fn);
  const tickValues = [frequencies[0], ...[10,100,1000,10000].filter(value=>value>frequencies[0]&&value<frequencies.at(-1)), frequencies.at(-1)];
  const ticks = tickValues.map(value=>`<path d="M${sx(value)} ${top}V${top+4*(laneH+laneGap)-laneGap}" stroke="${C.grid}" opacity=".22"/><text x="${sx(value)}" y="535" text-anchor="middle" font-size="11" fill="${C.muted}">${fmt(value,0)}</text>`).join('');
  const cumulative = state.cumulativeRelativeVarianceFraction || [];
  const halfIndex = cumulative.findIndex(value=>value>=.5);
  const halfFrequency = halfIndex>=0?frequencies[halfIndex]:fn;
  const system = view.displaySystem || 'SI';
  const body = `${heading(view.title || 'PSD → mode → board response → relative motion')}${laneMarkup}${ticks}<path d="M${fnx} ${top-12}V${top+4*(laneH+laneGap)-laneGap}" stroke="${C.red}" stroke-width="3" stroke-dasharray="7 5"/><path d="M${fnx-7} ${top-4}L${fnx} ${top+7}L${fnx+7} ${top-4}Z" fill="${C.red}"/><text x="${clamp(fnx+8,x+5,x+w-85)}" y="${top-16}" font-size="11" fill="${C.red}">mode ${fmt(fn,0)} Hz</text>
    <text x="${x+w/2}" y="553" text-anchor="middle" font-size="12" fill="${C.muted}">frequency (Hz, log)</text>
    <text x="790" y="100" font-size="11" fill="${C.muted}">INTEGRATED RESPONSE</text><text x="790" y="132" font-size="14" fill="${C.ink}">Input</text><text x="946" y="132" text-anchor="end" font-size="18" font-weight="700" fill="${C.ink}">${fmt(state.inputGrms,2)} GRMS</text>
    <text x="790" y="174" font-size="14" fill="${C.ink}">PCB</text><text x="946" y="174" text-anchor="end" font-size="18" font-weight="700" fill="${C.teal}">${fmt(state.responseGrms,2)} GRMS</text>
    <text x="790" y="216" font-size="14" fill="${C.ink}">Relative 3σ</text><text x="946" y="216" text-anchor="end" font-size="18" font-weight="700" fill="${C.purple}">${fmt(mmValue(state.relative3SigmaMm,system),4)} ${mmUnit(system)}</text>
    <path d="M790 245H946" stroke="${C.grid}" opacity=".55"/><text x="790" y="278" font-size="11" fill="${C.muted}">WHERE VARIANCE ACCUMULATES</text><text x="790" y="312" font-size="14" fill="${C.ink}">50% below</text><text x="946" y="312" text-anchor="end" font-size="18" font-weight="700" fill="${C.rust}">${fmt(halfFrequency,0)} Hz</text>
    <text x="790" y="357" font-size="14" fill="${C.ink}">Miles 3σ</text><text x="946" y="357" text-anchor="end" font-size="18" font-weight="700" fill="${C.ink}">${fmt(mmValue(state.milesRelative3SigmaMm,system),4)} ${mmUnit(system)}</text>
    <text x="790" y="405" font-size="12" fill="${C.muted}">The vertical cursor ties all four</text><text x="790" y="424" font-size="12" fill="${C.muted}">frequency-domain steps to the same mode.</text>`;
  return rootSvg(view.title || 'PSD response chain', 'Four aligned frequency plots show base PSD, modal transfer function, PCB acceleration response, and relative displacement response.', body);
}

function componentMapVisual(view) {
  const state = view.state || {};
  const rows = state.rows || [];
  const modeX = Math.max(1, Math.round(finite(view.modeX,1))), modeY = Math.max(1, Math.round(finite(view.modeY,1)));
  const bx=55,by=90,bw=610,bh=360;
  const cells=Array.from({length:24},(_,ix)=>Array.from({length:14},(_,iy)=>{
    const amplitude=Math.abs(Math.sin(modeX*Math.PI*(ix+.5)/24)*Math.sin(modeY*Math.PI*(iy+.5)/14));
    return `<rect x="${bx+ix*bw/24}" y="${by+iy*bh/14}" width="${bw/24+.4}" height="${bh/14+.4}" fill="${C.teal}" opacity="${.06+.72*amplitude}"/>`;
  }).join('')).join('');
  const components=rows.map((row,index)=>{
    const x=bx+bw*row.xFraction,y=by+bh*row.yFraction,color=ratioColor(row.ratio),selected=view.selectedName===row.name||(!view.selectedName&&index===0);
    const length=clamp(22+row.lengthMm*.7,28,68),height=row.axis==='y'?length:28,width=row.axis==='x'?length:28;
    return `<g data-component-name="${esc(row.name)}"><title>${esc(row.name)} · ratio ${fmt(row.ratio,2)} · ${esc(row.packageLabel)}</title><rect x="${x-width/2}" y="${y-height/2}" width="${width}" height="${height}" rx="4" fill="${color}" stroke="${selected?C.white:C.ink}" stroke-width="${selected?4:1.5}"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.white}">${esc(row.name)}</text></g>`;
  }).join('');
  const ranked=[...rows].sort((a,b)=>b.ratio-a.ratio).slice(0,6), barMax=Math.max(1,...ranked.map(row=>row.ratio));
  const bars=ranked.map((row,index)=>{const y=132+index*52,w=230*row.ratio/barMax;return `<text x="715" y="${y}" font-size="12" fill="${C.ink}">${esc(row.name)}</text><rect x="715" y="${y+9}" width="230" height="18" rx="3" fill="${C.wash}"/><rect x="715" y="${y+9}" width="${w}" height="18" rx="3" fill="${ratioColor(row.ratio)}"/><text x="950" y="${y+23}" text-anchor="end" font-size="11" fill="${C.ink}">${fmt(row.ratio,2)}</text>`;}).join('');
  const body=`${heading(view.title||'Component risk follows the board response field')}<text x="55" y="76" font-size="11" fill="${C.muted}">MODE ${modeX} × ${modeY} OVERLAY${modeX===1&&modeY===1?' · SCREENING BASIS':' · SHAPE SENSITIVITY ONLY'}</text>${cells}<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="none" stroke="${C.dark}" stroke-width="4"/>${components}
    <g transform="translate(55 486)"><rect width="18" height="12" fill="${C.green}"/><text x="26" y="11" font-size="11" fill="${C.muted}">≤0.70</text><rect x="90" width="18" height="12" fill="${C.amber}"/><text x="116" y="11" font-size="11" fill="${C.muted}">0.70–1.00</text><rect x="208" width="18" height="12" fill="${C.red}"/><text x="234" y="11" font-size="11" fill="${C.muted}">&gt;1.00 demand / allowable</text></g>
    <text x="715" y="91" font-size="11" letter-spacing="1" fill="${C.muted}">RISK LEADERBOARD</text>${bars}<path d="M715 460H945" stroke="${C.grid}"/><text x="715" y="486" font-size="12" fill="${C.muted}">${state.passCount??0} of ${state.totalCount??rows.length} components pass</text>`;
  return rootSvg(view.title||'Component risk map','Board modal field with component locations colored by displacement demand-to-allowable ratio and a risk leaderboard.',body);
}

function fatigueDamageVisual(view){
  const state=view.state||{},system=view.displaySystem||'SI',amps=state.amplitudes||[],pdf=state.rayleighPdf||[],density=state.damageDensity||[];
  if(amps.length<2)return rootSvg(view.title||'Fatigue amplitude and damage','No fatigue distribution data available.',`${heading(view.title||'Fatigue amplitude and damage')}<text x="50" y="110" fill="${C.muted}">No distribution available.</text>`);
  const sigma=finite(view.stressRms,amps.at(-1)/5),reference=finite(view.referenceStress,4*sigma),b=finite(state.fatigueExponent,6.4);
  const x=72,w=560,top=92,h=155,gap=82;
  const sx=value=>x+value/amps.at(-1)*w;
  const maxPdf=Math.max(...pdf),syPdf=value=>top+h-value/Math.max(maxPdf,1e-12)*h;
  const damageTop=top+h+gap,maxDamage=Math.max(...density),syDamage=value=>damageTop+h-value/Math.max(maxDamage,1e-30)*h;
  const bands=[1,2,3].map(level=>`<path d="M${sx(level*sigma)} ${top}V${damageTop+h}" stroke="${level===3?C.red:C.rust}" stroke-width="${level===3?3:2}" stroke-dasharray="6 5"/><text x="${sx(level*sigma)}" y="${top-8}" text-anchor="middle" font-size="11" fill="${level===3?C.red:C.rust}">${level}σ</text>`).join('');
  const snStress=Array.from({length:80},(_,i)=>reference*.35*(5/.35)**(i/79));
  const snLife=snStress.map(stress=>finite(view.referenceCycles,2e7)*(reference/stress)**b);
  const snX=705,snY=118,snW=240,snH=260,sxSn=value=>snX+(log10(value)-log10(snStress[0]))/(log10(snStress.at(-1))-log10(snStress[0]))*snW;
  const lifeLogs=snLife.map(log10),lifeLo=Math.min(...lifeLogs),lifeHi=Math.max(...lifeLogs),sySn=value=>snY+snH-(log10(value)-lifeLo)/(lifeHi-lifeLo)*snH;
  const bandPoints=(state.bands||[]).map(band=>`<circle cx="${sxSn(band.amplitude)}" cy="${sySn(band.cyclesToFailure)}" r="6" fill="${band.level===3?C.red:C.rust}"/><text x="${sxSn(band.amplitude)+8}" y="${sySn(band.cyclesToFailure)-7}" font-size="10" fill="${C.muted}">${band.level}σ</text>`).join('');
  const body=`${heading(view.title||'Amplitude probability is not damage contribution')}<text x="72" y="78" font-size="11" fill="${C.muted}">RAYLEIGH PEAK-AMPLITUDE DENSITY</text><path d="${linePath(amps,pdf,sx,syPdf)}L${sx(amps.at(-1))},${top+h}L${sx(amps[0])},${top+h}Z" fill="${C.teal}" fill-opacity=".18" stroke="${C.teal}" stroke-width="4"/>${bands}<path d="M${x} ${top+h}H${x+w}" stroke="${C.muted}"/>
    <text x="72" y="${damageTop-15}" font-size="11" fill="${C.muted}">RAYLEIGH DAMAGE DENSITY · PDF × STRESS<tspan baseline-shift="super" font-size="8">${fmt(b,1)}</tspan></text><path d="${linePath(amps,density,sx,syDamage)}L${sx(amps.at(-1))},${damageTop+h}L${sx(amps[0])},${damageTop+h}Z" fill="${C.red}" fill-opacity=".2" stroke="${C.red}" stroke-width="4"/><path d="M${x} ${damageTop+h}H${x+w}" stroke="${C.muted}"/><text x="${x+w/2}" y="${damageTop+h+34}" text-anchor="middle" font-size="12" fill="${C.muted}">peak alternating stress (${stressUnit(system)}) · 0 to ${fmt(stressValue(amps.at(-1),system),1)}</text>
    <text x="705" y="92" font-size="11" letter-spacing="1" fill="${C.muted}">S–N BASIS</text><path d="M${snX} ${snY}V${snY+snH}H${snX+snW}" fill="none" stroke="${C.muted}"/><path d="${linePath(snStress,snLife,sxSn,sySn)}" fill="none" stroke="${C.dark}" stroke-width="4"/>${bandPoints}<text x="${snX+snW/2}" y="${snY+snH+30}" text-anchor="middle" font-size="11" fill="${C.muted}">alternating stress (log)</text><text x="${snX-32}" y="${snY+snH/2}" transform="rotate(-90 ${snX-32} ${snY+snH/2})" text-anchor="middle" font-size="11" fill="${C.muted}">cycles to failure (log)</text>
    <rect x="705" y="424" width="240" height="84" rx="7" fill="${C.wash}"/><text x="825" y="450" text-anchor="middle" font-size="11" fill="${C.muted}">RAYLEIGH / THREE-BAND DAMAGE</text><text x="825" y="485" text-anchor="middle" font-size="26" font-weight="700" fill="${C.red}">${fmt(state.rayleighToThreeBandRatio,2)}×</text>`;
  return rootSvg(view.title||'Fatigue amplitude and damage','Rayleigh peak distribution, amplitude-weighted damage density, and the shared power-law S-N basis.',body);
}

function peakDurationVisual(view){
  const duration=Math.max(1,finite(view.durationSeconds,60)),rate=Math.max(1,finite(view.peakRateHz,300));
  const durations=Array.from({length:121},(_,i)=>1*(3600)**(i/120));
  const states=durations.map(value=>{const samples=Math.max(1,value*rate),inside=.9973002039367398;return{duration:value,probability:1-inside**samples,peak:Math.sqrt(2*Math.log(Math.max(2,2*samples)))}});
  const x=72,w=650,top=100,h=145,gap=84,fx0=0,fx1=log10(3600),sx=value=>x+(log10(value)-fx0)/(fx1-fx0)*w,syP=value=>top+h-clamp(value,0,1)*h;
  const peakTop=top+h+gap,peakMin=Math.min(...states.map(s=>s.peak)),peakMax=Math.max(...states.map(s=>s.peak)),syPeak=value=>peakTop+h-(value-peakMin)/(peakMax-peakMin)*h;
  const selectedSamples=duration*rate,selectedProbability=1-.9973002039367398**selectedSamples,selectedPeak=Math.sqrt(2*Math.log(Math.max(2,2*selectedSamples))),cursor=sx(duration);
  const ticks=[1,10,60,600,3600].map(value=>`<path d="M${sx(value)} ${top}V${peakTop+h}" stroke="${C.grid}" opacity=".25"/><text x="${sx(value)}" y="${peakTop+h+23}" text-anchor="middle" font-size="11" fill="${C.muted}">${value<60?`${value}s`:value<3600?`${fmt(value/60,0)}m`:'60m'}</text>`).join('');
  const body=`${heading(view.title||'Duration changes peak confidence while RMS stays fixed')}<text x="72" y="84" font-size="11" fill="${C.muted}">PROBABILITY OF AT LEAST ONE |PEAK| &gt; 3σ</text><path d="${linePath(states.map(s=>s.duration),states.map(s=>s.probability),sx,syP)}L${sx(3600)},${top+h}L${sx(1)},${top+h}Z" fill="${C.red}" fill-opacity=".14" stroke="${C.red}" stroke-width="4"/><path d="M${x} ${top+h}H${x+w}" stroke="${C.muted}"/><text x="72" y="${peakTop-15}" font-size="11" fill="${C.muted}">EXPECTED EXTREME SCREEN</text><path d="${linePath(states.map(s=>s.duration),states.map(s=>s.peak),sx,syPeak)}" fill="none" stroke="${C.teal}" stroke-width="4"/><path d="M${x} ${peakTop+h}H${x+w}" stroke="${C.muted}"/>${ticks}<path d="M${cursor} ${top-10}V${peakTop+h}" stroke="${C.rust}" stroke-width="3" stroke-dasharray="7 5"/><circle cx="${cursor}" cy="${syP(selectedProbability)}" r="7" fill="${C.red}"/><circle cx="${cursor}" cy="${syPeak(selectedPeak)}" r="7" fill="${C.teal}"/><text x="${x+w/2}" y="${peakTop+h+45}" text-anchor="middle" font-size="12" fill="${C.muted}">stationary exposure duration (log)</text>
    <text x="770" y="120" font-size="11" fill="${C.muted}">PEAK OPPORTUNITIES</text><text x="770" y="158" font-size="24" font-weight="700" fill="${C.ink}">${selectedSamples.toExponential(2)}</text><text x="770" y="206" font-size="12" fill="${C.muted}">P(any |peak| &gt; 3σ)</text><text x="770" y="242" font-size="24" font-weight="700" fill="${C.red}">${fmt(100*selectedProbability,3)}%</text><text x="770" y="298" font-size="12" fill="${C.muted}">expected extreme</text><text x="770" y="334" font-size="24" font-weight="700" fill="${C.teal}">${fmt(selectedPeak,2)}σ</text><text x="770" y="405" font-size="12" fill="${C.muted}">3σ remains a distribution level.</text><text x="770" y="425" font-size="12" fill="${C.muted}">Duration adds opportunities and cycles.</text>`;
  return rootSvg(view.title||'Duration-aware peak interpretation','Probability and expected peak factor versus duration with the selected exposure marked.',body);
}

function missionDamageVisual(view){
  const state=view.state||{},rows=state.rows||[];
  const x=68,w=570,top=118,h=300,minPositive=Math.min(...rows.map(row=>row.damage).filter(value=>value>0),1),lo=Math.min(-9,Math.floor(log10(minPositive))-1),hi=Math.max(0,Math.ceil(log10(Math.max(1,finite(state.totalDamage)))));
  const sy=value=>top+h-(log10(Math.max(value,10**lo))-lo)/(hi-lo)*h;
  const stepPoints=[];let prior=10**lo;rows.forEach((row,index)=>{stepPoints.push([index,prior],[index,row.cumulativeDamage]);prior=row.cumulativeDamage;});stepPoints.push([rows.length,prior]);
  const sx=index=>x+index/Math.max(1,rows.length)*w;
  const stepPath=stepPoints.map(([index,value],i)=>`${i?'L':'M'}${sx(index)},${sy(value)}`).join(' ');
  const yTicks=Array.from({length:hi-lo+1},(_,i)=>lo+i).map(power=>`<path d="M${x} ${sy(10**power)}H${x+w}" stroke="${C.grid}" opacity=".3"/><text x="${x-8}" y="${sy(10**power)+4}" text-anchor="end" font-size="10" fill="${C.muted}">10${String(power).replace('-','−')}</text>`).join('');
  const eventBlocks=rows.map((row,index)=>{const bx=sx(index)+5,bw=Math.max(18,w/Math.max(1,rows.length)-10);return `<rect x="${bx}" y="72" width="${bw}" height="30" rx="4" fill="${row===state.controlling?C.rust:C.teal}"/><text x="${bx+bw/2}" y="91" text-anchor="middle" font-size="10" fill="${C.white}">${esc(row.name.length>13?`${row.name.slice(0,12)}…`:row.name)}</text><path d="M${bx+bw/2} 102V${top+h}" stroke="${C.grid}" opacity=".16"/>`;}).join('');
  const ranked=[...rows].sort((a,b)=>b.damage-a.damage),bars=ranked.map((row,index)=>{const y=126+index*66,width=245*row.damageShare;return `<text x="690" y="${y}" font-size="12" fill="${C.ink}">${esc(row.name)}</text><rect x="690" y="${y+10}" width="245" height="20" rx="3" fill="${C.wash}"/><rect x="690" y="${y+10}" width="${width}" height="20" rx="3" fill="${row===state.controlling?C.rust:C.teal}"/><text x="940" y="${y+25}" text-anchor="end" font-size="11" fill="${C.ink}">${fmt(100*row.damageShare,1)}%</text>`;}).join('');
  const totalColor=finite(state.totalDamage)<=1?C.green:C.red;
  const body=`${heading(view.title||'Mission and test damage stays attributable')}<text x="68" y="68" font-size="11" fill="${C.muted}">EVENT TIMELINE</text>${eventBlocks}<text x="68" y="111" font-size="10" fill="${C.muted}">CUMULATIVE MINER DAMAGE · LOG SCALE</text>${yTicks}<path d="M${x} ${sy(1)}H${x+w}" stroke="${C.red}" stroke-width="3" stroke-dasharray="7 5"/><text x="${x+w-4}" y="${sy(1)-7}" text-anchor="end" font-size="11" fill="${C.red}">unity</text><path d="${stepPath}" fill="none" stroke="${totalColor}" stroke-width="5"/><circle cx="${sx(rows.length)}" cy="${sy(Math.max(state.totalDamage,10**lo))}" r="8" fill="${totalColor}"/><text x="${x+w/2}" y="455" text-anchor="middle" font-size="12" fill="${C.muted}">event order preserves test, retest, transport, and flight ownership</text>
    <text x="690" y="90" font-size="11" letter-spacing="1" fill="${C.muted}">DAMAGE PARETO</text>${bars}<rect x="690" y="${Math.min(495,145+ranked.length*66)}" width="245" height="50" rx="6" fill="${totalColor}"/><text x="812" y="${Math.min(525,175+ranked.length*66)}" text-anchor="middle" font-size="18" font-weight="700" fill="${C.white}">total D = ${fmt(state.totalDamage,4)}</text>`;
  return rootSvg(view.title||'Mission damage ledger','Event timeline, cumulative Miner damage on a log scale, and damage share by event.',body);
}

function designSpaceVisual(view){
  const state=view.state||{},thicknesses=state.thicknesses||[],spans=state.spans||[],grid=state.designGrid||[],system=view.displaySystem||'SI';
  if(!thicknesses.length||!spans.length)return rootSvg(view.title||'PCB design space','No design-space data available.',`${heading(view.title||'PCB design space')}<text x="50" y="110" fill="${C.muted}">No design grid available.</text>`);
  const x=72,y=92,w=650,h=390,cw=w/thicknesses.length,ch=h/spans.length;
  const tx=value=>x+(value-thicknesses[0])/(thicknesses.at(-1)-thicknesses[0])*w,sy=value=>y+h-(value-spans[0])/(spans.at(-1)-spans[0])*h;
  const fill=ratio=>{const q=log10(Math.max(ratio,1e-6));if(q<=0){const t=clamp((q+1.2)/1.2,0,1);return t<.6?C.green:C.amber;}return C.red;};
  const cells=grid.map((row,iy)=>row.map((cell,ix)=>`<rect x="${x+ix*cw}" y="${y+h-(iy+1)*ch}" width="${cw+.4}" height="${ch+.4}" fill="${fill(cell.demandRatio)}" opacity="${.42+.45*clamp(Math.abs(log10(cell.demandRatio)),0,1)}"><title>thickness ${fmt(mmValue(cell.thicknessMm,system),3)} ${mmUnit(system)}, span ${fmt(mmValue(cell.effectiveSpanMm,system),2)} ${mmUnit(system)}, ratio ${fmt(cell.demandRatio,3)}, fₙ ${fmt(cell.naturalFrequencyHz,0)} Hz</title></rect>`).join('')).join('');
  const boundary=thicknesses.map((thickness,ix)=>{let best=0,diff=Infinity;spans.forEach((span,iy)=>{const d=Math.abs(log10(grid[iy][ix].demandRatio));if(d<diff){diff=d;best=iy;}});return[tx(thickness),sy(spans[best])];});
  const candidateX=tx(finite(state.thicknessMm,thicknesses[Math.floor(thicknesses.length/2)])),candidateY=sy(finite(state.effectiveSpanMm,spans.at(-1)));
  const referenceX=tx(finite(view.referenceThicknessMm,thicknesses[Math.floor(thicknesses.length/3)])),referenceY=sy(finite(view.referenceSpanMm,spans.at(-1)));
  const xTicks=linearTicks(thicknesses[0],thicknesses.at(-1),5,value=>fmt(mmValue(value,system),2)),yTicks=linearTicks(spans[0],spans.at(-1),5,value=>fmt(mmValue(value,system),1));
  const body=`${heading(view.title||'Find the viable thickness and support-span region')}${cells}${axes({x,y,w,h,xLabel:`board thickness (${mmUnit(system)})`,yLabel:`effective support span (${mmUnit(system)})`,xTicks,yTicks,sx:tx,sy,grid:false})}<path d="${boundary.map(([px,py],i)=>`${i?'L':'M'}${px},${py}`).join(' ')}" fill="none" stroke="${C.white}" stroke-width="7" opacity=".9"/><path d="${boundary.map(([px,py],i)=>`${i?'L':'M'}${px},${py}`).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-dasharray="7 5"/><text x="${boundary[Math.floor(boundary.length*.68)][0]}" y="${boundary[Math.floor(boundary.length*.68)][1]-10}" font-size="11" fill="${C.ink}">demand / allowable = 1</text>
    <path d="M${referenceX} ${referenceY}L${candidateX} ${candidateY}" stroke="${C.ink}" stroke-width="3" marker-end="url(#design-arrow)"/><defs><marker id="design-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${C.ink}"/></marker></defs><circle cx="${referenceX}" cy="${referenceY}" r="9" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><circle cx="${candidateX}" cy="${candidateY}" r="10" fill="${ratioColor(state.demandRatio)}" stroke="${C.white}" stroke-width="3"/><text x="${referenceX+12}" y="${referenceY-10}" font-size="11" fill="${C.ink}">reference</text><text x="${candidateX+12}" y="${candidateY-10}" font-size="11" fill="${C.ink}">candidate</text>
    <text x="780" y="112" font-size="11" letter-spacing="1" fill="${C.muted}">SELECTED DESIGN</text><text x="780" y="154" font-size="13" fill="${C.muted}">natural frequency</text><text x="944" y="154" text-anchor="end" font-size="21" font-weight="700" fill="${C.ink}">${fmt(state.naturalFrequencyHz,0)} Hz</text><text x="780" y="204" font-size="13" fill="${C.muted}">center response</text><text x="944" y="204" text-anchor="end" font-size="18" font-weight="700" fill="${C.teal}">${fmt(mmValue(state.center3SigmaMm,system),4)} ${mmUnit(system)}</text><text x="780" y="252" font-size="13" fill="${C.muted}">allowable</text><text x="944" y="252" text-anchor="end" font-size="18" font-weight="700" fill="${C.rust}">${fmt(mmValue(state.allowableCenterMm,system),4)} ${mmUnit(system)}</text><rect x="780" y="290" width="164" height="62" rx="6" fill="${ratioColor(state.demandRatio)}"/><text x="862" y="315" text-anchor="middle" font-size="11" fill="${C.white}">DEMAND / ALLOWABLE</text><text x="862" y="340" text-anchor="middle" font-size="23" font-weight="700" fill="${C.white}">${fmt(state.demandRatio,2)}</text><text x="780" y="405" font-size="11" fill="${C.muted}">green ≤ 0.70</text><text x="780" y="427" font-size="11" fill="${C.muted}">amber 0.70–1.00</text><text x="780" y="449" font-size="11" fill="${C.muted}">red &gt; 1.00</text>`;
  return rootSvg(view.title||'PCB design space','Two-dimensional board thickness and support-span design map with pass-fail boundary and selected design.',body);
}

function correlationVisual(view){
  const state=view.state||{},frequencies=state.frequencies||[],predicted=state.predictedResponse||[],measured=state.measuredResponse||[],ratio=state.responseRatioDb||[],system=view.displaySystem||'SI';
  if(frequencies.length<2)return rootSvg(view.title||'Model-to-test correlation','No correlation data available.',`${heading(view.title||'Model-to-test correlation')}<text x="50" y="110" fill="${C.muted}">No correlation data available.</text>`);
  const x=75,w=655,top=100,h=220,bottomTop=385,bottomH=95,fx0=log10(frequencies[0]),fx1=log10(frequencies.at(-1)),sx=value=>x+(log10(value)-fx0)/(fx1-fx0)*w;
  const all=[...predicted,...measured].map(log10),lo=Math.min(...all),hi=Math.max(...all),sy=value=>top+h-(log10(value)-lo)/Math.max(hi-lo,1e-9)*h;
  const ratioLimit=Math.max(6,...ratio.map(Math.abs)),syRatio=value=>bottomTop+bottomH/2-value/ratioLimit*(bottomH/2);
  const ticks=[frequencies[0],state.predictedNaturalFrequencyHz,state.measuredNaturalFrequencyHz,frequencies.at(-1)].sort((a,b)=>a-b).map(value=>`<path d="M${sx(value)} ${top}V${bottomTop+bottomH}" stroke="${C.grid}" opacity=".22"/><text x="${sx(value)}" y="${bottomTop+bottomH+20}" text-anchor="middle" font-size="10" fill="${C.muted}">${fmt(value,0)}</text>`).join('');
  const status=state.passes?C.green:C.red;
  const body=`${heading(view.title||'Predicted and measured PCB response correlation')}<text x="75" y="84" font-size="11" fill="${C.muted}">RESPONSE SHAPE · LOG AMPLITUDE</text><path d="${linePath(frequencies,predicted,sx,sy)}" fill="none" stroke="${C.teal}" stroke-width="4"/><path d="${linePath(frequencies,measured,sx,sy)}" fill="none" stroke="${C.rust}" stroke-width="4"/><line x1="${sx(state.predictedNaturalFrequencyHz)}" y1="${top}" x2="${sx(state.predictedNaturalFrequencyHz)}" y2="${top+h}" stroke="${C.teal}" stroke-dasharray="6 5"/><line x1="${sx(state.measuredNaturalFrequencyHz)}" y1="${top}" x2="${sx(state.measuredNaturalFrequencyHz)}" y2="${top+h}" stroke="${C.rust}" stroke-dasharray="6 5"/><text x="90" y="118" font-size="11" fill="${C.teal}">predicted</text><text x="170" y="118" font-size="11" fill="${C.rust}">measured</text><path d="M${x} ${top+h}H${x+w}" stroke="${C.muted}"/>
    <text x="75" y="368" font-size="11" fill="${C.muted}">MEASURED / PREDICTED RESPONSE (dB)</text><path d="M${x} ${syRatio(0)}H${x+w}" stroke="${C.ink}"/><path d="M${x} ${syRatio(state.responseToleranceDb)}H${x+w}M${x} ${syRatio(-state.responseToleranceDb)}H${x+w}" stroke="${C.red}" stroke-dasharray="6 5"/><path d="${linePath(frequencies,ratio,sx,syRatio)}" fill="none" stroke="${C.purple}" stroke-width="4"/>${ticks}<text x="${x+w/2}" y="530" text-anchor="middle" font-size="12" fill="${C.muted}">frequency (Hz, log)</text>
    <text x="775" y="105" font-size="11" letter-spacing="1" fill="${C.muted}">CORRELATION CHECK</text><text x="775" y="133" font-size="11" fill="${C.muted}">mode-frequency error</text><text x="775" y="158" font-size="20" font-weight="700" fill="${state.frequencyPass?C.green:C.red}">${fmt(state.frequencyErrorPercent,1)}%</text><text x="775" y="190" font-size="11" fill="${C.muted}">peak response error</text><text x="775" y="215" font-size="20" font-weight="700" fill="${state.responsePass?C.green:C.red}">${fmt(state.peakResponseDifferenceDb,2)} dB</text><text x="775" y="247" font-size="11" fill="${C.muted}">measured 3σ peak</text><text x="775" y="272" font-size="18" font-weight="700" fill="${C.rust}">${fmt(mmValue(state.measuredPeakResponseMm,system),4)} ${mmUnit(system)}</text><text x="775" y="304" font-size="11" fill="${C.muted}">damage leverage</text><text x="775" y="329" font-size="20" font-weight="700" fill="${C.red}">${fmt(state.damageRatio,2)}×</text><rect x="775" y="356" width="169" height="58" rx="6" fill="${status}"/><text x="860" y="390" text-anchor="middle" font-size="17" font-weight="700" fill="${C.white}">${state.passes?'CORRELATED':'UPDATE MODEL'}</text><text x="775" y="456" font-size="11" fill="${C.muted}">Shape agreement matters in addition</text><text x="775" y="475" font-size="11" fill="${C.muted}">to matching one peak value.</text>`;
  return rootSvg(view.title||'Model-to-test correlation','Predicted and measured response curves, frequency-resolved response ratio, and correlation checks.',body);
}

function modeCurvatureVisual(view){
  const state=view.state||{},grid=state.grid||[],system=view.displaySystem||'SI';
  if(!grid.length||!grid[0]?.length)return rootSvg(view.title||'PCB mode and curvature','No mode-field data available.',`${heading(view.title||'PCB mode and curvature')}<text x="50" y="110" fill="${C.muted}">No mode field available.</text>`,1000,650);
  const field=String(view.field||'surface-strain');
  const fieldConfig={
    displacement:{key:'normalizedDisplacement',value:'displacementMm',label:'TRANSVERSE DISPLACEMENT',unit:mmUnit(system),convert:value=>mmValue(value,system),maximum:state.maxima?.displacementMm},
    'curvature-x':{key:'normalizedCurvatureX',value:'curvatureXPerMm',label:'X CURVATURE',unit:system==='English'?'1/in':'1/mm',convert:value=>system==='English'?value*25.4:value,maximum:state.maxima?.curvatureXPerMm},
    'curvature-y':{key:'normalizedCurvatureY',value:'curvatureYPerMm',label:'Y CURVATURE',unit:system==='English'?'1/in':'1/mm',convert:value=>system==='English'?value*25.4:value,maximum:state.maxima?.curvatureYPerMm},
    'surface-strain':{key:'normalizedSurfaceStrain',value:'surfaceStrainMicrostrain',label:'GOVERNING TOP-SURFACE PRINCIPAL STRAIN',unit:'µε',convert:value=>value,maximum:state.maxima?.surfaceStrainMicrostrain}
  }[field]||null;
  const config=fieldConfig||{key:'normalizedSurfaceStrain',value:'surfaceStrainMicrostrain',label:'GOVERNING TOP-SURFACE PRINCIPAL STRAIN',unit:'µε',convert:value=>value,maximum:state.maxima?.surfaceStrainMicrostrain};
  const bx=55,by=102,bw=620,bh=315,rows=grid.length,columns=grid[0].length,cw=bw/columns,ch=bh/rows;
  const signedFill=value=>value>=0?C.teal:C.rust;
  const cells=grid.map((row,iy)=>row.map((item,ix)=>{const normalized=clamp(finite(item[config.key]),-1,1);return `<rect x="${bx+ix*cw}" y="${by+iy*ch}" width="${cw+.45}" height="${ch+.45}" fill="${Math.abs(normalized)<.025?C.wash:signedFill(normalized)}" opacity="${.15+.78*Math.abs(normalized)}"/>`;}).join('')).join('');
  const nodalX=Array.from({length:Math.max(0,state.modeX-1)},(_,index)=>bx+bw*(index+1)/state.modeX).map(x=>`<path d="M${x} ${by}V${by+bh}" stroke="${C.white}" stroke-width="3" stroke-dasharray="7 5" opacity=".85"/>`).join('');
  const nodalY=Array.from({length:Math.max(0,state.modeY-1)},(_,index)=>by+bh*(index+1)/state.modeY).map(y=>`<path d="M${bx} ${y}H${bx+bw}" stroke="${C.white}" stroke-width="3" stroke-dasharray="7 5" opacity=".85"/>`).join('');
  const components=(state.componentRows||[]).map((component,index)=>{const x=bx+bw*component.xFraction,y=by+bh*component.yFraction;return `<g><circle cx="${x}" cy="${y}" r="${index?10:14}" fill="${index?C.ink:C.red}" stroke="${C.white}" stroke-width="3"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.white}">${esc(component.name)}</text><title>${esc(component.name)} · ${fmt(component.surfaceStrainMicrostrain,1)} µε · participation ${fmt(component.modeParticipation,3)}</title></g>`;}).join('');
  const cards=(state.modeCards||[]).map((card,index)=>{const col=index%2,row=Math.floor(index/2),x=720+col*125,y=103+row*105,w=105,h=72,cardRows=card.values.length,cardCols=card.values[0]?.length||1,selected=card.modeX===state.modeX&&card.modeY===state.modeY;const cardCells=card.values.map((values,iy)=>values.map((value,ix)=>`<rect x="${x+ix*w/cardCols}" y="${y+iy*h/cardRows}" width="${w/cardCols+.3}" height="${h/cardRows+.3}" fill="${Math.abs(value)<.03?C.wash:signedFill(value)}" opacity="${.12+.75*Math.abs(value)}"/>`).join('')).join('');return `${cardCells}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${selected?C.red:C.grid}" stroke-width="${selected?4:1.5}"/><text x="${x+w/2}" y="${y+h+18}" text-anchor="middle" font-size="10" fill="${selected?C.red:C.muted}">mode ${card.modeX}×${card.modeY} · ${fmt(card.frequencyRatio,2)} f₁₁</text>`;}).join('');
  const centerRow=grid[Math.floor((rows-1)/2)],crossValues=centerRow.map(item=>finite(item[config.key])),crossX=centerRow.map((_,index)=>index/(centerRow.length-1));
  const crossSx=value=>bx+value*bw,crossCenter=548,crossAmp=64,crossSy=value=>crossCenter-value*crossAmp;
  const component=state.controllingComponent;
  const body=`${heading(view.title||'Multimode displacement, curvature, and strain studio')}<text x="55" y="84" font-size="11" letter-spacing="1" fill="${C.muted}">${config.label} · MODE ${state.modeX} × ${state.modeY}</text>${cells}${nodalX}${nodalY}<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="none" stroke="${C.dark}" stroke-width="4"/>${components}<g fill="${C.ink}">${[[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7"/><circle cx="${x}" cy="${y}" r="2.5" fill="${C.paper}"/>`).join('')}</g>
    <g transform="translate(55 445)"><rect width="18" height="12" fill="${C.rust}"/><text x="25" y="11" font-size="10" fill="${C.muted}">negative</text><rect x="82" width="18" height="12" fill="${C.wash}"/><text x="107" y="11" font-size="10" fill="${C.muted}">node / zero</text><rect x="185" width="18" height="12" fill="${C.teal}"/><text x="210" y="11" font-size="10" fill="${C.muted}">positive</text><text x="390" y="11" font-size="10" fill="${C.muted}">white dashed lines are ideal modal nodes</text></g>
    <text x="720" y="82" font-size="11" letter-spacing="1" fill="${C.muted}">MODE FAMILY · FREQUENCY RATIO</text>${cards}
    <text x="55" y="482" font-size="11" letter-spacing="1" fill="${C.muted}">LINKED MIDSPAN CROSS-SECTION · ${config.label}</text><path d="M${bx} ${crossCenter}H${bx+bw}" stroke="${C.grid}"/><path d="${linePath(crossX,crossValues,crossSx,crossSy)}" fill="none" stroke="${C.purple}" stroke-width="5"/><text x="${bx}" y="626" font-size="10" fill="${C.muted}">x/L 0</text><text x="${bx+bw}" y="626" text-anchor="end" font-size="10" fill="${C.muted}">x/L 1</text>
    <text x="720" y="444" font-size="11" fill="${C.muted}">SELECTED MODE</text><text x="720" y="476" font-size="24" font-weight="700" fill="${C.ink}">${state.modeX} × ${state.modeY}</text><text x="845" y="476" font-size="17" fill="${C.rust}">${fmt(state.frequencyRatio,2)} f₁₁</text><text x="720" y="512" font-size="11" fill="${C.muted}">maximum ${config.label.toLowerCase()}</text><text x="720" y="540" font-size="19" font-weight="700" fill="${C.teal}">${fmt(config.convert(finite(config.maximum)),4)} ${config.unit}</text><text x="720" y="574" font-size="11" fill="${C.muted}">${component?`${esc(component.name)} governs entered component strain at ${fmt(component.surfaceStrainMicrostrain,1)} µε`:'Add components to compare local strain.'}</text><text x="720" y="611" font-size="10" fill="${C.muted}">Ideal sine modes are a screening field, not an FE solution.</text>`;
  return rootSvg(view.title||'PCB mode, curvature, and strain','Linked PCB mode field, nodal pattern, curvature or strain cross-section, component locations, and six-mode family.',body,1000,650);
}

function timeRainflowVisual(view){
  const state=view.state||{},time=state.time||[],stress=state.stress||[],bins=state.damageByAmplitude||[],matrix=state.matrix||[],system=view.displaySystem||'SI';
  if(time.length<2)return rootSvg(view.title||'Time history and rainflow damage','No synthesized response data available.',`${heading(view.title||'Time history and rainflow damage')}<text x="50" y="110" fill="${C.muted}">No synthesized response data available.</text>`,1000,650);
  const stressScale=system==='English'?.1450377377:1,unit=stressUnit(system),displayStress=stress.map(value=>value*stressScale),sigma=finite(state.stressRms)*stressScale;
  const tx=65,ty=105,tw=665,th=175,t0=time[0],t1=time.at(-1),sx=value=>tx+(value-t0)/Math.max(t1-t0,1e-12)*tw;
  const stressLimit=Math.max(3.5*sigma,...displayStress.map(Math.abs),Number.EPSILON),sy=value=>ty+th/2-value/stressLimit*(th/2);
  const timePath=linePath(time,displayStress,sx,sy),turning=(state.reversals||[]).filter((_,index,array)=>index%Math.max(1,Math.ceil(array.length/45))===0).map(point=>`<circle cx="${sx(time[point.index])}" cy="${sy(point.value*stressScale)}" r="3" fill="${C.rust}"/>`).join('');
  const threshold=[3*sigma,-3*sigma].map(value=>`<path d="M${tx} ${sy(value)}H${tx+tw}" stroke="${C.red}" stroke-width="2" stroke-dasharray="7 5"/><text x="${tx+tw-5}" y="${sy(value)-5}" text-anchor="end" font-size="10" fill="${C.red}">${value>0?'+':'−'}3σ</text>`).join('');
  const mx=65,my=365,mw=300,mh=185,mRows=matrix.length,mCols=matrix[0]?.length||0,maxCell=Math.max(...matrix.flat().map(cell=>cell.damage),Number.EPSILON);
  const matrixCells=matrix.map((row,iy)=>row.map((cell,ix)=>`<rect x="${mx+ix*mw/mCols}" y="${my+mh-(iy+1)*mh/mRows}" width="${mw/mCols+.3}" height="${mh/mRows+.3}" fill="${cell.damage?C.red:C.wash}" opacity="${cell.damage ? .18 + .78*Math.sqrt(cell.damage/maxCell) : .28}">${cell.count || cell.damage ? `<title>scaled cycles ${fmt(cell.count,2)}, damage ${fmt(cell.damage,5)}</title>` : ''}</rect>`).join('')).join('');
  const bx=425,by=365,bw=305,bh=185,maxShare=Math.max(...bins.map(bin=>bin.damageShare),Number.EPSILON),maxCount=Math.max(...bins.map(bin=>bin.count),Number.EPSILON),barWidth=bw/Math.max(1,bins.length);
  const bars=bins.map((bin,index)=>{const damageHeight=bh*bin.damageShare/maxShare,countHeight=bh*bin.count/maxCount;return `<rect x="${bx+index*barWidth+2}" y="${by+bh-damageHeight}" width="${Math.max(2,barWidth-4)}" height="${damageHeight}" fill="${C.red}"/><path d="M${bx+(index+.5)*barWidth} ${by+bh}V${by+bh-countHeight}" stroke="${C.teal}" stroke-width="3"><title>${fmt(bin.amplitude*stressScale,2)} ${unit}: ${fmt(bin.count,2)} cycles, ${fmt(100*bin.damageShare,2)}% damage</title></path>`;}).join('');
  const matrixMean=finite(state.meanLimit)*stressScale,amplitudeMax=finite(state.amplitudeMax)*stressScale;
  const body=`${heading(view.title||'Synthesized response → rainflow cycles → S–N damage')}<text x="65" y="84" font-size="11" letter-spacing="1" fill="${C.muted}">SYNTHESIZED REPRESENTATIVE WINDOW · DETERMINISTIC SEED ${state.seed}</text><rect x="${tx}" y="${ty}" width="${tw}" height="${th}" fill="${C.wash}" opacity=".32"/><path d="M${tx} ${sy(0)}H${tx+tw}" stroke="${C.ink}"/>${threshold}<path d="${timePath}" fill="none" stroke="${C.teal}" stroke-width="3"/>${turning}<text x="${tx+tw/2}" y="${ty+th+26}" text-anchor="middle" font-size="11" fill="${C.muted}">representative time (${fmt(state.displayDurationSeconds,4)} s shown from ${fmt(state.fullDurationSeconds,1)} s event)</text><text x="${tx-46}" y="${ty+th/2}" transform="rotate(-90 ${tx-46} ${ty+th/2})" text-anchor="middle" font-size="11" fill="${C.muted}">stress (${unit})</text>
    <text x="65" y="344" font-size="11" letter-spacing="1" fill="${C.muted}">RAINFLOW MATRIX · AMPLITUDE × MEAN STRESS</text>${matrixCells}<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" fill="none" stroke="${C.muted}"/><text x="${mx+mw/2}" y="${my+mh+27}" text-anchor="middle" font-size="11" fill="${C.muted}">cycle amplitude 0 → ${fmt(amplitudeMax,1)} ${unit}</text><text x="${mx-43}" y="${my+mh/2}" transform="rotate(-90 ${mx-43} ${my+mh/2})" text-anchor="middle" font-size="11" fill="${C.muted}">mean −${fmt(matrixMean,1)} → +${fmt(matrixMean,1)}</text>
    <text x="425" y="344" font-size="11" letter-spacing="1" fill="${C.muted}">S–N DAMAGE BY AMPLITUDE BIN</text><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${C.wash}" opacity=".3"/>${bars}<path d="M${bx} ${by+bh}H${bx+bw}" stroke="${C.muted}"/><text x="${bx+12}" y="${by+18}" font-size="10" fill="${C.red}">damage share bars</text><text x="${bx+118}" y="${by+18}" font-size="10" fill="${C.teal}">cycle-count stems</text><text x="${bx+bw/2}" y="${by+bh+27}" text-anchor="middle" font-size="11" fill="${C.muted}">rainflow amplitude (${unit})</text>
    <text x="775" y="108" font-size="11" letter-spacing="1" fill="${C.muted}">LINKED RESULT</text><text x="775" y="144" font-size="12" fill="${C.muted}">target / synthesized RMS</text><text x="945" y="168" text-anchor="end" font-size="18" font-weight="700" fill="${C.ink}">${fmt(state.targetStressRms*stressScale,2)} / ${fmt(sigma,2)} ${unit}</text><text x="775" y="210" font-size="12" fill="${C.muted}">largest displayed excursion</text><text x="945" y="236" text-anchor="end" font-size="22" font-weight="700" fill="${C.rust}">${fmt(state.maximumSigma,2)}σ</text><text x="775" y="278" font-size="12" fill="${C.muted}">turning points / rainflow bins</text><text x="945" y="304" text-anchor="end" font-size="18" font-weight="700" fill="${C.ink}">${state.reversals?.length||0} / ${state.cycles?.length||0}</text><text x="775" y="348" font-size="12" fill="${C.muted}">scaled event damage</text><text x="945" y="382" text-anchor="end" font-size="24" font-weight="700" fill="${finite(state.totalDamage)<=1?C.green:C.red}">${fmt(state.totalDamage,5)}</text><text x="775" y="430" font-size="11" fill="${C.muted}">bandwidth ${fmt(100*state.fractionalBandwidth,0)}% · f₀ ${fmt(state.dominantFrequencyHz,0)} Hz</text><text x="775" y="452" font-size="11" fill="${C.muted}">cycle scale ${fmt(state.cycleScale,1)}× · repeats ${fmt(state.repeats,1)}</text><rect x="775" y="486" width="170" height="62" rx="6" fill="${C.purple}"/><text x="860" y="511" text-anchor="middle" font-size="10" fill="${C.white}">SYNTHETIC, NOT MEASURED</text><text x="860" y="535" text-anchor="middle" font-size="15" font-weight="700" fill="${C.white}">retain the seed + basis</text><text x="775" y="588" font-size="10" fill="${C.muted}">Use measured time histories when nonstationarity, clipping,</text><text x="775" y="607" font-size="10" fill="${C.muted}">mean stress, or non-Gaussian response matters.</text>`;
  return rootSvg(view.title||'Time history and rainflow damage','Deterministic synthesized response, turning points, rainflow matrix, amplitude-binned S-N damage, and event scaling.',body,1000,650);
}

function testLayoutVisual(view){
  const state=view.state||{},channels=state.channels||[],selected=state.selected||channels[0]||{},bx=55,by=112,bw=535,bh=300;
  const cells=Array.from({length:20},(_,ix)=>Array.from({length:12},(_,iy)=>{const amplitude=Math.abs(Math.sin(Math.PI*(ix+.5)/20)*Math.sin(Math.PI*(iy+.5)/12));return `<rect x="${bx+ix*bw/20}" y="${by+iy*bh/12}" width="${bw/20+.4}" height="${bh/12+.4}" fill="${C.teal}" opacity="${.05+.48*amplitude}"/>`;}).join('')).join('');
  const position=channel=>channel.location==='fixture'?{x:84,y:458}:{x:bx+bw*channel.xFraction,y:by+bh*channel.yFraction};
  const sensorMarkup=channels.map(channel=>{const {x,y}=position(channel),active=channel.id===selected.id,color=channel.id.startsWith('SG')?C.rust:channel.id.startsWith('DISP')?C.purple:channel.id.startsWith('E-')?C.red:C.teal;const shape=channel.id.startsWith('SG')?`<path d="M${x} ${y-13}L${x+13} ${y}L${x} ${y+13}L${x-13} ${y}Z" fill="${color}"/>`:channel.id.startsWith('DISP')?`<rect x="${x-13}" y="${y-9}" width="26" height="18" rx="3" fill="${color}"/>`:`<circle cx="${x}" cy="${y}" r="12" fill="${color}"/>`;const label=channel.id==='E-1'?{x:x-19,y:y+27,anchor:'end'}:channel.id==='DISP-1'?{x:x+18,y:y-17,anchor:'start'}:{x:x+17,y:y-15,anchor:'start'};return `<g data-channel-id="${esc(channel.id)}">${active?`<circle cx="${x}" cy="${y}" r="21" fill="none" stroke="${C.white}" stroke-width="5"/><circle cx="${x}" cy="${y}" r="25" fill="none" stroke="${C.red}" stroke-width="2"/>`:''}${shape}<text x="${label.x}" y="${label.y}" text-anchor="${label.anchor}" font-size="10" font-weight="700" fill="${C.ink}">${esc(channel.id)}</text><title>${esc(channel.id)} · ${esc(channel.type)} · ${esc(channel.quantity)}</title></g>`;}).join('');
  const steps=(state.evidenceChain||[]).map((step,index)=>{const y=105+index*89,done=index===0?true:index===1?state.frequencyPass:index===2?state.responsePass:state.correlationPass,color=done?C.green:C.red;return `<rect x="650" y="${y}" width="295" height="68" rx="6" fill="${C.wash}"/><circle cx="674" cy="${y+34}" r="14" fill="${color}"/><text x="674" y="${y+38}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.white}">${index+1}</text><text x="698" y="${y+23}" font-size="12" font-weight="700" fill="${C.ink}">${esc(step.stage)}</text><text x="698" y="${y+42}" font-size="10" fill="${C.muted}">${esc(step.channelId)} · ${esc(step.quantity)}</text><text x="698" y="${y+58}" font-size="10" fill="${color}">${esc(step.evidence)}</text>${index<3?`<path d="M674 ${y+68}V${y+89}" stroke="${C.grid}" stroke-width="3"/>`:''}`;}).join('');
  const status=state.correlationPass?C.green:C.red;
  const body=`${heading(view.title||'Instrument the mechanical chain, not only the fixture')}<text x="55" y="88" font-size="11" letter-spacing="1" fill="${C.muted}">CONCEPTUAL PCB TEST LAYOUT · CLICK OR SELECT A CHANNEL</text>${cells}<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="none" stroke="${C.dark}" stroke-width="4"/><path d="M35 446H610V476H35Z" fill="${C.ink}"/><path d="M${bx} ${by+bh}V446M${bx+bw} ${by+bh}V446" stroke="${C.ink}" stroke-width="10"/>${sensorMarkup}<text x="115" y="464" font-size="10" fill="${C.white}">FIXTURE / SHAKER INTERFACE</text><path d="M84 438V420" stroke="${C.red}" stroke-width="3" marker-end="url(#test-arrow)"/><defs><marker id="test-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${C.red}"/></marker></defs>
    <rect x="55" y="500" width="535" height="92" rx="7" fill="${C.wash}"/><text x="75" y="523" font-size="10" letter-spacing="1" fill="${C.muted}">SELECTED CHANNEL</text><text x="75" y="550" font-size="18" font-weight="700" fill="${C.ink}">${esc(selected.id||'—')} · ${esc(selected.type||'')}</text><text x="75" y="574" font-size="11" fill="${C.rust}">${esc(selected.quantity||'')} · direction ${esc(selected.direction||'—')}</text><text x="310" y="550" font-size="11" fill="${C.muted}">closes</text><text x="310" y="574" font-size="12" font-weight="700" fill="${C.ink}">${esc(selected.closes||'')}</text>
    <text x="650" y="82" font-size="11" letter-spacing="1" fill="${C.muted}">CORRELATION EVIDENCE CHAIN</text>${steps}<rect x="650" y="475" width="295" height="78" rx="7" fill="${status}"/><text x="797" y="500" text-anchor="middle" font-size="10" fill="${C.white}">FREQUENCY ${fmt(state.frequencyErrorPercent,1)}% · RESPONSE ${fmt(state.responseDifferenceDb,2)} dB</text><text x="797" y="530" text-anchor="middle" font-size="19" font-weight="700" fill="${C.white}">${state.correlationPass?'CHAIN CORRELATED':'EVIDENCE GAP REMAINS'}</text><text x="650" y="583" font-size="10" fill="${C.muted}">Conceptual placement only. Check sensor mass, range, noise,</text><text x="650" y="602" font-size="10" fill="${C.muted}">attachment, gage reinforcement, cabling, and DAQ uncertainty.</text>`;
  return rootSvg(view.title||'PCB correlation instrumentation layout','PCB and fixture instrumentation layout linked to control, dynamics, local deformation, and functional evidence.',body,1000,630);
}

const renderers=Object.freeze({
  'pcb-motion':pcbMotionVisual,
  'response-chain':responseChainVisual,
  'component-risk-map':componentMapVisual,
  'fatigue-damage':fatigueDamageVisual,
  'peak-duration':peakDurationVisual,
  'mission-damage':missionDamageVisual,
  'design-space':designSpaceVisual,
  'test-correlation':correlationVisual,
  'mode-curvature':modeCurvatureVisual,
  'time-rainflow':timeRainflowVisual,
  'test-layout':testLayoutVisual
});

export const electronicsFatigueVisualKinds=Object.freeze(Object.keys(renderers));

export function electronicsFatigueVisualSvg(visual,options={}){
  const kind=String(visual?.kind||'');
  const renderer=renderers[kind];
  if(!renderer)return rootSvg(visual?.title||'Electronics fatigue visualization',`Unsupported visualization type ${kind}.`,`${heading(visual?.title||'Electronics fatigue visualization')}<text x="50" y="110" fill="${C.red}">Unsupported visualization type: ${esc(kind)}</text>`,options.width||1000,options.height||560);
  return renderer({...visual,...options});
}
