const palette = ['#1e6077','#b96d37','#376e56','#744f78','#8f423a','#6b7276'];

export function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function formatNumber(value, digits = 4) {
  if (typeof value === 'string') return value;
  const x = Number(value);
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) return x.toExponential(3);
  if (a >= 1000) return x.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (a >= 100) return x.toFixed(1);
  if (a >= 10) return x.toFixed(2);
  if (a >= 1) return x.toFixed(3);
  return x.toPrecision(digits);
}

function linearTicks(min, max, count = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / Math.max(1, count - 1);
  const pow = 10 ** Math.floor(Math.log10(Math.abs(raw)));
  const r = raw / pow;
  const nice = r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10;
  const step = nice * pow;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const out = [];
  for (let v = start; v <= end + step * .2; v += step) out.push(v);
  return out;
}

export function formatLogTick(value) {
  const numeric = Number(value);
  if (!(numeric > 0) || !Number.isFinite(numeric)) return formatNumber(numeric, 3);
  const exponent = Math.round(Math.log10(numeric));
  const power = 10 ** exponent;
  if (Math.abs(numeric / power - 1) > 1e-10) return formatNumber(numeric, 3);
  if (exponent >= 0 && exponent <= 6) return `1${'0'.repeat(exponent)}`;
  if (exponent < 0 && exponent >= -6) return `0.${'0'.repeat(-exponent - 1)}1`;
  return `1e${exponent}`;
}

export function logTicks(min, max) {
  const lower = Math.max(Number(min), 1e-300), upper = Number(max);
  if (!(upper >= lower) || !Number.isFinite(upper)) return [];
  const lo = Math.max(-300, Math.floor(Math.log10(lower)));
  const hi = Math.min(308, Math.floor(Math.log10(upper)));
  const ticks = [];
  for (let exponent = lo; exponent <= hi; exponent++) {
    const decade = 10 ** exponent;
    for (let multiplier = 1; multiplier <= 9; multiplier++) {
      const value = multiplier * decade;
      if (!Number.isFinite(value)) continue;
      const tolerance = Math.max(Number.EPSILON * Math.abs(value) * 8, Math.abs(value) * 1e-12);
      if (value + tolerance >= lower && value - tolerance <= upper) ticks.push({ value, major: multiplier === 1, exponent, multiplier });
    }
  }
  return ticks;
}

function extent(plot, axis) {
  const vals = [];
  const domainTraces = Array.isArray(plot.domainTraces) && plot.domainTraces.length ? plot.domainTraces : plot.traces;
  for (const t of domainTraces ?? []) {
    const arr = axis === 'x' ? t.x : t.y;
    for (const v of arr ?? []) if (Number.isFinite(Number(v))) vals.push(Number(v));
  }
  if (!vals.length) return [0, 1];
  let min = Math.min(...vals), max = Math.max(...vals);
  const isLog = plot[`${axis}Scale`] === 'log';
  if (isLog) {
    const pos = vals.filter(v => v > 0);
    if (!pos.length) return [1, 10];
    min = Math.min(...pos); max = Math.max(...pos);
    if (plot[`${axis}Min`] != null && Number(plot[`${axis}Min`]) > 0) min = Number(plot[`${axis}Min`]);
    if (plot[`${axis}Max`] != null && Number(plot[`${axis}Max`]) > 0) max = Number(plot[`${axis}Max`]);
    if (min === max) { min /= 2; max *= 2; }
    return [min, max];
  }
  if (plot[`${axis}Min`] != null) min = Number(plot[`${axis}Min`]);
  if (plot[`${axis}Max`] != null) max = Number(plot[`${axis}Max`]);
  if (min === max) { min -= Math.abs(min || 1) * .1; max += Math.abs(max || 1) * .1; }
  const pad = (max - min) * .055;
  return [min - pad, max + pad];
}

function scaleFn(min, max, outMin, outMax, log = false) {
  if (log) {
    const a = Math.log10(min), b = Math.log10(max);
    return value => outMin + (Math.log10(Math.max(value, min)) - a) / (b - a) * (outMax - outMin);
  }
  return value => outMin + (value - min) / (max - min) * (outMax - outMin);
}

