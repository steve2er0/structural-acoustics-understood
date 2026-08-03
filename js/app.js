import { sections as baseSections, toolCatalog as baseToolCatalog, demos as baseDemos, caseNotes as baseCaseNotes, referenceGroups as baseReferenceGroups, glossary } from './data.js';
import { calculatorRegistry as baseCalculatorRegistry } from './calculators.js';
import { extraCalculatorRegistry } from './extra-calculators.js';
import { extraToolCatalog } from './extra-data.js';
import { acs519CalculatorRegistry } from './acs519-calculators.js';
import { acs519Sections, acs519ToolCatalog, acs519Demos, acs519CaseNotes, acs519ReferenceGroups } from './acs519-data.js';
import { workflowExpansionCalculatorRegistry } from './workflow-expansion-calculators.js';
import { workflowExpansionSections, workflowExpansionToolCatalog, workflowExpansionDemos, workflowExpansionCaseNotes, workflowExpansionReferenceGroups } from './workflow-expansion-data.js';
import { programExpansionCalculatorRegistry } from './program-expansion-calculators.js';
import { programExpansionSections, programExpansionToolCatalog, programExpansionDemos, programExpansionCaseNotes, programExpansionReferenceGroups } from './program-expansion-data.js';
import { lineChartSvg, heatmapSvg, downloadCsv, downloadSvg, downloadText } from './charts.js';
import { demoPreviewSvg, mountDemo } from './demos.js';
import { engineeringResultToText } from './engineering-results.js';

const sections = [...baseSections, ...acs519Sections, ...workflowExpansionSections, ...programExpansionSections];
const calculatorRegistry = { ...baseCalculatorRegistry, ...extraCalculatorRegistry, ...acs519CalculatorRegistry, ...workflowExpansionCalculatorRegistry, ...programExpansionCalculatorRegistry };
const toolCatalog = [...baseToolCatalog, ...extraToolCatalog, ...acs519ToolCatalog, ...workflowExpansionToolCatalog, ...programExpansionToolCatalog];
const demos = [...baseDemos, ...acs519Demos, ...workflowExpansionDemos, ...programExpansionDemos];
const caseNotes = [...baseCaseNotes, ...acs519CaseNotes, ...workflowExpansionCaseNotes, ...programExpansionCaseNotes];
const referenceGroups = [...baseReferenceGroups, ...acs519ReferenceGroups, ...workflowExpansionReferenceGroups, ...programExpansionReferenceGroups];
const toolById = new Map(toolCatalog.map(t => [t.id, t]));
const app = document.querySelector('#app');
let routeCleanup = () => {};
let toastTimer = 0;

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const stripHtml = html => { const d=document.createElement('div'); d.innerHTML=html ?? ''; return d.textContent ?? ''; };
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function formatNumber(value, digits = 4) {
  if (typeof value === 'string') return value;
  const x = Number(value);
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e6 || a < 1e-4) return x.toExponential(3);
  if (a >= 10000) return x.toLocaleString(undefined,{maximumFractionDigits:1});
  if (a >= 100) return x.toFixed(1);
  if (a >= 10) return x.toFixed(2);
  if (a >= 1) return x.toFixed(3);
  return x.toPrecision(digits);
}
function showToast(message) {
  const el=document.querySelector('.toast'); if(!el)return;
  el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}
