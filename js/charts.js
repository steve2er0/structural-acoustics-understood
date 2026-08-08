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

function logTicks(min, max) {
  min = Math.max(min, 1e-300);
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  const ticks = [];
  for (let p = lo; p <= hi; p++) {
    for (const m of [1,2,5]) {
      const v = m * 10 ** p;
      if (v >= min * .999 && v <= max * 1.001) ticks.push({ value: v, major: m === 1 });
    }
  }
  return ticks;
}

function extent(plot, axis) {
  const vals = [];
  for (const t of plot.traces ?? []) {
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
  for(const trace of plot.traces??[]){const itemWidth=Math.max(90,String(trace.name||'Trace').length*6.3+36);if(legendCursor&&legendCursor+itemWidth>legendWidth){legendRows++;legendCursor=0;}legendCursor+=itemWidth;}
  const m = { left: 72, right: 24, top: 55+(legendRows-1)*19, bottom: 60 };
  const innerW = width - m.left - m.right, innerH = height - m.top - m.bottom;
  const [xmin, xmax] = extent(plot, 'x'), [ymin, ymax] = extent(plot, 'y');
  const xLog = plot.xScale === 'log', yLog = plot.yScale === 'log';
  const sx = scaleFn(xmin, xmax, m.left, m.left + innerW, xLog);
  const sy = scaleFn(ymin, ymax, m.top + innerH, m.top, yLog);
  const xTicks = xLog ? logTicks(xmin, xmax) : linearTicks(xmin, xmax).map(value => ({ value, major: true }));
  const yTicks = yLog ? logTicks(ymin, ymax) : linearTicks(ymin, ymax).map(value => ({ value, major: true }));
  const clipId = `clip-${Math.random().toString(36).slice(2)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(plot.title || 'Engineering chart')}">`;
  s += `<rect width="${width}" height="${height}" fill="#fff"/><defs><clipPath id="${clipId}"><rect x="${m.left}" y="${m.top}" width="${innerW}" height="${innerH}"/></clipPath></defs>`;
  s += `<text x="${m.left}" y="22" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="700" fill="#172027">${escapeHtml(plot.title || '')}</text>`;
  for (const t of xTicks) {
    const x = sx(t.value);
    s += `<line x1="${x}" x2="${x}" y1="${m.top}" y2="${m.top + innerH}" stroke="${t.major ? '#d9d4ca' : '#eeeae3'}" stroke-width="${t.major ? 1 : .7}"/>`;
    if (t.major || !xLog) s += `<text x="${x}" y="${m.top + innerH + 20}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="#667176">${escapeHtml(formatNumber(t.value,3))}</text>`;
  }
  for (const t of yTicks) {
    const y = sy(t.value);
    s += `<line x1="${m.left}" x2="${m.left + innerW}" y1="${y}" y2="${y}" stroke="${t.major ? '#d9d4ca' : '#eeeae3'}" stroke-width="${t.major ? 1 : .7}"/>`;
    if (t.major || !yLog) s += `<text x="${m.left - 10}" y="${y + 3}" text-anchor="end" font-family="ui-monospace,monospace" font-size="10" fill="#667176">${escapeHtml(formatNumber(t.value,3))}</text>`;
  }
  s += `<line x1="${m.left}" x2="${m.left+innerW}" y1="${m.top+innerH}" y2="${m.top+innerH}" stroke="#172027"/><line x1="${m.left}" x2="${m.left}" y1="${m.top}" y2="${m.top+innerH}" stroke="#172027"/>`;
  s += `<g clip-path="url(#${clipId})">`;
  (plot.traces ?? []).forEach((t, i) => {
    const color = t.color || palette[i % palette.length];
    const path = pathFromTrace(t, sx, sy, xLog, yLog);
    if (path) s += `<path data-chart-trace="${i}" d="${path}" fill="none" stroke="${color}" stroke-width="${t.emphasis ? 3 : 2}" stroke-linejoin="round" stroke-linecap="round" ${t.dash ? 'stroke-dasharray="7 5"' : ''}/>`;
    const count=Math.min(t.x?.length??0,t.y?.length??0),step=Math.max(1,Math.ceil(count/80));
    for(let point=0;point<count;point+=step){const x=Number(t.x[point]),y=Number(t.y[point]);if(!Number.isFinite(x)||!Number.isFinite(y)||(xLog&&x<=0)||(yLog&&y<=0))continue;s+=`<circle data-chart-trace="${i}" cx="${sx(x).toFixed(2)}" cy="${sy(y).toFixed(2)}" r="5" fill="transparent" stroke="transparent" pointer-events="all"><title>${escapeHtml(t.name||`Trace ${i+1}`)} · ${escapeHtml(plot.xLabel||'x')}: ${escapeHtml(formatNumber(x))} · ${escapeHtml(plot.yLabel||'y')}: ${escapeHtml(formatNumber(y))}</title></circle>`;}
  });
  s += `</g>`;
  s += `<text x="${m.left + innerW/2}" y="${height - 12}" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(plot.xLabel || '')}</text>`;
  s += `<text x="16" y="${m.top + innerH/2}" text-anchor="middle" transform="rotate(-90 16 ${m.top + innerH/2})" font-family="ui-sans-serif,system-ui" font-size="11" fill="#5f6b70">${escapeHtml(plot.yLabel || '')}</text>`;
  let lx = m.left + 8, ly = 42;
  (plot.traces ?? []).forEach((t, i) => {
    const color = t.color || palette[i % palette.length];
    const label = String(t.name || `Trace ${i+1}`);
    const itemW = Math.max(90, label.length * 6.3 + 36);
    if (lx + itemW > m.left + innerW) { lx = m.left + 8; ly += 19; }
    s += `<g data-legend-trace="${i}" role="button" tabindex="0" style="cursor:pointer"><line x1="${lx}" x2="${lx+19}" y1="${ly}" y2="${ly}" stroke="${color}" stroke-width="2.5" ${t.dash ? 'stroke-dasharray="6 4"' : ''}/><text x="${lx+25}" y="${ly+3}" font-family="ui-sans-serif,system-ui" font-size="10" fill="#344047">${escapeHtml(label)}</text><title>Toggle ${escapeHtml(label)}</title></g>`;
    lx += itemW;
  });
  s += `</svg>`;
  return s;
}

function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  const a = [244,242,236], b = [30,96,119];
  const c = a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  return `rgb(${c.join(',')})`;
}