function pathFromTrace(t, sx, sy, xLog, yLog) {
  const parts = [];
  let started = false;
  const N = Math.min(t.x?.length ?? 0, t.y?.length ?? 0);
  for (let i = 0; i < N; i++) {
    const x = Number(t.x[i]), y = Number(t.y[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || (xLog && x <= 0) || (yLog && y <= 0)) { started = false; continue; }
    parts.push(`${started ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`);
    started = true;
  }
  return parts.join(' ');
}

export function lineChartSvg(plot, { width = 840, height = 390 } = {}) {
  const legendWidth=width-72-24-16;let legendRows=1,legendCursor=0;
  const layoutTraces=Array.isArray(plot.domainTraces)&&plot.domainTraces.length?plot.domainTraces:plot.traces;
  for(const trace of layoutTraces??[]){const itemWidth=Math.max(90,String(trace.name||'Trace').length*6.3+36);if(legendCursor&&legendCursor+itemWidth>legendWidth){legendRows++;legendCursor=0;}legendCursor+=itemWidth;}
  const m = { left: 72, right: 24, top: 55+(legendRows-1)*19, bottom: 60 };
  const innerW = width - m.left - m.right, innerH = height - m.top - m.bottom;
  const [xmin, xmax] = extent(plot, 'x'), [ymin, ymax] = extent(plot, 'y');
  const xLog = plot.xScale === 'log', yLog = plot.yScale === 'log';
  const sx = scaleFn(xmin, xmax, m.left, m.left + innerW, xLog);
  const sy = scaleFn(ymin, ymax, m.top + innerH, m.top, yLog);
  const xTicks = xLog ? logTicks(xmin, xmax) : linearTicks(xmin, xmax).map(value => ({ value, major: true }));
  const yTicks = yLog ? logTicks(ymin, ymax) : linearTicks(ymin, ymax).map(value => ({ value, major: true }));
  const clipId = `clip-${Math.random().toString(36).slice(2)}`;
  const harmonic=plot.animation?.type==='harmonic';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(plot.title || 'Engineering chart')}" data-chart-x-domain="${xmin},${xmax}" data-chart-y-domain="${ymin},${ymax}"${harmonic?` data-chart-animation="harmonic" data-chart-zero-y="${sy(0).toFixed(3)}"`:''}>`;
  s += `<rect width="${width}" height="${height}" fill="#fff"/><defs><clipPath id="${clipId}"><rect x="${m.left}" y="${m.top}" width="${innerW}" height="${innerH}"/></clipPath></defs>`;
  s += `<text x="${m.left}" y="22" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="700" fill="#172027">${escapeHtml(plot.title || '')}</text>`;
  for (const t of xTicks) {
    const x = sx(t.value);
    s += `<line data-axis-grid="x-${t.major?'major':'minor'}" data-axis-value="${t.value}" x1="${x}" x2="${x}" y1="${m.top}" y2="${m.top + innerH}" stroke="${t.major ? '#d9d4ca' : '#f1eee8'}" stroke-width="${t.major ? 1 : .55}"/>`;
    if (t.major || !xLog) s += `<text data-axis-label="x-major" data-axis-value="${t.value}" x="${x}" y="${m.top + innerH + 20}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="#667176">${escapeHtml(xLog?formatLogTick(t.value):formatNumber(t.value,3))}</text>`;
  }
  for (const t of yTicks) {
    const y = sy(t.value);
    s += `<line data-axis-grid="y-${t.major?'major':'minor'}" data-axis-value="${t.value}" x1="${m.left}" x2="${m.left + innerW}" y1="${y}" y2="${y}" stroke="${t.major ? '#d9d4ca' : '#f1eee8'}" stroke-width="${t.major ? 1 : .55}"/>`;
    if (t.major || !yLog) s += `<text data-axis-label="y-major" data-axis-value="${t.value}" x="${m.left - 10}" y="${y + 3}" text-anchor="end" font-family="ui-monospace,monospace" font-size="10" fill="#667176">${escapeHtml(yLog?formatLogTick(t.value):formatNumber(t.value,3))}</text>`;
  }
  s += `<line x1="${m.left}" x2="${m.left+innerW}" y1="${m.top+innerH}" y2="${m.top+innerH}" stroke="#172027"/><line x1="${m.left}" x2="${m.left}" y1="${m.top}" y2="${m.top+innerH}" stroke="#172027"/>`;
  s += `<g clip-path="url(#${clipId})">`;
  (plot.traces ?? []).forEach((t, i) => {
    const traceIndex = Number.isInteger(t.sourceIndex) ? t.sourceIndex : i;
    const color = t.color || palette[traceIndex % palette.length];
    const path = pathFromTrace(t, sx, sy, xLog, yLog);
    if (path&&!t.hideLine) s += `<path data-chart-trace="${traceIndex}"${harmonic?' data-chart-animated-path="true" vector-effect="non-scaling-stroke"':''} d="${path}" fill="none" stroke="${color}" stroke-width="${t.emphasis ? 3 : 2}" stroke-linejoin="round" stroke-linecap="round" ${t.dash ? 'stroke-dasharray="7 5"' : ''}/>`;
    const count=Math.min(t.x?.length??0,t.y?.length??0),step=Math.max(1,Math.ceil(count/80));
    for(let point=0;point<count;point+=step){const x=Number(t.x[point]),y=Number(t.y[point]);if(!Number.isFinite(x)||!Number.isFinite(y)||(xLog&&x<=0)||(yLog&&y<=0))continue;const cx=sx(x).toFixed(2),cy=sy(y).toFixed(2),pointLabel=t.pointLabels?.[point]||t.name||`Trace ${i+1}`;if(t.showPoints)s+=`<circle data-chart-visible-point="${traceIndex}" cx="${cx}" cy="${cy}" r="${Number(t.pointRadius)||4.5}" fill="${color}" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`;s+=`<circle data-chart-trace="${traceIndex}" cx="${cx}" cy="${cy}" r="7" fill="transparent" stroke="transparent" pointer-events="all"><title>${escapeHtml(pointLabel)} · ${escapeHtml(plot.xLabel||'x')}: ${escapeHtml(formatNumber(x))} · ${escapeHtml(plot.yLabel||'y')}: ${escapeHtml(formatNumber(y))}</title></circle>`;}
  });
  s += `</g>`;
  s += `<text x="${m.left + innerW/2}" y="${height - 12}" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(plot.xLabel || '')}</text>`;
  s += `<text x="16" y="${m.top + innerH/2}" text-anchor="middle" transform="rotate(-90 16 ${m.top + innerH/2})" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(plot.yLabel || '')}</text>`;
  let lx = m.left + 8, ly = 42;
  (plot.traces ?? []).forEach((t, i) => {
    const traceIndex = Number.isInteger(t.sourceIndex) ? t.sourceIndex : i;
    const color = t.color || palette[traceIndex % palette.length];
    const label = String(t.name || `Trace ${i+1}`);
    const itemW = Math.max(90, label.length * 6.3 + 36);
    if (lx + itemW > m.left + innerW) { lx = m.left + 8; ly += 19; }
    s += `<g data-legend-trace="${traceIndex}" role="button" tabindex="0" style="cursor:pointer"><line x1="${lx}" x2="${lx+19}" y1="${ly}" y2="${ly}" stroke="${color}" stroke-width="2.5" ${t.dash ? 'stroke-dasharray="6 4"' : ''}/><text x="${lx+25}" y="${ly+3}" font-family="ui-sans-serif,system-ui" font-size="10" fill="#344047">${escapeHtml(label)}</text><title>Toggle ${escapeHtml(label)}</title></g>`;
    lx += itemW;
  });
  s += `</svg>`;
  return s;
}