function icon(name) {
  if(name==='search')return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>';
  if(name==='print')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3"/><path d="M7 14h10v7H7z"/></svg>';
  return '';
}
function brandMark(){return `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M8 27c6-13 12-13 18 0s11 13 14 1"/><path d="M8 19c6 8 12 8 18 0s10-8 14-1"/></svg>`;}
function routeInfo(){
  const raw=(location.hash.slice(1)||'/cheat-sheet');
  const [pathPart, queryString='']=raw.split('?');
  const path=pathPart.startsWith('/')?pathPart:`/${pathPart}`;
  return { path, segments:path.split('/').filter(Boolean), params:new URLSearchParams(queryString), raw };
}
function navKey(route){
  const first=route.segments[0]||'cheat-sheet';
  if(first==='case-note')return 'case-notes';
  if(first==='tool')return 'tools';
  if(first==='demo')return 'demos';
  return first;
}
function shell(main, route) {
  const active=navKey(route);
  const nav=[['cheat-sheet','Cheat Sheet'],['tools','Tools'],['demos','Demos'],['case-notes','Case Notes'],['references','References']];
  return `<header class="site-header">
    <a class="brand" href="#/cheat-sheet">${brandMark()}<span class="brand-copy"><strong>Structural Acoustics, Understood</strong><small>Vibration · Shock · Acoustics · Coupled Response</small></span></a>
    <nav class="primary-nav" aria-label="Primary">${nav.map(([id,label])=>`<a href="#/${id}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav>
    <div class="header-actions"><button class="icon-button" data-action="search" aria-label="Search">${icon('search')}</button><button class="icon-button" data-action="print" aria-label="Print current page">${icon('print')}</button><button class="menu-button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button></div>
  </header>
  <main id="main-content">${main}</main>
  <footer class="site-footer"><div><strong>Structural Acoustics, Understood</strong><p>Original engineering reference and browser-based screening tools. Verify controlled methods before design or qualification use.</p></div><div class="footer-links"><a href="#/references">Assumptions & references</a><a href="#/tools">${toolCatalog.length} tools</a><a href="#/demos">${demos.length} demos</a><button class="link-button" data-action="print">Print / PDF</button></div></footer>
  ${searchDialog()}<div class="toast" role="status" aria-live="polite"></div>`;
}
function searchDialog(){return `<dialog class="search-dialog"><div class="search-shell"><div class="search-input-wrap">${icon('search')}<input id="global-search" type="search" placeholder="Search coincidence, ring frequency, PSD, Corcos…" autocomplete="off" aria-label="Search engineering reference"/><button class="kbd-button" data-action="close-search">Esc</button></div><div class="search-results" id="search-results"></div></div></dialog>`;}
function intro({eyebrow,title,lede,aside='',metrics=[],buttons=[]}){
  return `<section class="page-intro"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="lede">${lede}</p>${buttons.length?`<div class="button-row">${buttons.map(b=>`<${b.href?'a':'button'} class="${b.secondary?'button-secondary':'button'}" ${b.href?`href="${b.href}"`:`data-action="${b.action}"`}>${b.label}</${b.href?'a':'button'}>`).join('')}</div>`:''}</div><aside class="intro-aside">${aside}${metrics.length?`<div class="intro-metrics">${metrics.map(m=>`<div class="metric"><strong>${esc(m.value)}</strong><span>${esc(m.label)}</span></div>`).join('')}</div>`:''}</aside></section>`;
}

function renderCheat(route){
  const rail=sections.map(s=>`<a href="#/cheat-sheet?section=${encodeURIComponent(s.id)}" data-section-link="${esc(s.id)}"><span>${esc(s.number)}</span>${esc(s.title)}</a>`).join('');
  const content=sections.map(section=>`<section class="cheat-section" id="section-${esc(section.id)}" data-section="${esc(section.id)}"><header class="section-heading"><span class="section-number">${esc(section.number)}</span><div><p class="eyebrow">${esc(section.eyebrow)}</p><h2>${esc(section.title)}</h2><p>${esc(section.summary)}</p>${section.deepDiveId?`<a class="concept-tool-link" href="#/case-note/${encodeURIComponent(section.deepDiveId)}">Read the complete launch-vehicle deep dive →</a>`:''}</div></header><div class="concept-grid">${section.concepts.map(c=>`<article class="concept-card" id="concept-${slug(c.title)}"><h3>${esc(c.title)}</h3>${c.equation?`<div class="equation">${c.equation}</div>`:''}<p>${esc(c.body)}</p>${c.interpretation?`<p><strong>Physical interpretation.</strong> ${esc(c.interpretation)}</p>`:''}${c.mistake?`<div class="mini-callout"><strong>Common mistake:</strong> ${esc(c.mistake)}</div>`:''}<div class="card-meta">${(c.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${c.toolId&&toolById.has(c.toolId)?`<a class="concept-tool-link" href="#/tool/${encodeURIComponent(c.toolId)}">Open ${esc(toolById.get(c.toolId).title)} →</a>`:''}</article>`).join('')}</div></section>`).join('');
  return `<div class="page-shell">${intro({eyebrow:'The working reference',title:'Equations beside tools.<br>Physics beside assumptions.',lede:'A dense, continuously linked reference for structural dynamics, random vibration, shock, acoustics, shells, distributed loads, SEA, and measurement.',aside:'<p>Use the numbered chapters as a desk reference. Every calculation is explicit about its model, units, validity, and likely failure modes.</p>',metrics:[{value:sections.length,label:'chapters'},{value:toolCatalog.length,label:'calculators'},{value:demos.length,label:'interactive demos'}],buttons:[{label:'Browse all tools',href:'#/tools'},{label:'Print cheat sheet',action:'print',secondary:true}]})}<div class="cheat-layout"><aside class="section-rail" aria-label="Cheat-sheet chapters"><p class="rail-title">On this page</p>${rail}</aside><div class="cheat-content">${content}</div></div></div>`;
}
function toolCard(t,index){return `<a class="tool-card" href="#/tool/${encodeURIComponent(t.id)}" data-category="${esc(t.category)}" data-search="${esc(`${t.title} ${t.description} ${(t.keywords||[]).join(' ')}`.toLowerCase())}"><span class="tool-index">${String(index+1).padStart(2,'0')}</span><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><footer><span>${esc(t.category)} · ${esc(t.complexity)}</span><span class="arrow">→</span></footer></a>`;}
function renderTools(){
  const categories=['All',...new Set(toolCatalog.map(t=>t.category))];
  return `<div class="page-shell">${intro({eyebrow:'Engineering calculators',title:'Tools for the work,<br>not just the lesson.',lede:'Each tool carries its equations, assumptions, worked example, numerical result, plots, tables, and exportable data.',aside:'<p>Calculations run locally in the browser. Imported engineering data is not uploaded by this static application.</p>',metrics:[{value:toolCatalog.length,label:'tools'},{value:categories.length-1,label:'disciplines'},{value:'Local',label:'data processing'}],buttons:[{label:'Open cheat sheet',href:'#/cheat-sheet'},{label:'Search tools',action:'search',secondary:true}]})}<div class="filter-bar" aria-label="Tool filters">${categories.map((c,i)=>`<button class="filter-chip ${i===0?'active':''}" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}<label class="tool-filter-search"><span class="sr-only">Filter tools</span><input id="tool-filter-search" type="search" placeholder="Filter this library…"/></label><span id="tool-count" class="filter-count">${toolCatalog.length} shown</span></div><div class="tool-grid">${toolCatalog.map(toolCard).join('')}</div></div>`;
}
function fieldHtml(field,value){
  const key=esc(field.key),label=`<label for="field-${key}">${esc(field.label)}${field.unit?`<span>${esc(field.unit)}</span>`:''}</label>`;
  let control='';
  if(field.type==='select')control=`<select id="field-${key}" data-key="${key}">${(field.options||[]).map(o=>{const opt=Array.isArray(o)?{value:o[0],label:o[1]}:o;return `<option value="${esc(opt.value)}" ${String(opt.value)===String(value)?'selected':''}>${esc(opt.label)}</option>`;}).join('')}</select>`;
  else if(field.type==='textarea')control=`<textarea id="field-${key}" data-key="${key}" spellcheck="false">${esc(value)}</textarea><div class="field-file-row"><button type="button" class="button-quiet file-load" data-target="field-${key}">Load CSV / text</button><input class="file-input" type="file" accept=".csv,.txt,text/csv,text/plain" data-target="field-${key}" hidden/></div>`;
  else if(field.type==='range')control=`<input id="field-${key}" data-key="${key}" type="range" value="${esc(value)}" ${field.min!=null?`min="${field.min}"`:''} ${field.max!=null?`max="${field.max}"`:''} ${field.step!=null?`step="${field.step}"`:''}/>`;
  else control=`<input id="field-${key}" data-key="${key}" type="${field.type==='text'?'text':'number'}" value="${esc(value)}" ${field.min!=null?`min="${field.min}"`:''} ${field.max!=null?`max="${field.max}"`:''} ${field.step!=null?`step="${field.step}"`:'step="any"'}/>`;
  return `<div class="field-group">${label}${control}${field.help?`<div class="field-help">${esc(field.help)}</div>`:''}</div>`;
}
function relevantReferences(category){
  const map={Acoustics:'Acoustics and noise control',Dynamics:'Structural dynamics','Random & Shock':'Random vibration and shock',Structures:'Structures and waves','Structural Acoustics':'Structural acoustics','Aero / Distributed Loads':'Aeroacoustics and distributed loading','SEA & Energy':'Statistical energy analysis','Test & Signal':'Measurement and signal processing','Noise Control':'Acoustics and noise control'};
  const wanted=map[category];
  return referenceGroups.find(g=>g.group===wanted)?.items ?? referenceGroups.flatMap(g=>g.items).slice(0,4);
}
function renderTool(route){
  const id=decodeURIComponent(route.segments[1]||''); const meta=toolById.get(id),calc=calculatorRegistry[id];
  if(!meta||!calc)return renderNotFound('Calculator not found','The requested tool is not in this build.');
  const values={};for(const field of calc.inputs||[])values[field.key]=route.params.has(field.key)?route.params.get(field.key):field.default;
  const refs=relevantReferences(meta.category);
  return `<div class="page-shell"><div class="breadcrumbs"><a href="#/tools">Tools</a><span>›</span><span>${esc(meta.category)}</span><span>›</span><span>${esc(meta.title)}</span></div><section class="tool-hero"><div class="tool-hero-copy"><p class="eyebrow">${esc(meta.category)} · ${esc(meta.complexity)}</p><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p></div><aside class="tool-status"><dl><dt>Basis</dt><dd>${esc(calc.basis||'Documented engineering relation')}</dd><dt>Result</dt><dd>${esc(calc.confidence||'Screening calculation')}</dd><dt>Execution</dt><dd>Local browser</dd><dt>Route</dt><dd><code>${esc(id)}</code></dd></dl></aside></section><div class="calculator-layout"><section class="calc-panel"><header class="calc-panel-header"><h2>Inputs</h2><button class="button-quiet" data-action="reset-calculator">Reset</button></header><form class="calc-form" id="calculator-form">${(calc.inputs||[]).map(f=>fieldHtml(f,values[f.key])).join('')}<div class="calc-form-actions"><button class="button" type="submit">Calculate</button><button class="button-secondary" type="button" data-action="share-calculation">Copy share link</button></div></form></section><section class="calc-panel"><header class="calc-panel-header"><h2>Results</h2><div><button class="button-quiet" data-action="copy-results">Copy engineering result</button><button class="button-quiet" data-action="print">Print / PDF</button></div></header><div class="calc-results" id="calculator-results"><div class="calc-empty">Enter values and calculate.</div></div></section></div><section class="tabs"><div class="tab-list" role="tablist"><button class="tab-button active" data-tab="theory" role="tab">Theory</button><button class="tab-button" data-tab="example" role="tab">Worked example</button><button class="tab-button" data-tab="assumptions" role="tab">Assumptions</button><button class="tab-button" data-tab="references" role="tab">References</button></div><div class="tab-panel" id="tab-panel"><h2>Governing model</h2>${calc.theory||'<p>This calculator implements the documented governing relationship shown in the cheat sheet.</p>'}<h3>Inputs and units</h3><div class="variable-table">${(calc.inputs||[]).map(f=>`<div>${esc(f.key)}</div><div>${esc(f.label)}${f.unit?` · ${esc(f.unit)}`:''}</div>`).join('')}</div></div><template id="tab-theory"><h2>Governing model</h2>${calc.theory||''}<h3>Inputs and units</h3><div class="variable-table">${(calc.inputs||[]).map(f=>`<div>${esc(f.key)}</div><div>${esc(f.label)}${f.unit?` · ${esc(f.unit)}`:''}</div>`).join('')}</div></template><template id="tab-example"><h2>Worked example</h2><p>${esc(calc.example||'Load the defaults and compare the reported primary result with a hand calculation using the governing equation.')}</p><p><a class="concept-tool-link" href="#/cheat-sheet">Open the linked cheat-sheet context →</a></p></template><template id="tab-assumptions"><h2>Assumptions and validity</h2><ul>${(calc.assumptions||['Linear response and consistent units.']).map(a=>`<li>${esc(a)}</li>`).join('')}</ul><div class="mini-callout"><strong>Use rule:</strong> a polished numerical result does not expand the validity of its governing model.</div></template><template id="tab-references"><h2>References for this topic</h2><ul class="reference-list">${refs.map(r=>`<li><strong>${esc(r.title)}</strong><span>${esc(r.note)}</span></li>`).join('')}</ul><p>Also verify the controlled analysis method, handbook revision, material data, and program-specific statistical convention used by the actual deliverable.</p></template></section></div>`;
}
function renderDemos(){return `<div class="page-shell">${intro({eyebrow:'Interactive physics',title:'Move the variables.<br>Watch the model answer.',lede:'Compact demonstrations expose the physical behavior behind the equations: resonance, damping, coupled modes, beam waves, dispersion, coincidence, radiation, shell curvature, response spectra, spatial coherence, and energy flow.',aside:'<p>These are visual thought experiments. The paired calculators provide the numerical result, tables, and exports.</p>',metrics:[{value:demos.length,label:'demos'},{value:'Canvas / SVG',label:'original graphics'},{value:'Live',label:'parameter response'}]})}<div class="demo-grid">${demos.map(d=>`<a class="demo-card" href="#/demo/${encodeURIComponent(d.id)}"><div class="demo-preview">${demoPreviewSvg(d.id)}</div><div class="demo-card-copy"><p class="eyebrow">${esc(d.topic)}</p><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p><span class="concept-tool-link">Open demo →</span></div></a>`).join('')}</div></div>`;}
function renderDemo(route){const id=decodeURIComponent(route.segments[1]||''),d=demos.find(x=>x.id===id);if(!d)return renderNotFound('Demo not found','The requested interactive demonstration is not in this build.');return `<div class="page-shell"><div class="breadcrumbs"><a href="#/demos">Demos</a><span>›</span><span>${esc(d.topic)}</span><span>›</span><span>${esc(d.title)}</span></div><section class="tool-hero"><div class="tool-hero-copy"><p class="eyebrow">${esc(d.topic)} · Interactive demonstration</p><h1>${esc(d.title)}</h1><p>${esc(d.description)}</p><div class="button-row"><a class="button" href="#/tool/${encodeURIComponent(d.toolId)}">Open paired calculator</a><a class="button-secondary" href="#/demos">All demos</a></div></div><aside class="tool-status"><dl><dt>Purpose</dt><dd>Physical intuition</dd><dt>Rendering</dt><dd>Live canvas / SVG</dd><dt>Data</dt><dd>No upload</dd></dl></aside></section><section class="demo-stage" id="demo-mount"></section></div>`;}
function renderCaseNotes(){return `<div class="page-shell">${intro({eyebrow:'Applied engineering notes',title:'Where the equation<br>meets the messy system.',lede:'Short case notes on the mistakes, judgment calls, and cross-checks that matter in real structural-acoustic analysis.',aside:'<p>The notes connect measurement, numerical methods, statistics, and interpretation—especially where one convenient shortcut can become a bad conclusion.</p>',metrics:[{value:caseNotes.length,label:'case notes'},{value:'Applied',label:'engineering depth'},{value:'Linked',label:'to tools'}]})}<div class="case-grid">${caseNotes.map(c=>`<a class="case-card" href="#/case-note/${encodeURIComponent(c.id)}"><span class="case-number">CASE ${esc(c.number)}</span><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p><div class="card-meta">${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><footer>${esc(c.readTime)} read →</footer></a>`).join('')}</div></div>`;}
function renderCaseNote(route){const id=decodeURIComponent(route.segments[1]||''),c=caseNotes.find(x=>x.id===id);if(!c)return renderNotFound('Case note not found','The requested engineering note is not in this build.');return `<div class="page-shell"><article class="article-shell"><div class="breadcrumbs"><a href="#/case-notes">Case Notes</a><span>›</span><span>Case ${esc(c.number)}</span></div><header class="article-header"><p class="eyebrow">Applied engineering · Case ${esc(c.number)}</p><h1>${esc(c.title)}</h1><p class="lede">${esc(c.summary)}</p><div class="article-meta"><span>${esc(c.readTime)} read</span>${c.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></header><div class="article-body">${c.body}</div></article></div>`;}
function renderReferences(){return `<div class="page-shell">${intro({eyebrow:'Methodology and source trail',title:'Know what the model<br>assumes before trusting it.',lede:'References, nomenclature, unit conventions, verification principles, and calculator limitations are part of the product—not footnotes hidden after the answer.',aside:'<p>Representative material properties and compact formulas are for screening. Production work must use controlled methods and traceable inputs.</p>',metrics:[{value:referenceGroups.length,label:'reference groups'},{value:glossary.length,label:'defined terms'},{value:'Explicit',label:'validity labels'}],buttons:[{label:'Open tool library',href:'#/tools'},{label:'Print this page',action:'print',secondary:true}]})}<div class="reference-layout"><nav class="reference-nav" aria-label="Reference sections"><a href="#reference-method">Methodology</a>${referenceGroups.map(g=>`<a href="#reference-${slug(g.group)}">${esc(g.group)}</a>`).join('')}<a href="#reference-glossary">Glossary</a></nav><div><section class="reference-section" id="reference-method"><h2>Methodology and verification</h2><p>Every calculator separates a governing model from its interface. Inputs are normalized to coherent units, invalid domains are rejected, limiting cases are checked, and outputs identify whether they are exact within the model, numerical, empirical, or screening-level.</p><ul><li>Match response quantity, units, frequency range, duration, and statistical basis before combining environments.</li><li>Use complex cross terms when sources are correlated.</li><li>Run convergence checks for FFT, SRS, VRS, FDS, modal truncation, and spatial-pattern truncation.</li><li>Check thin-structure, plane-wave, diffuse-field, weak-coupling, and high-modal-overlap assumptions rather than applying them by habit.</li><li>Verify material data at the applicable temperature, orientation, fabrication state, and uncertainty basis.</li></ul><div class="mini-callout"><strong>Scope:</strong> this site is an analysis companion and calculation record—not an authority for qualification limits, certification, or program-controlled design allowables.</div></section>${referenceGroups.map(g=>`<section class="reference-section" id="reference-${slug(g.group)}"><h2>${esc(g.group)}</h2><ul class="reference-list">${g.items.map(r=>`<li><strong>${esc(r.title)}</strong><span>${esc(r.note)}</span></li>`).join('')}</ul></section>`).join('')}<section class="reference-section" id="reference-glossary"><h2>Glossary</h2><dl class="glossary-grid">${glossary.map(([term,def])=>`<div class="glossary-item"><dt>${esc(term)}</dt><dd>${esc(def)}</dd></div>`).join('')}</dl></section></div></div></div>`;}
function renderNotFound(title='Page not found',text='That route does not exist.'){return `<div class="page-shell"><div class="not-found"><div><p class="eyebrow">404</p><h1>${esc(title)}</h1><p class="lede">${esc(text)}</p><div class="button-row"><a class="button" href="#/cheat-sheet">Open cheat sheet</a><a class="button-secondary" href="#/tools">Browse tools</a></div></div></div></div>`;}

function collectForm(form){const values={};form.querySelectorAll('[data-key]').forEach(el=>values[el.dataset.key]=el.value);return values;}
function renderTable(table){return `<div class="result-block"><h3>${esc(table.title||'Results table')}</h3><div class="table-wrap"><table><thead><tr>${(table.columns||[]).map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(table.rows||[]).map(row=>`<tr>${row.map((v,i)=>`<td>${i===0&&typeof v==='string'?esc(v):esc(formatNumber(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;}
function renderResult(result){
  const values=result.values.map(s=>`<div class="result-stat ${esc(s.tone||s.status||'')}"><small>${esc(s.label)}</small><strong>${esc(formatNumber(s.value))}</strong>${s.unit?`<span class="unit">${esc(s.unit)}</span>`:''}${s.note?`<div class="field-help">${esc(s.note)}</div>`:''}</div>`).join('');
  const assumptions=result.assumptions.satisfied.map(item=>`<li>${esc(item)}</li>`).join('');
  const warnings=result.assumptions.warnings.map(item=>`<li>${esc(item)}</li>`).join('');
  const considerations=result.interpretation.engineeringConsiderations.map(item=>`<li>${esc(item)}</li>`).join('');
  const concepts=result.relatedConcepts.map(item=>`<a class="related-concept" href="${esc(item.href)}"><strong>${esc(item.title)}</strong><span>${esc(item.description)}</span></a>`).join('');
  const commentary=`<section class="engineering-commentary" aria-label="Engineering commentary"><article class="commentary-lead"><p class="commentary-label">Engineering interpretation</p><p>${esc(result.interpretation.summary)}</p><h3>Physical meaning</h3><p>${esc(result.interpretation.physicalMeaning)}</p></article><div class="commentary-grid"><article class="commentary-card validity-card"><h3>Validity checks</h3><dl><div><dt>Regime</dt><dd>${esc(result.validity.regime)}</dd></div><div><dt>Confidence</dt><dd>${esc(result.validity.confidence)}</dd></div></dl></article><article class="commentary-card"><h3>Model assumptions</h3><p class="commentary-note">The calculation treats these conditions as satisfied. Confirm them against the real system.</p><ul class="commentary-list assumption-list">${assumptions}</ul>${warnings?`<h4>Active warnings</h4><ul class="warning-list">${warnings}</ul>`:''}</article><article class="commentary-card"><h3>Engineering considerations</h3><ul class="commentary-list">${considerations}</ul></article><article class="commentary-card"><h3>Related concepts</h3><div class="related-concepts">${concepts}</div></article></div></section>`;
  const plots=(result.plots||[]).map((p,i)=>{const svg=lineChartSvg(p);return `<div class="result-block"><div class="chart-toolbar"><button data-chart-svg="${i}">Download SVG</button><button data-chart-png="${i}">Download PNG</button></div><div class="chart-shell" data-chart="${i}">${svg}</div></div>`;}).join('');
  const heatmaps=(result.heatmaps||[]).map((h,i)=>`<div class="result-block"><div class="chart-toolbar"><button data-heatmap-svg="${i}">Download SVG</button><button data-heatmap-png="${i}">Download PNG</button></div><div class="chart-shell" data-heatmap="${i}">${heatmapSvg(h)}</div></div>`).join('');
  const csv=result.csv?`<div class="result-block"><button class="button-secondary" data-action="download-csv">Download result CSV</button></div>`:'';
  return `<h3 class="result-section-title">Numerical results</h3><div class="result-summary">${values}</div>${commentary}${plots}${heatmaps}${(result.tables||[]).map(renderTable).join('')}${csv}`;
}
function svgToPng(svgText,filename){
  const blob=new Blob([svgText],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const vb=img.width&&img.height?[img.width,img.height]:[1200,700],canvas=document.createElement('canvas');canvas.width=Math.max(1200,vb[0]);canvas.height=Math.round(canvas.width*vb[1]/vb[0]);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(p=>{const a=document.createElement('a');a.href=URL.createObjectURL(p);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);},'image/png');URL.revokeObjectURL(url);};img.src=url;
}
function bindTool(route){
  const id=decodeURIComponent(route.segments[1]||''),meta=toolById.get(id),calc=calculatorRegistry[id],form=document.querySelector('#calculator-form'),resultsEl=document.querySelector('#calculator-results');if(!form||!calc)return;
  let latest=null;
  const run=()=>{try{latest=calc.compute(collectForm(form));resultsEl.innerHTML=renderResult(latest);bindResultActions(latest,meta);}catch(err){latest=null;resultsEl.innerHTML=`<div class="calc-error"><strong>Calculation could not be completed.</strong><br>${esc(err.message||String(err))}</div>`;}};
  form.addEventListener('submit',e=>{e.preventDefault();run();});
  let timer;form.addEventListener('input',e=>{if(e.target.matches('textarea'))return;clearTimeout(timer);timer=setTimeout(run,120);});
  document.querySelector('[data-action="reset-calculator"]')?.addEventListener('click',()=>{for(const f of calc.inputs||[]){const el=form.querySelector(`[data-key="${CSS.escape(f.key)}"]`);if(el)el.value=f.default??'';}run();});
  document.querySelector('[data-action="share-calculation"]')?.addEventListener('click',async()=>{const values=collectForm(form),params=new URLSearchParams();for(const f of calc.inputs||[]){const value=String(values[f.key]??'');if(value===String(f.default??''))continue;if(f.type==='textarea'&&value.length>800)continue;params.set(f.key,value);}const url=`${location.origin}${location.pathname}#/tool/${encodeURIComponent(id)}${params.size?`?${params}`:''}`;try{await navigator.clipboard.writeText(url);showToast(params.size?'Share link copied':'Link copied; large pasted data remains local');}catch{prompt('Copy this link',url);}});
  document.querySelector('[data-action="copy-results"]')?.addEventListener('click',async()=>{if(!latest){showToast('Calculate first');return;}const text=engineeringResultToText(meta.title,latest,formatNumber);try{await navigator.clipboard.writeText(text);showToast('Engineering result copied');}catch{prompt('Copy engineering result',text);}});
  document.querySelectorAll('.file-load').forEach(btn=>btn.addEventListener('click',()=>document.querySelector(`.file-input[data-target="${CSS.escape(btn.dataset.target)}"]`)?.click()));
  document.querySelectorAll('.file-input').forEach(input=>input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;const text=await file.text(),target=document.getElementById(input.dataset.target);if(target){target.value=text;run();showToast(`${file.name} loaded locally`);}}));
  document.querySelectorAll('.tab-button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab-button').forEach(b=>b.classList.toggle('active',b===btn));const tpl=document.querySelector(`#tab-${CSS.escape(btn.dataset.tab)}`);document.querySelector('#tab-panel').innerHTML=tpl?.innerHTML||'';}));
  run();
}
function bindResultActions(result,meta){
  document.querySelector('[data-action="download-csv"]')?.addEventListener('click',()=>downloadCsv(result.csv));
  (result.plots||[]).forEach((p,i)=>{const svg=lineChartSvg(p);document.querySelector(`[data-chart-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-${i+1}.svg`,svg));document.querySelector(`[data-chart-png="${i}"]`)?.addEventListener('click',()=>svgToPng(svg,`${slug(meta.title)}-${i+1}.png`));});
  (result.heatmaps||[]).forEach((h,i)=>{const svg=heatmapSvg(h);document.querySelector(`[data-heatmap-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-heatmap-${i+1}.svg`,svg));document.querySelector(`[data-heatmap-png="${i}"]`)?.addEventListener('click',()=>svgToPng(svg,`${slug(meta.title)}-heatmap-${i+1}.png`));});
}