export function heatmapSvg(hm, { width = 720, height = 560 } = {}) {
  const matrix = hm.matrix || [];
  const N = matrix.length;
  if (!N) return '';
  const m = { left: 78, top: 54, right: 42, bottom: 62 };
  const size = Math.min(width - m.left - m.right, height - m.top - m.bottom);
  const cell = size / N;
  const values = matrix.flat().filter(Number.isFinite);
  const min = hm.min ?? Math.min(...values), max = hm.max ?? Math.max(...values);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(hm.title || 'Heatmap')}"><rect width="${width}" height="${height}" fill="#fff"/>`;
  s += `<text x="${m.left}" y="25" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="700" fill="#172027">${escapeHtml(hm.title || '')}</text>`;
  for (let i=0;i<N;i++) for (let j=0;j<N;j++) {
    const value = matrix[i][j];
    const t = max === min ? .5 : (value-min)/(max-min);
    s += `<rect x="${m.left+j*cell}" y="${m.top+i*cell}" width="${cell+.2}" height="${cell+.2}" fill="${heatColor(t)}"><title>${i+1}, ${j+1}: ${formatNumber(value)}</title></rect>`;
  }
  const step = Math.max(1, Math.ceil(N/10));
  for(let i=0;i<N;i+=step){
    const label=hm.labels?.[i] ?? String(i+1);
    s += `<text x="${m.left+i*cell+cell/2}" y="${m.top+size+18}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" fill="#667176">${escapeHtml(label)}</text>`;
    s += `<text x="${m.left-8}" y="${m.top+i*cell+cell/2+3}" text-anchor="end" font-family="ui-monospace,monospace" font-size="9" fill="#667176">${escapeHtml(label)}</text>`;
  }
  const gx=m.left+size+18, gy=m.top, gh=size;
  for(let i=0;i<80;i++)s+=`<rect x="${gx}" y="${gy+i*gh/80}" width="13" height="${gh/80+1}" fill="${heatColor(1-i/79)}"/>`;
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