/** Render one or more engineering capability intervals on a shared linear or logarithmic axis. */
export function rangeChartSvg(chart, { width = 840 } = {}) {
  const log=chart.scale==='log',lanes=(chart.lanes||[]).filter(lane=>Number.isFinite(Number(lane.end))&&(!log||Number(lane.end)>0)),markers=(chart.markers||[]).filter(marker=>Number.isFinite(Number(marker.value))&&(!log||Number(marker.value)>0));
  const rawValues=[...lanes.flatMap(lane=>lane.start==null?[lane.end]:[lane.start,lane.end]),...markers.map(marker=>marker.value)].map(Number).filter(value=>Number.isFinite(value)&&(!log||value>0));
  if(!rawValues.length)return'';
  let min=Number.isFinite(Number(chart.min))?Number(chart.min):Math.min(...rawValues),max=Number.isFinite(Number(chart.max))?Number(chart.max):Math.max(...rawValues);
  if(log){min=Math.max(1e-30,min);if(min===max){min/=10;max*=10;}}else if(min===max){min-=Math.abs(min||1);max+=Math.abs(max||1);}
  const height=Math.max(190,118+lanes.length*54),m={left:168,right:34,top:54,bottom:48},innerW=width-m.left-m.right,innerH=height-m.top-m.bottom,sx=scaleFn(min,max,m.left,m.left+innerW,log),ticks=log?logTicks(min,max):linearTicks(min,max,6).map(value=>({value,major:true}));
  const laneColor={primary:palette[0],secondary:palette[1],sensor:palette[2],daq:palette[1],usable:palette[0],muted:palette[5]};
  const labelValue=value=>`${formatNumber(value,3)}${chart.unit?` ${chart.unit}`:''}`;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.title||'Engineering capability range')}"><title>${escapeHtml(chart.title||'Engineering capability range')}</title><desc>${escapeHtml(chart.description||'Ranges and limiting values shown on a shared engineering scale.')}</desc><rect width="${width}" height="${height}" fill="#fff"/>`;
  s+=`<text x="${m.left}" y="22" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="700" fill="#172027">${escapeHtml(chart.title||'')}</text>`;
  for(const tick of ticks){const x=sx(tick.value);s+=`<line data-axis-grid="x-${tick.major?'major':'minor'}" data-axis-value="${tick.value}" x1="${x}" x2="${x}" y1="${m.top-8}" y2="${m.top+innerH}" stroke="${tick.major?'#d9d4ca':'#f1eee8'}" stroke-width="${tick.major?1:.55}"/>`;if(tick.major||!log)s+=`<text data-axis-label="x-major" data-axis-value="${tick.value}" x="${x}" y="${height-25}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="#667176">${escapeHtml(log?formatLogTick(tick.value):formatNumber(tick.value,3))}</text>`;}
  lanes.forEach((lane,index)=>{const y=m.top+26+index*54,startKnown=lane.start!=null&&Number.isFinite(Number(lane.start))&&(!log||Number(lane.start)>0),start=startKnown?Number(lane.start):min,end=Number(lane.end),x1=sx(Math.max(min,start)),x2=sx(Math.min(max,end)),color=lane.color||laneColor[lane.tone]||palette[index%palette.length],open=!startKnown;
    s+=`<text x="${m.left-12}" y="${y-2}" text-anchor="end" font-family="ui-sans-serif,system-ui" font-size="11" font-weight="700" fill="#344047">${escapeHtml(lane.label||`Range ${index+1}`)}</text>`;
    if(lane.note)s+=`<text x="${m.left-12}" y="${y+14}" text-anchor="end" font-family="ui-sans-serif,system-ui" font-size="9" fill="#667176">${escapeHtml(lane.note)}</text>`;
    s+=`<line x1="${m.left}" x2="${m.left+innerW}" y1="${y}" y2="${y}" stroke="#eeeae3"/>`;
    s+=`<rect x="${x1}" y="${y-8}" width="${Math.max(2,x2-x1)}" height="16" rx="8" fill="${color}" fill-opacity="${lane.tone==='usable' ? .92 : .72}"${open?' stroke="#667176" stroke-dasharray="5 4"':''}><title>${escapeHtml(lane.label||'Range')}: ${open?'lower limit not published':labelValue(start)} to ${labelValue(end)}</title></rect>`;
    if(!open)s+=`<circle cx="${x1}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/><text x="${x1}" y="${y-13}" text-anchor="start" font-family="ui-monospace,monospace" font-size="9" fill="#344047">${escapeHtml(lane.startLabel||labelValue(start))}</text>`;
    else s+=`<text x="${x1+5}" y="${y-13}" text-anchor="start" font-family="ui-sans-serif,system-ui" font-size="9" fill="#667176">floor not published</text>`;
    s+=`<circle cx="${x2}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/><text x="${x2}" y="${y-13}" text-anchor="end" font-family="ui-monospace,monospace" font-size="9" fill="#344047">${escapeHtml(lane.endLabel||labelValue(end))}</text>`;
  });
  markers.forEach((marker,index)=>{const value=Number(marker.value);if(value<min||value>max)return;const laneIndex=Math.max(0,Math.min(lanes.length-1,Number(marker.lane)||0)),y=m.top+26+laneIndex*54,x=sx(value),color=marker.color||palette[(index+3)%palette.length],anchor=x>m.left+innerW*.76?'end':'start',dx=anchor==='end'?-7:7;
    s+=`<line x1="${x}" x2="${x}" y1="${y-17}" y2="${y+17}" stroke="${color}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${escapeHtml(marker.label||'Marker')}: ${escapeHtml(labelValue(value))}</title></circle><text x="${x+dx}" y="${y+23}" text-anchor="${anchor}" font-family="ui-sans-serif,system-ui" font-size="9" fill="#344047">${escapeHtml(marker.label||labelValue(value))}</text>`;
  });
  s+=`<line x1="${m.left}" x2="${m.left+innerW}" y1="${m.top+innerH}" y2="${m.top+innerH}" stroke="#172027"/><text x="${m.left+innerW/2}" y="${height-8}" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(chart.axisLabel||'')}</text></svg>`;
  return s;
}