const searchItems=(()=>{
  const out=[];
  toolCatalog.forEach(t=>out.push({type:'Tool',title:t.title,description:t.description,href:`#/tool/${t.id}`,text:`${t.title} ${t.description} ${t.category} ${(t.keywords||[]).join(' ')}`}));
  sections.forEach(s=>{out.push({type:'Chapter',title:s.title,description:s.summary,href:`#/cheat-sheet?section=${s.id}`,text:`${s.title} ${s.summary} ${s.eyebrow}`});s.concepts.forEach(c=>out.push({type:'Cheat sheet',title:c.title,description:c.body,href:`#/cheat-sheet?section=${s.id}`,text:`${c.title} ${c.body} ${c.interpretation||''} ${c.mistake||''} ${(c.tags||[]).join(' ')}`}));});
  demos.forEach(d=>out.push({type:'Demo',title:d.title,description:d.description,href:`#/demo/${d.id}`,text:`${d.title} ${d.description} ${d.topic}`}));
  caseNotes.forEach(c=>out.push({type:'Case note',title:c.title,description:c.summary,href:`#/case-note/${c.id}`,text:`${c.title} ${c.summary} ${stripHtml(c.body)} ${c.tags.join(' ')}`}));
  glossary.forEach(([term,def])=>out.push({type:'Glossary',title:term,description:def,href:'#/references',text:`${term} ${def}`}));
  return out.map(x=>({...x,normalized:x.text.toLowerCase()}));
})();
function search(q){const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);if(!terms.length)return toolCatalog.slice(0,8).map(t=>searchItems.find(x=>x.type==='Tool'&&x.title===t.title));return searchItems.map(item=>{let score=0;for(const term of terms){if(item.title.toLowerCase()===term)score+=20;if(item.title.toLowerCase().includes(term))score+=8;if(item.normalized.includes(term))score+=2;else score-=20;}return{item,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title)).slice(0,14).map(x=>x.item);}
function renderSearchResults(q){const el=document.querySelector('#search-results');if(!el)return;const items=search(q);el.innerHTML=items.length?items.map(x=>`<a class="search-result" href="${x.href}"><span class="search-result-type">${esc(x.type)}</span><span><strong>${esc(x.title)}</strong><p>${esc(x.description).slice(0,180)}</p></span></a>`).join(''):`<div class="search-empty">No matching equation, tool, demo, case note, or glossary term.</div>`;el.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.search-dialog')?.close()));}
function openSearch(){const dialog=document.querySelector('.search-dialog');if(!dialog)return;if(!dialog.open)dialog.showModal();const input=dialog.querySelector('#global-search');input.value='';renderSearchResults('');setTimeout(()=>input.focus(),0);}
function bindEmbeddedDemos(){
  const mounts=[...document.querySelectorAll('[data-embedded-demo]')];
  if(!mounts.length)return;
  const cleanups=mounts.map(mount=>mountDemo(mount,mount.dataset.embeddedDemo));
  const old=routeCleanup;
  routeCleanup=()=>{old();cleanups.forEach(cleanup=>cleanup?.());};
}
function bindGlobal(route){
  document.querySelector('.menu-button')?.addEventListener('click',e=>{const nav=document.querySelector('.primary-nav'),open=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',open);});
  document.querySelectorAll('[data-action="search"]').forEach(b=>b.addEventListener('click',openSearch));
  document.querySelectorAll('[data-action="print"]').forEach(b=>b.addEventListener('click',()=>window.print()));
  document.querySelector('[data-action="close-search"]')?.addEventListener('click',()=>document.querySelector('.search-dialog')?.close());
  const searchInput=document.querySelector('#global-search');searchInput?.addEventListener('input',()=>renderSearchResults(searchInput.value));
  document.querySelector('.search-dialog')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.close();});
  if(navKey(route)==='tools'&&route.segments[0]==='tools')bindToolFilters();
  if(route.segments[0]==='tool')bindTool(route);
  if(route.segments[0]==='demo'){const mount=document.querySelector('#demo-mount');if(mount)routeCleanup=mountDemo(mount,decodeURIComponent(route.segments[1]||''));}
  if(route.segments[0]==='case-note')bindEmbeddedDemos();
  if(route.segments[0]==='cheat-sheet'||!route.segments.length)bindCheat(route);
}
function bindToolFilters(){const chips=[...document.querySelectorAll('.filter-chip')],cards=[...document.querySelectorAll('.tool-card')],input=document.querySelector('#tool-filter-search'),count=document.querySelector('#tool-count');let category='All';const update=()=>{const q=(input?.value||'').trim().toLowerCase();let shown=0;cards.forEach(card=>{const visible=(category==='All'||card.dataset.category===category)&&(!q||card.dataset.search.includes(q));card.hidden=!visible;if(visible)shown++;});count.textContent=`${shown} shown`;};chips.forEach(chip=>chip.addEventListener('click',()=>{category=chip.dataset.filter;chips.forEach(c=>c.classList.toggle('active',c===chip));update();}));input?.addEventListener('input',update);}
function bindCheat(route){
  const links=[...document.querySelectorAll('[data-section-link]')],sectionsEls=[...document.querySelectorAll('[data-section]')];
  if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!visible)return;links.forEach(l=>l.classList.toggle('active',l.dataset.sectionLink===visible.target.dataset.section));},{rootMargin:'-20% 0px -68% 0px',threshold:[0,.1]});sectionsEls.forEach(s=>io.observe(s));const old=routeCleanup;routeCleanup=()=>{old();io.disconnect();};}
  const target=route.params.get('section');if(target)setTimeout(()=>document.querySelector(`#section-${CSS.escape(target)}`)?.scrollIntoView({block:'start'}),40);
}
function render(){
  routeCleanup();routeCleanup=()=>{};const route=routeInfo();let main;
  const [first]=route.segments;
  if(!first||first==='cheat-sheet')main=renderCheat(route);
  else if(first==='tools')main=renderTools();
  else if(first==='tool')main=renderTool(route);
  else if(first==='demos')main=renderDemos();
  else if(first==='demo')main=renderDemo(route);
  else if(first==='case-notes')main=renderCaseNotes();
  else if(first==='case-note')main=renderCaseNote(route);
  else if(first==='references')main=renderReferences();
  else main=renderNotFound();
  app.innerHTML=shell(main,route);bindGlobal(route);
  const retainScroll=(first==='cheat-sheet'&&route.params.has('section'));
  if(!retainScroll)window.scrollTo({top:0,behavior:'instant'});
  document.title=`${first==='tool'&&toolById.get(route.segments[1])?`${toolById.get(route.segments[1]).title} · `:''}Structural Acoustics, Understood`;
}

window.addEventListener('hashchange',render);
window.addEventListener('keydown',e=>{
  const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
  else if(e.key==='/'&&!typing){e.preventDefault();openSearch();}
  else if(e.key==='Escape')document.querySelector('.search-dialog[open]')?.close();
});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