function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  const a = [244,242,236], b = [30,96,119];
  const c = a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  return `rgb(${c.join(',')})`;
}

export function signedHeatColor(value, scale) {
  const t = Math.max(-1, Math.min(1, value / Math.max(scale, 1e-12)));
  const neutral = [238,242,244], target = t < 0 ? [39,105,171] : [205,83,57], amount = Math.abs(t);
  const color = neutral.map((channel,index)=>Math.round(channel+(target[index]-channel)*amount));
  return `rgb(${color.join(',')})`;
}

export function harmonicPhase(elapsedSeconds, cyclesPerSecond = .5) {
  return Math.cos(2*Math.PI*Math.max(0,Number(elapsedSeconds)||0)*Math.max(0,Number(cyclesPerSecond)||0));
}

function projectOblique(point, yaw, pitch) {
  const [x,y,z]=point,cosYaw=Math.cos(yaw),sinYaw=Math.sin(yaw),cosPitch=Math.cos(pitch),sinPitch=Math.sin(pitch);
  const xr=cosYaw*x-sinYaw*y,yr=sinYaw*x+cosYaw*y;
  return {x:xr,y:sinPitch*yr-cosPitch*z,depth:cosPitch*yr+sinPitch*z};
}

const svgPointList = values => values.map(value=>Number(value).toFixed(3)).join(',');
const svgPolygonPoints = values => Array.from({length:Math.floor(values.length/2)},(_,index)=>`${Number(values[index*2]).toFixed(3)},${Number(values[index*2+1]).toFixed(3)}`).join(' ');

/** Render an animated oblique 3D mode surface without requiring a WebGL dependency. */
export function surface3dSvg(surface, { width = 720, height = 520 } = {}) {
  const matrix=surface.matrix||[],rows=matrix.length,columns=Math.max(0,...matrix.map(row=>row.length));
  if(rows<2||columns<2)return'';
  const geometry=surface.geometry==='cylinder'?'cylinder':surface.geometry==='beam'?'beam':'plate',isCylinder=geometry==='cylinder',isBeam=geometry==='beam',margin={left:34,right:88,top:48,bottom:54},availableW=width-margin.left-margin.right,availableH=height-margin.top-margin.bottom;
  const requestedYaw=Number(surface.viewYawDeg),requestedPitch=Number(surface.viewPitchDeg),yaw=(Number.isFinite(requestedYaw)?requestedYaw:-38)*Math.PI/180,pitch=(Number.isFinite(requestedPitch)?requestedPitch:geometry==='cylinder'?24:38)*Math.PI/180;
  const aspect=Math.max(.35,Math.min(isBeam?8:3,Number(surface.aspectRatio)||1)),maxPlateSpan=2;
  const plateWidth=aspect>=1?maxPlateSpan:maxPlateSpan*aspect,plateDepth=aspect>=1?maxPlateSpan/aspect:maxPlateSpan;
  const lengthToDiameter=Math.max(.6,Math.min(4,Number(surface.lengthToDiameter)||2));
  const cylinderLength=2*lengthToDiameter,deformationScale=Math.max(.04,Math.min(.45,Number(surface.deformationScale)||(isCylinder?.18:isBeam?.4:.34)));
  const nodes=matrix.map((row,rowIndex)=>row.map((value,columnIndex)=>{
    const normalized=Number(value)||0;
    let base,delta;
    if(isCylinder){
      const rawTheta=surface.xValues?.[columnIndex],theta=Number.isFinite(Number(rawTheta))?Number(rawTheta)*Math.PI/180:columnIndex/(columns-1)*2*Math.PI;
      const rawZ=surface.yValues?.[rowIndex],zNormalized=Number.isFinite(Number(rawZ))?Number(rawZ):rowIndex/(rows-1);
      base=[Math.cos(theta),Math.sin(theta),(zNormalized-.5)*cylinderLength];
      delta=[deformationScale*normalized*Math.cos(theta),deformationScale*normalized*Math.sin(theta),0];
    }else{
      const rawX=surface.xValues?.[columnIndex],rawY=surface.yValues?.[rowIndex],xNormalized=Number.isFinite(Number(rawX))?Number(rawX):columnIndex/(columns-1),yNormalized=Number.isFinite(Number(rawY))?Number(rawY):rowIndex/(rows-1);
      base=[(xNormalized-.5)*plateWidth,(yNormalized-.5)*plateDepth,0];
      delta=[0,0,deformationScale*normalized];
    }
    const projectedBase=projectOblique(base,yaw,pitch),projectedFull=projectOblique(base.map((component,index)=>component+delta[index]),yaw,pitch);
    return {value:normalized,base:projectedBase,delta:{x:projectedFull.x-projectedBase.x,y:projectedFull.y-projectedBase.y,depth:projectedFull.depth-projectedBase.depth}};
  }));
  const candidates=nodes.flatMap(row=>row.flatMap(node=>[
    [node.base.x-node.delta.x,node.base.y-node.delta.y],
    [node.base.x+node.delta.x,node.base.y+node.delta.y]
  ]));
  const xValues=candidates.map(point=>point[0]),yValues=candidates.map(point=>point[1]),xMin=Math.min(...xValues),xMax=Math.max(...xValues),yMin=Math.min(...yValues),yMax=Math.max(...yValues),spanX=Math.max(1e-9,xMax-xMin),spanY=Math.max(1e-9,yMax-yMin),scale=.92*Math.min(availableW/spanX,availableH/spanY),offsetX=margin.left+(availableW-spanX*scale)/2-xMin*scale,offsetY=margin.top+(availableH-spanY*scale)/2-yMin*scale;
  nodes.flat().forEach(node=>{node.screenBase=[offsetX+scale*node.base.x,offsetY+scale*node.base.y];node.screenDelta=[scale*node.delta.x,scale*node.delta.y];});
  const cells=[];
  for(let row=0;row<rows-1;row++)for(let column=0;column<columns-1;column++){
    const corners=[nodes[row][column],nodes[row][column+1],nodes[row+1][column+1],nodes[row+1][column]],value=corners.reduce((sum,node)=>sum+node.value,0)/4,depth=corners.reduce((sum,node)=>sum+node.base.depth,0)/4;
    cells.push({corners,value,depth});
  }
  cells.sort((a,b)=>a.depth-b.depth);
  const linePath=points=>points.map((point,index)=>`${index?'L':'M'}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ');
  const boundaryPaths=[];
  if(isCylinder){
    boundaryPaths.push([...nodes[0].map(node=>node.screenBase),nodes[0][0].screenBase],[...nodes.at(-1).map(node=>node.screenBase),nodes.at(-1)[0].screenBase]);
  }else{
    boundaryPaths.push([nodes[0][0].screenBase,nodes[0].at(-1).screenBase,nodes.at(-1).at(-1).screenBase,nodes.at(-1)[0].screenBase,nodes[0][0].screenBase]);
  }
  const title=surface.title||`${isCylinder?'Cylinder':isBeam?'Beam':'Plate'} 3D mode shape`,magnitude=Math.max(1e-12,...matrix.flat().map(value=>Math.abs(Number(value)||0)));
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"${surface.animation?.type==='harmonic'?' data-surface-animation="harmonic"':''}><rect width="${width}" height="${height}" fill="#fff"/>`;
  svg+=`<text x="${margin.left}" y="25" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="700" fill="#172027">${escapeHtml(title)}</text>`;
  svg+=`<g data-surface-geometry="${geometry}">`;
  boundaryPaths.forEach(path=>{svg+=`<path d="${linePath(path)}" fill="none" stroke="#899296" stroke-width="1.2" stroke-dasharray="5 4" opacity=".72"/>`;});
  cells.forEach(cell=>{
    const base=cell.corners.flatMap(node=>node.screenBase),delta=cell.corners.flatMap(node=>node.screenDelta),points=base.map((coordinate,index)=>coordinate+delta[index]);
    svg+=`<polygon points="${svgPolygonPoints(points)}" fill="${signedHeatColor(cell.value,magnitude)}" stroke="#899296" stroke-width=".55" stroke-opacity=".34" data-surface-base-points="${svgPointList(base)}" data-surface-delta-points="${svgPointList(delta)}" data-surface-base-value="${cell.value}" data-surface-scale="${magnitude}"/>`;
  });
  svg+='</g>';
  const legendX=width-margin.right+24,legendY=margin.top+24,legendHeight=Math.min(250,availableH*.68);
  for(let index=0;index<64;index++){const value=1-2*index/63;svg+=`<rect x="${legendX}" y="${legendY+index*legendHeight/64}" width="13" height="${legendHeight/64+1}" fill="${signedHeatColor(value,1)}"/>`;}
  svg+=`<text x="${legendX+19}" y="${legendY+8}" font-family="ui-monospace,monospace" font-size="9" fill="#667176">+1</text><text x="${legendX+19}" y="${legendY+legendHeight/2+3}" font-family="ui-monospace,monospace" font-size="9" fill="#667176">0</text><text x="${legendX+19}" y="${legendY+legendHeight}" font-family="ui-monospace,monospace" font-size="9" fill="#667176">−1</text>`;
  svg+=`<text x="${legendX-2}" y="${legendY-10}" font-family="ui-sans-serif,system-ui" font-size="9" fill="#5f6b70">Normalized</text><text x="${legendX-2}" y="${legendY+legendHeight+20}" font-family="ui-sans-serif,system-ui" font-size="9" fill="#5f6b70">${escapeHtml(surface.zLabel||'displacement')}</text>`;
  svg+=`<text x="${margin.left}" y="${height-15}" font-family="ui-sans-serif,system-ui" font-size="10" fill="#5f6b70">3D oblique ${geometry} view · deformation exaggerated · signed normalized displacement</text></svg>`;
  return svg;
}

export function heatmapSvg(hm, { width = 720, height = 560 } = {}) {
  const matrix = hm.matrix || [];
  const rows = matrix.length, columns = Math.max(0,...matrix.map(row=>row.length));
  if (!rows || !columns) return '';
  const m = { left: 82, top: 54, right: 72, bottom: 72 };
  const availableW=width-m.left-m.right,availableH=height-m.top-m.bottom;
  const aspect=Math.max(.55,Math.min(2.4,Number(hm.aspectRatio)||columns/rows));
  const plotW=Math.min(availableW,availableH*aspect),plotH=Math.min(availableH,availableW/aspect);
  const cellW=plotW/columns,cellH=plotH/rows;
  const values = matrix.flat().filter(Number.isFinite);
  const min = hm.min ?? Math.min(...values), max = hm.max ?? Math.max(...values);
  const magnitude=Math.max(Math.abs(min),Math.abs(max),1e-12);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(hm.title || 'Heatmap')}"><rect width="${width}" height="${height}" fill="#fff"/>`;
  s += `<text x="${m.left}" y="25" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="700" fill="#172027">${escapeHtml(hm.title || '')}</text>`;
  for (let i=0;i<rows;i++) for (let j=0;j<columns;j++) {
    const value = matrix[i][j];
    if(!Number.isFinite(value)){s+=`<rect x="${m.left+j*cellW}" y="${m.top+i*cellH}" width="${cellW+.2}" height="${cellH+.2}" fill="#d9d4ca" opacity=".18"/>`;continue;}
    const t = max === min ? .5 : (value-min)/(max-min),harmonic=hm.animation?.type==='harmonic',color=hm.diverging?signedHeatColor(value,magnitude):heatColor(t);
    const xValue=hm.xValues?.[j],yValue=hm.yValues?.[i],coordinates=xValue!=null&&yValue!=null?`${formatNumber(xValue)}, ${formatNumber(yValue)}`:`${i+1}, ${j+1}`;
    s += `<rect x="${m.left+j*cellW}" y="${m.top+i*cellH}" width="${cellW+.2}" height="${cellH+.2}" fill="${color}"${harmonic?` data-heatmap-base-value="${value}" data-heatmap-scale="${magnitude}"`:''}><title>${escapeHtml(coordinates)}: ${formatNumber(value)}</title></rect>`;
  }
  const xStep=Math.max(1,Math.ceil(columns/8)),yStep=Math.max(1,Math.ceil(rows/8));
  for(let j=0;j<columns;j+=xStep){
    const label=hm.xLabels?.[j]??hm.labels?.[j]??String(j+1);
    s += `<text x="${m.left+j*cellW+cellW/2}" y="${m.top+plotH+18}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" fill="#667176">${escapeHtml(label)}</text>`;
  }
  for(let i=0;i<rows;i+=yStep){
    const label=hm.yLabels?.[i]??hm.labels?.[i]??String(i+1);
    s += `<text x="${m.left-8}" y="${m.top+i*cellH+cellH/2+3}" text-anchor="end" font-family="ui-monospace,monospace" font-size="9" fill="#667176">${escapeHtml(label)}</text>`;
  }
  if(hm.xLabel)s+=`<text x="${m.left+plotW/2}" y="${height-12}" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(hm.xLabel)}</text>`;
  if(hm.yLabel)s+=`<text x="16" y="${m.top+plotH/2}" text-anchor="middle" transform="rotate(-90 16 ${m.top+plotH/2})" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(hm.yLabel)}</text>`;
  const gx=m.left+plotW+18, gy=m.top, gh=plotH;
  for(let i=0;i<80;i++){const fraction=1-i/79,value=max-(max-min)*(i/79),color=hm.diverging?signedHeatColor(value,magnitude):heatColor(fraction);s+=`<rect x="${gx}" y="${gy+i*gh/80}" width="13" height="${gh/80+1}" fill="${color}"/>`;}
  s += `<text x="${gx+18}" y="${gy+8}" font-family="ui-monospace,monospace" font-size="9" fill="#667176">${formatNumber(max)}</text><text x="${gx+18}" y="${gy+gh}" font-family="ui-monospace,monospace" font-size="9" fill="#667176">${formatNumber(min)}</text></svg>`;
  return s;
}

export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function downloadCsv(csv) {
  if (!csv) return;
  const quote = value => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s;
  };
  const lines = [csv.columns.map(quote).join(','), ...csv.rows.map(row => row.map(quote).join(','))];
  downloadText(csv.filename || 'results.csv', lines.join('\n'), 'text/csv;charset=utf-8');
}

export function downloadSvg(filename, svgText) {
  downloadText(filename, svgText, 'image/svg+xml;charset=utf-8');
}
