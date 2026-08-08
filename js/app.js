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
import { seaParameterCalculatorRegistry } from './sea-parameters-calculators.js';
import { seaParameterSections, seaParameterToolCatalog, seaParameterDemos, seaParameterCaseNotes, seaParameterReferenceGroups } from './sea-parameters-data.js';
import { lineChartSvg, heatmapSvg, downloadCsv, downloadSvg, downloadText } from './charts.js';
import { demoPreviewSvg, mountDemo } from './demos.js';
import { engineeringResultToText } from './engineering-results.js';
import { homepageNavigation, homepageNavKey, renderHomepage, renderSubjectPage, bindHomepage, subjectWheel } from './homepage.js';
import { renderPageShell, renderBreadcrumbs, renderSectionHeader, renderCallout, renderLinkCollection } from './site-components.js';
import { renderLaunchSeaCapstone, bindLaunchSeaCapstone } from './launch-sea-capstone.js';
import { engineeringWorkbenchRegistry } from './engineering-workbenches.js';
import {
  addEngineeringArtifact,
  classifyTool,
  createEngineeringProject,
  engineeringProjectReport,
  environmentLibrary,
  hardwareTopics,
  handoffInputs,
  learningPathways,
  loadEngineeringProject,
  materialLibrary,
  normalizeEngineeringProject,
  projectTemplates,
  runValidationBenchmarks,
  saveEngineeringProject,
  toolHandoffs
} from './engineering-system.js';

const sections = [...baseSections, ...acs519Sections, ...workflowExpansionSections, ...programExpansionSections, ...seaParameterSections];
const calculatorRegistry = { ...baseCalculatorRegistry, ...extraCalculatorRegistry, ...acs519CalculatorRegistry, ...workflowExpansionCalculatorRegistry, ...programExpansionCalculatorRegistry, ...seaParameterCalculatorRegistry };
const toolCatalog = [...baseToolCatalog, ...extraToolCatalog, ...acs519ToolCatalog, ...workflowExpansionToolCatalog, ...programExpansionToolCatalog, ...seaParameterToolCatalog];
const demos = [...baseDemos, ...acs519Demos, ...workflowExpansionDemos, ...programExpansionDemos, ...seaParameterDemos];
const caseNotes = [...baseCaseNotes, ...acs519CaseNotes, ...workflowExpansionCaseNotes, ...programExpansionCaseNotes, ...seaParameterCaseNotes];
const referenceGroups = [...baseReferenceGroups, ...acs519ReferenceGroups, ...workflowExpansionReferenceGroups, ...programExpansionReferenceGroups, ...seaParameterReferenceGroups];
const toolById = new Map(toolCatalog.map(t => [t.id, t]));
const DESIGN_PROOF_CHAPTER_ID = 'shell-acoustics-deep-dive';
const DESIGN_PROOF_TOOL_ID = 'critical-frequency';
const LAUNCH_SEA_CAPSTONE_ID = 'launch-vibroacoustic-capstone';
const workbenchRegistry = {
  [LAUNCH_SEA_CAPSTONE_ID]: { render: () => renderLaunchSeaCapstone(), bind: root => bindLaunchSeaCapstone(root) },
  ...engineeringWorkbenchRegistry
};
const chapterHardwareLinks = [
  { title: 'Payload fairing', description: 'Cavity and panel coupling', href: '#/hardware/fairing' },
  { title: 'Wet tank barrels', description: 'Fluid-loaded shell dynamics', href: '#/hardware/tank' },
  { title: 'Interstage transitions', description: 'Impedance and wave matching', href: '#/hardware/interstage' },
  { title: 'Launch source region', description: 'Forcing entering the stack', href: '#/hardware/propulsion' }
];
const chapterRelatedLinks = [
  { title: 'Shell mode families', description: 'Interactive circumferential-order map', href: '#/demo/shell-wave-map' },
  { title: 'Cylindrical shell acoustics', description: 'Paired engineering calculator', href: '#/tool/shell-acoustics' },
  { title: 'Plate critical frequency', description: 'Compare ring and coincidence scales', href: '#/tool/critical-frequency' }
];
const calculatorRelatedLinks = [
  { title: 'Coincidence explorer', description: 'Move acoustic and flexural wavenumber curves', href: '#/demo/coincidence' },
  { title: 'Radiation regime explorer', description: 'Connect coincidence to acoustic efficiency', href: '#/tool/radiation-efficiency' },
  { title: 'Cylinder ring frequency', description: 'Keep curvature and coincidence distinct', href: '#/tool/ring-frequency' }
];
const app = document.querySelector('#app');
let routeCleanup = () => {};
let toastTimer = 0;
let activeSearchType = 'All';

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
  if(name==='tools')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4.6 4.6 0 0 0-5.8 5.8l-5.7 5.7a2.1 2.1 0 0 0 3 3l5.7-5.7a4.6 4.6 0 0 0 5.8-5.8l-2.5 2.5-3-3z"/></svg>';
  return '';
}
function brandMark(){return `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M8 27c6-13 12-13 18 0s11 13 14 1"/><path d="M8 19c6 8 12 8 18 0s10-8 14-1"/></svg>`;}
function routeInfo(){
  const raw=(location.hash.slice(1)||'/');
  const [pathPart, queryString='']=raw.split('?');
  const path=pathPart.startsWith('/')?pathPart:`/${pathPart}`;
  return { path, segments:path.split('/').filter(Boolean), params:new URLSearchParams(queryString), raw };
}
function navKey(route){
  return homepageNavKey(route.segments[0]||'',route.params.get('section')||'');
}
function renderToolsMenu(active=false){
  const preferred=['Utilities','Dynamics','Structures','Acoustics','Noise Control','Random & Shock','Structural Acoustics','Aero / Distributed Loads','SEA & Energy','Test & Signal'];
  const categories=[...new Set(toolCatalog.map(tool=>tool.category))].sort((a,b)=>{
    const ai=preferred.indexOf(a),bi=preferred.indexOf(b);
    return (ai<0?preferred.length:ai)-(bi<0?preferred.length:bi)||a.localeCompare(b);
  });
  return `<div class="tools-menu" data-tools-menu><button type="button" class="tools-menu-trigger ${active?'active':''}" data-tools-toggle aria-expanded="false" aria-controls="tools-menu-panel">${icon('tools')}<span>Tools<small>Calculators & workbenches</small></span><b aria-hidden="true">⌄</b></button><div class="tools-menu-panel" id="tools-menu-panel" hidden><header><div><p class="eyebrow">Engineering tools</p><h2>Choose the model by discipline.</h2></div><a class="tools-menu-all" href="#/tools">Browse all ${toolCatalog.length} tools <span aria-hidden="true">→</span></a></header><div class="tools-menu-grid">${categories.map(category=>{const tools=toolCatalog.filter(tool=>tool.category===category);return `<section><a class="tools-menu-category" href="#/tools?category=${encodeURIComponent(category)}"><strong>${esc(category)}</strong><span>${tools.length} tools</span></a><div>${tools.slice(0,3).map(tool=>`<a href="#/tool/${encodeURIComponent(tool.id)}">${esc(tool.title)}</a>`).join('')}</div>${tools.length>3?`<a class="tools-menu-more" href="#/tools?category=${encodeURIComponent(category)}">View all ${tools.length} →</a>`:''}</section>`;}).join('')}</div></div></div>`;
}
function shell(main, route) {
  const active=navKey(route);
  const project=loadEngineeringProject();
  return `<header class="site-header">
    <a class="brand" href="#/">${brandMark()}<span class="brand-copy"><strong>Structural Acoustics</strong><small>Understood</small></span></a>
    <nav class="primary-nav" aria-label="Primary">${homepageNavigation.map(item=>`<a href="${item.href}" class="${active===item.id?'active':''}" ${active===item.id?'aria-current="page"':''}><span>${item.label}</span><small>${item.descriptor}</small></a>`).join('')}${renderToolsMenu(active==='tools')}</nav>
    <div class="header-actions"><a class="project-pill" href="#/workspace" aria-label="Open engineering project"><span>Project</span><b>${project.artifacts.length}</b></a><button class="icon-button header-search" data-action="search" aria-label="Search">${icon('search')}<span>Search</span></button><button class="icon-button header-print" data-action="print" aria-label="Print current page">${icon('print')}</button><button class="menu-button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button></div>
  </header>
  <main id="main-content">${main}</main>
  <footer class="site-footer"><div><strong>Structural Acoustics, Understood</strong><p>Original engineering reference and browser-based screening tools. Verify controlled methods before design or qualification use.</p></div><div class="footer-links"><a href="#/validation">Verification center</a><a href="#/references">Assumptions & references</a><a href="#/workspace">Engineering project</a><a href="#/tools">${toolCatalog.length} tools</a><a href="#/demos">${demos.length} demos</a><button class="link-button" data-action="print">Print / PDF</button></div></footer>
  ${searchDialog()}<div class="toast" role="status" aria-live="polite"></div>`;
}
function searchDialog(){return `<dialog class="search-dialog"><div class="search-shell"><div class="search-input-wrap">${icon('search')}<input id="global-search" type="search" placeholder="Search equation, hardware, method, output…" autocomplete="off" aria-label="Search engineering reference"/><button class="kbd-button" data-action="close-search">Esc</button></div><div class="search-facets" aria-label="Search result types"><button class="active" data-search-type="All">All</button>${['Subject','Tool','Chapter','Demo','Case note','Hardware','Pathway','Glossary'].map(type=>`<button data-search-type="${type}">${type}</button>`).join('')}</div><div class="search-results" id="search-results"></div></div></dialog>`;}
function intro({eyebrow,title,lede,aside='',metrics=[],buttons=[]}){
  return `<section class="page-intro"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="lede">${lede}</p>${buttons.length?`<div class="button-row">${buttons.map(b=>`<${b.href?'a':'button'} class="${b.secondary?'button-secondary':'button'}" ${b.href?`href="${b.href}"`:`data-action="${b.action}"`}>${b.label}</${b.href?'a':'button'}>`).join('')}</div>`:''}</div><aside class="intro-aside">${aside}${metrics.length?`<div class="intro-metrics">${metrics.map(m=>`<div class="metric"><strong>${esc(m.value)}</strong><span>${esc(m.label)}</span></div>`).join('')}</div>`:''}</aside></section>`;
}

function isChapterDesignProof(route) {
  return route.segments[0] === 'cheat-sheet' && route.params.get('section') === DESIGN_PROOF_CHAPTER_ID;
}
function isCalculatorDesignProof(route) {
  return route.segments[0] === 'tool' && decodeURIComponent(route.segments[1] || '') === DESIGN_PROOF_TOOL_ID;
}
function renderConceptCard(concept, proof = false) {
  const interpretation = concept.interpretation
    ? renderCallout({ tone: 'note', label: 'Engineering note', bodyHtml: concept.interpretation })
    : '';
  const mistake = concept.mistake
    ? renderCallout({ tone: 'warning', label: 'Common mistake', bodyHtml: concept.mistake })
    : '';
  return `<article class="concept-card site-concept-card${proof ? ' site-concept-card-proof' : ''}" id="concept-${slug(concept.title)}"><h3>${esc(concept.title)}</h3>${concept.equation ? `<div class="equation site-equation-panel">${concept.equation}</div>` : ''}<p>${esc(concept.body)}</p>${interpretation}${mistake}<div class="card-meta">${(concept.tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>${concept.toolId && toolById.has(concept.toolId) ? `<a class="concept-tool-link site-inline-link" href="#/tool/${encodeURIComponent(concept.toolId)}">Open ${esc(toolById.get(concept.toolId).title)} <span aria-hidden="true">→</span></a>` : ''}</article>`;
}

function chapterTools(section) {
  return [...new Set((section.concepts || []).map(concept => concept.toolId).filter(id => toolById.has(id)))].map(id => ({
    title: toolById.get(id).title,
    description: toolById.get(id).description,
    href: `#/tool/${encodeURIComponent(id)}`
  }));
}

function chapterHardware(section) {
  const text = `${section.id} ${section.title} ${section.summary} ${(section.concepts || []).flatMap(concept => concept.tags || []).join(' ')}`.toLowerCase();
  const scored = hardwareTopics.map(topic => ({ topic, score: topic.chapters.includes(section.id) ? 20 : topic.sources.concat(topic.paths, topic.responses).filter(term => text.includes(term.toLowerCase().split(' ')[0])).length }));
  return scored.sort((a,b)=>b.score-a.score).filter(item=>item.score>0).slice(0,3).map(({topic})=>({ title:topic.title, description:topic.eyebrow, href:`#/hardware/${topic.id}` }));
}

function renderChapterDirectory() {
  return `<div class="chapter-directory-toolbar"><label><span>Find a chapter</span><input id="chapter-filter" type="search" placeholder="Filter by concept, method, or hardware…"/></label><a class="button-secondary" href="#/pathways">Use a guided pathway</a></div><div class="chapter-directory" id="chapter-directory">${sections.map(section=>`<a class="chapter-directory-card" href="#/cheat-sheet?section=${encodeURIComponent(section.id)}" data-chapter-search="${esc(`${section.title} ${section.summary} ${section.eyebrow} ${(section.concepts||[]).map(c=>`${c.title} ${(c.tags||[]).join(' ')}`).join(' ')}`.toLowerCase())}"><span>${esc(section.number)}</span><div><p class="eyebrow">${esc(section.eyebrow)}</p><h2>${esc(section.title)}</h2><p>${esc(section.summary)}</p><small>${section.concepts.length} concepts · ${chapterTools(section).length} linked tools</small></div><b aria-hidden="true">→</b></a>`).join('')}</div>`;
}

function renderCheat(route){
  const selectedId=route.segments[0]==='chapter'?decodeURIComponent(route.segments[1]||''):route.params.get('section');
  const selectedSection=sections.find(section=>section.id===selectedId);
  const breadcrumbs=renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Working reference',href:'#/cheat-sheet'},...(selectedSection?[{label:selectedSection.title}]:[])]);
  if(!selectedSection){
    const page=`${breadcrumbs}${intro({eyebrow:'The working reference',title:'Choose a chapter.<br>Follow the physics.',lede:'A focused library for structural dynamics, random vibration, shock, acoustics, shells, distributed loads, SEA, measurement, and launch-vehicle applications.',aside:'<p>Each chapter now opens as a deliberate learning sequence instead of loading the entire reference into one page.</p>',metrics:[{value:sections.length,label:'chapters'},{value:sections.reduce((count,section)=>count+section.concepts.length,0),label:'engineering concepts'},{value:toolCatalog.length,label:'linked tools'}],buttons:[{label:'Start a learning pathway',href:'#/pathways'},{label:'Browse all tools',href:'#/tools',secondary:true}]})}${renderChapterDirectory()}`;
    return renderPageShell(page,{variant:'chapter-library'});
  }
  const proof=selectedSection.id===DESIGN_PROOF_CHAPTER_ID;
  const index=sections.indexOf(selectedSection);
  const tools=chapterTools(selectedSection);
  const hardware=chapterHardware(selectedSection);
  const deepDive=selectedSection.deepDiveId?{label:'Read the complete launch-vehicle deep dive',href:`#/case-note/${encodeURIComponent(selectedSection.deepDiveId)}`}:null;
  const sequence=`<nav class="chapter-sequence" aria-label="Chapter learning sequence"><span><b>01</b>Build intuition</span><span><b>02</b>Read the equations</span><span><b>03</b>Use the models</span><span><b>04</b>Verify the limits</span></nav>`;
  const header=`<header class="section-heading site-section-header focused-chapter-header"><span class="section-number">${esc(selectedSection.number)}</span><div><p class="eyebrow">${esc(selectedSection.eyebrow)}</p><h1>${esc(selectedSection.title)}</h1><p>${esc(selectedSection.summary)}</p>${deepDive?`<a class="concept-tool-link site-inline-link" href="${esc(deepDive.href)}">${esc(deepDive.label)} <span aria-hidden="true">→</span></a>`:''}</div></header>`;
  const rail=`<aside class="section-rail chapter-local-rail" aria-label="Chapter navigation"><p class="rail-title">Chapter concepts</p>${selectedSection.concepts.map(concept=>`<a href="#concept-${slug(concept.title)}"><span>${String(selectedSection.concepts.indexOf(concept)+1).padStart(2,'0')}</span>${esc(concept.title)}</a>`).join('')}<a class="chapter-all-link" href="#/cheat-sheet">All ${sections.length} chapters</a></aside>`;
  const context=`<section class="site-context-grid chapter-context" aria-label="Chapter application context">${hardware.length?renderLinkCollection({label:'Applied hardware',items:hardware,variant:'hardware'}):''}${tools.length?renderLinkCollection({label:'Continue with a model',items:tools.slice(0,4),variant:'related'}):''}</section>`;
  const next=sections[index+1]??sections[0],previous=sections[index-1]??sections.at(-1);
  const footer=`<nav class="chapter-pagination" aria-label="Adjacent chapters"><a href="#/cheat-sheet?section=${encodeURIComponent(previous.id)}"><small>Previous chapter</small><strong>${esc(previous.title)}</strong></a><button type="button" data-action="chapter-reviewed" data-chapter-id="${esc(selectedSection.id)}">Mark chapter reviewed</button><a href="#/cheat-sheet?section=${encodeURIComponent(next.id)}"><small>Next chapter</small><strong>${esc(next.title)}</strong></a></nav>`;
  const content=`<section class="cheat-section site-chapter-section site-focused-chapter${proof?' site-design-proof-section':''}" id="section-${esc(selectedSection.id)}" data-section="${esc(selectedSection.id)}">${header}${sequence}${context}<div class="concept-grid site-concept-grid">${selectedSection.concepts.map(concept=>renderConceptCard(concept,proof)).join('')}</div>${footer}</section>`;
  const page=`${breadcrumbs}<div class="focused-chapter-layout">${rail}<div class="cheat-content">${content}</div></div>`;
  return renderPageShell(page,{variant:'focused-chapter'});
}
function toolCard(t,index){const profile=classifyTool(t,Object.keys(workbenchRegistry));return `<a class="tool-card site-tool-card" href="#/tool/${encodeURIComponent(t.id)}" data-category="${esc(t.category)}" data-task="${esc(profile.task)}" data-hardware="${esc(profile.hardware)}" data-input="${esc(profile.input)}" data-level="${esc(profile.level)}" data-search="${esc(`${t.title} ${t.description} ${(t.keywords||[]).join(' ')} ${profile.task} ${profile.hardware} ${profile.input}`.toLowerCase())}"><span class="tool-index">${String(index+1).padStart(2,'0')}</span><div class="tool-type-row"><span>${esc(profile.level)}</span>${profile.workbench?'<b>GUIDED</b>':''}</div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><footer><span>${esc(t.category)} · ${esc(profile.hardware)}</span><span class="arrow">→</span></footer></a>`;}
function renderTools(route){
  const categories=['All',...new Set(toolCatalog.map(t=>t.category))];
  const profiles=toolCatalog.map(tool=>classifyTool(tool,Object.keys(workbenchRegistry)));
  const requestedCategory=route?.params?.get('category');
  const selectedCategory=categories.includes(requestedCategory)?requestedCategory:'All';
  const options=(label,values,key,selected='All')=>`<label><span>${label}</span><select data-tool-filter="${key}"><option value="All" ${selected==='All'?'selected':''}>All</option>${[...new Set(values)].sort().map(value=>`<option value="${esc(value)}" ${selected===value?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
  const intents=[
    ['I have a PSD','Response & loads','Start with response, extremes, fatigue, or test planning.'],
    ['I need panel TL','Transmission & control','Move from mass law through coincidence and installed paths.'],
    ['I am planning a test','Test & validation','Build measurement, control, notching, and evidence.'],
    ['I need SEA parameters','SEA & energy','Inspect modal density, damping, coupling, and response recovery.']
  ];
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Engineering calculators'}])}${intro({eyebrow:'Engineering calculators',title:'Start with the decision.<br>Then choose the model.',lede:'Quick screens stay fast. Physics labs expose behavior. Guided workbenches preserve multi-step engineering decisions and evidence.',aside:'<p>Calculations run locally in the browser. Imported engineering data is not uploaded by this static application.</p>',metrics:[{value:toolCatalog.length,label:'tools'},{value:Object.keys(workbenchRegistry).length,label:'guided workbenches'},{value:'Local',label:'data processing'}],buttons:[{label:'Open project workspace',href:'#/workspace'},{label:'Verification center',href:'#/validation',secondary:true}]})}<section class="tool-intents" aria-label="Common engineering starting points">${intents.map(([title,task,description])=>`<button type="button" data-tool-intent="${esc(task)}"><strong>${esc(title)}</strong><span>${esc(description)}</span><b aria-hidden="true">→</b></button>`).join('')}</section><div class="tool-discovery" aria-label="Tool decision filters"><label class="tool-filter-search"><span>Search</span><input id="tool-filter-search" type="search" placeholder="Method, output, hardware, or input…"/></label>${options('Discipline',categories.slice(1),'category',selectedCategory)}${options('Engineering task',profiles.map(profile=>profile.task),'task')}${options('Hardware',profiles.map(profile=>profile.hardware),'hardware')}${options('Available input',profiles.map(profile=>profile.input),'input')}${options('Tool depth',profiles.map(profile=>profile.level),'level')}<button type="button" class="button-quiet" data-action="clear-tool-filters">Clear</button><span id="tool-count" class="filter-count">${toolCatalog.length} shown</span></div><div class="tool-grid">${toolCatalog.map(toolCard).join('')}</div>`;
  return renderPageShell(page,{variant:'tool-library'});
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
function conceptLinksForTool(id){
  return sections.flatMap(section=>section.concepts.map(concept=>({section,concept}))).filter(item=>item.concept.toolId===id).slice(0,4).map(({section,concept})=>({title:concept.title,description:section.title,href:`#/cheat-sheet?section=${encodeURIComponent(section.id)}&concept=${encodeURIComponent(slug(concept.title))}`}));
}
function renderTool(route){
  const id=decodeURIComponent(route.segments[1]||''); const meta=toolById.get(id),calc=calculatorRegistry[id];
  if(!meta||!calc)return renderNotFound('Calculator not found','The requested tool is not in this build.');
  if(workbenchRegistry[id]&&route.params.get('mode')!=='quick')return workbenchRegistry[id].render();
  const proof=isCalculatorDesignProof(route);
  const profile=classifyTool(meta,Object.keys(workbenchRegistry));
  const projectHandoff=route.params.get('fromProject')==='1'?handoffInputs(id):null;
  const values={};for(const field of calc.inputs||[])values[field.key]=route.params.has(field.key)?route.params.get(field.key):(projectHandoff?.inputs&&Object.hasOwn(projectHandoff.inputs,field.key)?projectHandoff.inputs[field.key]:field.default);
  const refs=relevantReferences(meta.category);
  const handoffs=toolHandoffs(meta,toolCatalog).map(tool=>({title:tool.title,description:`${classifyTool(tool,Object.keys(workbenchRegistry)).level} · ${tool.category}`,href:`#/tool/${encodeURIComponent(tool.id)}`}));
  const concepts=conceptLinksForTool(id);
  const breadcrumbs=renderBreadcrumbs([{label:'Tools',href:'#/tools'},{label:meta.category,href:'#/tools'},{label:meta.title}]);
  const context=`<section class="site-context-grid" aria-label="Calculator context">${renderLinkCollection({label:'Related concepts',items:concepts.length?concepts:calculatorRelatedLinks,variant:'related'})}${renderLinkCollection({label:'Recommended handoffs',items:handoffs,variant:'hardware'})}</section>`;
  const assumptionRule=renderCallout({tone:'assumption',label:'Use rule',body:'A polished numerical result does not expand the validity of its governing model.'});
  const provenance=`<aside class="model-provenance"><p class="eyebrow">Model provenance</p><dl><div><dt>Tool depth</dt><dd>${esc(profile.level)}</dd></div><div><dt>Engineering task</dt><dd>${esc(profile.task)}</dd></div><div><dt>Primary hardware</dt><dd>${esc(profile.hardware)}</dd></div><div><dt>Expected input</dt><dd>${esc(profile.input)}</dd></div></dl></aside>`;
  const handoffBanner=projectHandoff?renderCallout({tone:'warning',label:'Project handoff applied',body:`Matching field keys were transferred from ${projectHandoff.source}. Confirm units, statistical basis, frequency convention, and physical meaning before accepting the imported values.`}):'';
  const page=`${breadcrumbs}${handoffBanner}<section class="tool-hero site-page-header"><div class="tool-hero-copy"><p class="eyebrow">${esc(meta.category)} · ${esc(profile.level)}</p><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p></div><aside class="tool-status site-status-panel"><dl><dt>Basis</dt><dd>${esc(calc.basis||'Documented engineering relation')}</dd><dt>Result</dt><dd>${esc(calc.confidence||'Screening calculation')}</dd><dt>Execution</dt><dd>Local browser</dd><dt>Route</dt><dd><code>${esc(id)}</code></dd></dl></aside></section>${context}<div class="calculator-layout site-calculator-container"><section class="calc-panel site-calculator-panel"><header class="calc-panel-header site-panel-header"><h2>Inputs</h2><button class="button-quiet" data-action="reset-calculator">Reset</button></header><form class="calc-form" id="calculator-form">${(calc.inputs||[]).map(f=>fieldHtml(f,values[f.key])).join('')}<div class="calc-form-actions"><button class="button" type="submit">Calculate</button><button class="button-secondary" type="button" data-action="share-calculation">Copy share link</button></div></form></section><section class="calc-panel site-calculator-panel"><header class="calc-panel-header site-panel-header"><h2>Results</h2><div><button class="button-quiet" data-action="copy-results">Copy engineering result</button><button class="button-quiet" data-action="print">Print / PDF</button></div></header><div class="calc-results" id="calculator-results"><div class="calc-empty">Enter values and calculate.</div></div></section></div><section class="tabs site-tabs"><div class="tab-list" role="tablist"><button class="tab-button active" data-tab="theory" role="tab">Theory</button><button class="tab-button" data-tab="example" role="tab">Worked example</button><button class="tab-button" data-tab="assumptions" role="tab">Assumptions</button><button class="tab-button" data-tab="references" role="tab">References & provenance</button></div><div class="tab-panel site-theory-panel" id="tab-panel"><h2>Governing model</h2>${calc.theory||'<p>This calculator implements the documented governing relationship shown in the cheat sheet.</p>'}<h3>Inputs and units</h3><div class="variable-table">${(calc.inputs||[]).map(f=>`<div>${esc(f.key)}</div><div>${esc(f.label)}${f.unit?` · ${esc(f.unit)}`:''}</div>`).join('')}</div></div><template id="tab-theory"><h2>Governing model</h2>${calc.theory||''}<h3>Inputs and units</h3><div class="variable-table">${(calc.inputs||[]).map(f=>`<div>${esc(f.key)}</div><div>${esc(f.label)}${f.unit?` · ${esc(f.unit)}`:''}</div>`).join('')}</div></template><template id="tab-example"><h2>Worked example</h2><p>${esc(calc.example||'Load the defaults and compare the reported primary result with a hand calculation using the governing equation.')}</p><p><a class="concept-tool-link site-inline-link" href="#/cheat-sheet">Open the linked cheat-sheet context <span aria-hidden="true">→</span></a></p></template><template id="tab-assumptions"><h2>Assumptions and validity</h2><ul>${(calc.assumptions||['Linear response and consistent units.']).map(a=>`<li>${esc(a)}</li>`).join('')}</ul>${assumptionRule}</template><template id="tab-references"><h2>References for this topic</h2><ul class="reference-list">${refs.map(r=>`<li><strong>${esc(r.title)}</strong><span>${esc(r.note)}</span></li>`).join('')}</ul>${provenance}<p>Also verify the controlled analysis method, handbook revision, material data, and program-specific statistical convention used by the actual deliverable.</p></template></section>`;
  return renderPageShell(page,{variant:proof?'calculator-proof':''});
}
function renderDemos(){const topics=[...new Set(demos.map(d=>d.topic))].sort();const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Interactive demos'}])}${intro({eyebrow:'Interactive physics',title:'Form a hypothesis.<br>Move the variables.',lede:'The shared lab format connects physical behavior to limiting cases, scenario comparisons, applied hardware, and a recorded engineering takeaway.',aside:'<p>Use demos for exploration, calculators for numerical screening, and workbenches for multi-step decisions.</p>',metrics:[{value:demos.length,label:'physics labs'},{value:topics.length,label:'topics'},{value:'Local',label:'scenario notebook'}],buttons:[{label:'Browse learning pathways',href:'#/pathways'},{label:'Open project workspace',href:'#/workspace',secondary:true}]})}<div class="demo-discovery"><label><span>Filter labs</span><input id="demo-filter-search" type="search" placeholder="Resonance, SEA, shock, radiation…"/></label><label><span>Topic</span><select id="demo-topic-filter"><option value="All">All topics</option>${topics.map(topic=>`<option value="${esc(topic)}">${esc(topic)}</option>`).join('')}</select></label><span id="demo-count">${demos.length} labs</span></div><div class="demo-grid">${demos.map(d=>`<a class="demo-card site-demo-card" href="#/demo/${encodeURIComponent(d.id)}" data-demo-topic="${esc(d.topic)}" data-demo-search="${esc(`${d.title} ${d.description} ${d.topic}`.toLowerCase())}"><div class="demo-preview">${demoPreviewSvg(d.id)}</div><div class="demo-card-copy"><p class="eyebrow">${esc(d.topic)} · Physics lab</p><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p><span class="concept-tool-link site-inline-link">Open lab →</span></div></a>`).join('')}</div>`;return renderPageShell(page,{variant:'demo-library'});}
function demoLabPrompts(d){
  const text=`${d.id} ${d.topic}`.toLowerCase();
  if(/sea|energy|coupling/.test(text))return ['Start with weak coupling and equal damping.','Increase coupling until subsystem energies converge.','Identify the assumption that fails first at low modal population.'];
  if(/shock|srs|random|psd|fatigue/.test(text))return ['Establish a low-severity baseline.','Change duration, damping, or bandwidth one at a time.','Compare RMS, extreme, shock, and fatigue conclusions.'];
  if(/wave|coincidence|radiation|shell|panel/.test(text))return ['Locate the long-wavelength limiting regime.','Move through the matching or coincidence region.','Compare the finite-structure behavior with the asymptotic expectation.'];
  return ['Establish the nominal configuration.','Change one physically meaningful parameter at a time.','Record the mechanism controlling the observed change.'];
}
function renderDemo(route){const id=decodeURIComponent(route.segments[1]||''),d=demos.find(x=>x.id===id);if(!d)return renderNotFound('Demo not found','The requested interactive demonstration is not in this build.');const prompts=demoLabPrompts(d);const hardware=hardwareTopics.filter(topic=>`${topic.summary} ${topic.sources.join(' ')} ${topic.paths.join(' ')}`.toLowerCase().includes(d.topic.toLowerCase().split(' ')[0])).slice(0,2);const page=`${renderBreadcrumbs([{label:'Demos',href:'#/demos'},{label:d.topic},{label:d.title}])}<section class="tool-hero site-page-header"><div class="tool-hero-copy"><p class="eyebrow">${esc(d.topic)} · Interactive physics lab</p><h1>${esc(d.title)}</h1><p>${esc(d.description)}</p><div class="button-row"><a class="button" href="#/tool/${encodeURIComponent(d.toolId)}">Open paired calculator</a><a class="button-secondary" href="#/demos">All labs</a></div></div><aside class="tool-status site-status-panel"><dl><dt>Question</dt><dd>What mechanism controls the trend?</dd><dt>Method</dt><dd>Hypothesis → variation → comparison</dd><dt>Record</dt><dd>Browser-local project artifact</dd></dl></aside></section><section class="lab-guide" aria-label="Engineering lab guide"><div><p class="eyebrow">Hypothesis</p><h2>Predict before moving the controls.</h2><p>${esc(`If the controlling ${d.topic.toLowerCase()} mechanism is represented correctly, a one-at-a-time parameter change should produce a physically explainable trend rather than only a new number.`)}</p></div><ol>${prompts.map((prompt,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span>${esc(prompt)}</li>`).join('')}</ol></section><section class="demo-stage site-demo-container" id="demo-mount"></section><section class="lab-notebook" data-demo-lab="${esc(d.id)}"><header><div><p class="eyebrow">Scenario notebook</p><h2>Compare two engineering observations</h2></div><p>Record the parameter change, the physical response, and why it matters.</p></header><div><label><span>Scenario A · baseline observation</span><textarea data-lab-scenario="A" placeholder="Parameters, trend, controlling mechanism…"></textarea></label><label><span>Scenario B · changed configuration</span><textarea data-lab-scenario="B" placeholder="What changed, what responded, and why…"></textarea></label></div><div class="lab-notebook-actions"><button type="button" class="button" data-action="save-lab-observation">Add comparison to project</button>${hardware.map(topic=>`<a class="button-secondary" href="#/hardware/${topic.id}">${esc(topic.title)}</a>`).join('')}</div>${renderCallout({tone:'assumption',label:'Lab boundary',body:'This interactive lab exposes model behavior. The paired calculator, controlled input data, convergence evidence, and applicable hardware assumptions are still required for a design decision.'})}</section>`;return renderPageShell(page,{variant:'demo'});}
function renderCaseNotes(){const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Applied case notes'}])}${intro({eyebrow:'Applied engineering notes',title:'Where the equation<br>meets the messy system.',lede:'Short case notes on the mistakes, judgment calls, and cross-checks that matter in real structural-acoustic analysis.',aside:'<p>The notes connect measurement, numerical methods, statistics, and interpretation—especially where one convenient shortcut can become a bad conclusion.</p>',metrics:[{value:caseNotes.length,label:'case notes'},{value:'Applied',label:'engineering depth'},{value:'Linked',label:'to tools'}]})}<div class="case-grid">${caseNotes.map(c=>`<a class="case-card site-case-card" href="#/case-note/${encodeURIComponent(c.id)}"><span class="case-number">CASE ${esc(c.number)}</span><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p><div class="card-meta">${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><footer>${esc(c.readTime)} read →</footer></a>`).join('')}</div>`;return renderPageShell(page,{variant:'case-library'});}
function renderCaseNote(route){const id=decodeURIComponent(route.segments[1]||''),c=caseNotes.find(x=>x.id===id);if(!c)return renderNotFound('Case note not found','The requested engineering note is not in this build.');const page=`<article class="article-shell site-article-shell">${renderBreadcrumbs([{label:'Case notes',href:'#/case-notes'},{label:`Case ${c.number}`}])}<header class="article-header"><p class="eyebrow">Applied engineering · Case ${esc(c.number)}</p><h1>${esc(c.title)}</h1><p class="lede">${esc(c.summary)}</p><div class="article-meta"><span>${esc(c.readTime)} read</span>${c.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="button-row"><button type="button" class="button-secondary" data-action="add-case-to-project" data-case-id="${esc(c.id)}">Add note to project</button><a class="button-secondary" href="#/workspace">Open project</a></div></header><div class="article-body">${c.body}</div></article>`;return renderPageShell(page,{variant:'article'});}

function renderHardware(route){
  const id=decodeURIComponent(route.segments[1]||'');
  const topic=hardwareTopics.find(item=>item.id===id);
  if(!topic){
    const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Launch-vehicle hardware atlas'}])}${intro({eyebrow:'Hardware-first navigation',title:'Start with the vehicle.<br>Trace the energy.',lede:'Each hardware page connects physical sources, transmission paths, responses, measurements, mitigation decisions, chapters, and existing engineering tools.',aside:'<p>The atlas is a map of model choices and evidence—not a claim that one reduced-order method fits every frequency or configuration.</p>',metrics:[{value:hardwareTopics.length,label:'hardware systems'},{value:'Source → response',label:'analysis chain'},{value:'Linked',label:'existing content'}],buttons:[{label:'Open engineering project',href:'#/workspace'},{label:'Follow a role pathway',href:'#/pathways',secondary:true}]})}<div class="hardware-grid">${hardwareTopics.map(item=>`<a class="hardware-card" href="#/hardware/${item.id}" style="--hardware-accent:${item.accent}"><span class="hardware-orbit" aria-hidden="true"></span><p class="eyebrow">${esc(item.eyebrow)}</p><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><dl><div><dt>Sources</dt><dd>${item.sources.length}</dd></div><div><dt>Paths</dt><dd>${item.paths.length}</dd></div><div><dt>Models</dt><dd>${item.models.length}</dd></div></dl><b>Open hardware system →</b></a>`).join('')}</div>`;
    return renderPageShell(page,{variant:'hardware-library'});
  }
  const flowColumn=(label,items,index)=>`<section><span>${String(index).padStart(2,'0')}</span><h2>${label}</h2><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`;
  const chapterLinks=topic.chapters.map(id=>sections.find(section=>section.id===id)).filter(Boolean).map(section=>({title:section.title,description:section.summary,href:`#/cheat-sheet?section=${encodeURIComponent(section.id)}`}));
  const page=`${renderBreadcrumbs([{label:'Hardware atlas',href:'#/hardware'},{label:topic.title}])}<section class="hardware-hero" style="--hardware-accent:${topic.accent}"><div><p class="eyebrow">${esc(topic.eyebrow)}</p><h1>${esc(topic.title)}</h1><p>${esc(topic.summary)}</p><div class="button-row"><button type="button" class="button" data-action="start-hardware-project" data-hardware-id="${esc(topic.id)}">Start project from hardware</button><a class="button-secondary" href="#/hardware">All hardware</a></div></div><div class="hardware-schematic" aria-hidden="true"><span></span><span></span><span></span><b>${esc(topic.title)}</b></div></section><section class="hardware-flow" aria-label="Source path response chain">${flowColumn('Sources',topic.sources,1)}${flowColumn('Transmission paths',topic.paths,2)}${flowColumn('Responses',topic.responses,3)}</section><p class="engineering-chain-takeaway"><strong>Engineering takeaway</strong>A credible hardware model follows the complete source–path–response chain and records which measurement or validity check supports each reduction.</p><section class="hardware-evidence-grid"><article><p class="eyebrow">Measurement evidence</p><h2>What to observe</h2><ul>${topic.measurements.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></article><article><p class="eyebrow">Design decisions</p><h2>What can change</h2><ul>${topic.mitigations.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></article></section><section class="hardware-models"><header><p class="eyebrow">Existing engineering models</p><h2>Move from hardware to analysis</h2></header><div>${topic.models.map(model=>`<a href="${model.href}"><span>${esc(model.title)}</span><b>Open →</b></a>`).join('')}</div></section>${chapterLinks.length?renderLinkCollection({label:'Supporting chapters and deep dives',items:chapterLinks,variant:'related'}):''}`;
  return renderPageShell(page,{variant:'hardware'});
}

function renderPathways(route){
  const id=decodeURIComponent(route.segments[1]||'');
  const pathway=learningPathways.find(item=>item.id===id);
  if(!pathway){
    const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Engineering pathways'}])}${intro({eyebrow:'Role and task pathways',title:'Learn what the work<br>actually requires.',lede:'Each pathway connects focused chapters, physics labs, calculators, guided workbenches, capstones, and project evidence in a deliberate sequence.',aside:'<p>Progress is stored locally. A pathway is guidance, not a substitute for program-specific methods, mentoring, or independent review.</p>',metrics:[{value:learningPathways.length,label:'guided pathways'},{value:'Local',label:'progress tracking'},{value:'Applied',label:'capstone outcomes'}],buttons:[{label:'Open chapter library',href:'#/cheat-sheet'},{label:'Open project workspace',href:'#/workspace',secondary:true}]})}<div class="pathway-grid">${learningPathways.map(item=>`<a class="pathway-card" href="#/pathway/${item.id}"><p class="eyebrow">${esc(item.role)}</p><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><div><span>${item.steps.length} steps</span><b>Open pathway →</b></div></a>`).join('')}</div>`;
    return renderPageShell(page,{variant:'pathway-library'});
  }
  const project=loadEngineeringProject();
  const completed=project.completedPathSteps[pathway.id]||[];
  const page=`${renderBreadcrumbs([{label:'Engineering pathways',href:'#/pathways'},{label:pathway.title}])}<section class="pathway-hero"><div><p class="eyebrow">${esc(pathway.role)} · Guided engineering pathway</p><h1>${esc(pathway.title)}</h1><p>${esc(pathway.summary)}</p></div><aside><strong>${completed.length}/${pathway.steps.length}</strong><span>steps reviewed</span><progress max="${pathway.steps.length}" value="${completed.length}"></progress></aside></section><ol class="pathway-steps">${pathway.steps.map((step,index)=>`<li class="${completed.includes(index)?'is-complete':''}"><label><input type="checkbox" data-pathway-step="${index}" data-pathway-id="${esc(pathway.id)}" ${completed.includes(index)?'checked':''}/><span>${String(index+1).padStart(2,'0')}</span></label><div><p class="eyebrow">${esc(step.kind)}</p><h2>${esc(step.title)}</h2><p>${esc(step.why)}</p></div><a href="${step.href}">Open step →</a></li>`).join('')}</ol><section class="pathway-completion"><div><p class="eyebrow">Capstone record</p><h2>Preserve what you learned and decided.</h2><p>Add calculations, lab observations, case notes, validity statements, and analyst notes to the shared engineering project.</p></div><a class="button" href="#/workspace">Open engineering project</a></section>`;
  return renderPageShell(page,{variant:'pathway'});
}

function renderWorkspace(){
  const project=loadEngineeringProject();
  const template=projectTemplates.find(item=>item.id===project.templateId)||projectTemplates[0];
  const artifacts=project.artifacts.length?project.artifacts.map((artifact,index)=>`<article class="project-artifact"><header><div><span>${String(index+1).padStart(2,'0')} · ${esc(artifact.type)}</span><h3>${esc(artifact.title)}</h3></div><button type="button" class="button-quiet" data-remove-artifact="${esc(artifact.id)}">Remove</button></header><p>${esc(artifact.takeaway||'No takeaway recorded.')}</p><dl><div><dt>Validity</dt><dd>${esc(artifact.validity||'Not recorded')}</dd></div><div><dt>Source</dt><dd>${artifact.route?`<a href="${esc(artifact.route)}">Open record</a>`:'Not recorded'}</dd></div><div><dt>Warnings</dt><dd>${artifact.warnings.length}</dd></div><div><dt>Saved</dt><dd>${esc(new Date(artifact.createdAt).toLocaleString())}</dd></div></dl></article>`).join(''):'<div class="project-empty"><h3>No engineering records yet.</h3><p>Run a calculator, capture a lab comparison, add a case note, or save a workbench step.</p><a class="button-secondary" href="#/tools">Browse tools</a></div>';
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Engineering project'}])}<section class="workspace-hero"><div><p class="eyebrow">Browser-local project workspace</p><h1>${esc(project.name)}</h1><p>${esc(template.summary)}</p></div><aside><strong>${project.artifacts.length}</strong><span>traceable records</span><small>Updated ${esc(new Date(project.updatedAt).toLocaleString())}</small></aside></section><section class="workspace-layout"><aside class="workspace-context"><header><p class="eyebrow">Shared project context</p><h2>Configuration & conventions</h2></header><label><span>Project template</span><select data-project-field="templateId">${projectTemplates.map(item=>`<option value="${item.id}" ${item.id===project.templateId?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><label><span>Project name</span><input data-project-field="name" value="${esc(project.name)}"/></label><label><span>Analyst</span><input data-project-context="analyst" value="${esc(project.context.analyst)}" placeholder="Name or role"/></label><label><span>Configuration</span><input data-project-context="configuration" value="${esc(project.context.configuration)}"/></label><label><span>Shared geometry</span><textarea data-project-context="geometry">${esc(project.context.geometry)}</textarea></label><label><span>Shared assumptions</span><textarea data-project-context="assumptions">${esc(project.context.assumptions)}</textarea></label><label><span>Mission environment</span><input data-project-context="environment" value="${esc(project.context.environment)}"/></label><label><span>Band convention</span><input data-project-context="bandSet" value="${esc(project.context.bandSet)}"/></label><label><span>Units</span><select data-project-context="units"><option ${project.context.units==='SI'?'selected':''}>SI</option><option ${project.context.units==='US customary'?'selected':''}>US customary</option></select></label><label><span>Material library</span><select data-project-context="materialId">${materialLibrary.map(item=>`<option value="${item.id}" ${item.id===project.context.materialId?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><label><span>Fluid / medium library</span><select data-project-context="fluidId">${environmentLibrary.map(item=>`<option value="${item.id}" ${item.id===project.context.fluidId?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><label><span>Project notes</span><textarea data-project-field="notes">${esc(project.notes)}</textarea></label><div class="workspace-actions"><button type="button" class="button" data-project-action="save">Save context</button><button type="button" class="button-secondary" data-project-action="export-report">Export report</button><button type="button" class="button-secondary" data-project-action="export-json">Export JSON</button><button type="button" class="button-quiet" data-project-action="import-json">Import JSON</button><input type="file" data-project-import hidden accept="application/json,.json"/></div>${renderCallout({tone:'assumption',label:'Shared-library rule',body:'Representative material and fluid values are starting points. Record controlled temperature, orientation, fabrication, damping, and configuration data before production use.'})}</aside><div class="workspace-records"><header><div><p class="eyebrow">Engineering report builder</p><h2>Saved calculations, labs, notes, and workbench evidence</h2></div><a class="button-secondary" href="#/validation">Verification center</a></header><div class="project-chain" aria-label="Cross-tool analysis chain"><span>Source</span><b>→</b><span>Acceptance</span><b>→</b><span>System model</span><b>→</b><span>Response</span><b>→</b><span>Test evidence</span></div>${artifacts}</div></section>`;
  return renderPageShell(page,{variant:'workspace'});
}

function renderValidation(){
  const results=runValidationBenchmarks(calculatorRegistry);
  const passed=results.filter(result=>result.pass).length;
  const cards=results.map(result=>`<article class="benchmark-card ${result.pass?'is-pass':'is-fail'}"><header><span>${result.pass?'PASS':'REVIEW'}</span><a href="#/tool/${encodeURIComponent(result.toolId)}">Open model →</a></header><h2>${esc(result.title)}</h2><p>${esc(result.principle)}</p><dl><div><dt>Expected</dt><dd>${esc(formatNumber(result.expected))} ${esc(result.unit)}</dd></div><div><dt>Computed</dt><dd>${esc(formatNumber(result.actual))} ${esc(result.unit)}</dd></div><div><dt>Tolerance</dt><dd>±${esc(formatNumber(result.tolerance))}</dd></div><div><dt>Absolute error</dt><dd>${esc(formatNumber(result.error))}</dd></div></dl><p class="benchmark-takeaway"><strong>Engineering takeaway</strong>${result.pass?'The implementation reproduces this canonical limiting case within the stated tolerance.':'Do not rely on this model until the benchmark discrepancy is resolved.'}</p></article>`).join('');
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Verification center'}])}${intro({eyebrow:'Public model verification',title:'Trust requires<br>visible evidence.',lede:'Canonical limiting cases check numerical implementation, dimensional behavior, conservation, and expected asymptotic trends.',aside:`<p>These checks verify implementation against selected known results. They do not validate a model for a particular vehicle, frequency regime, or configuration.</p>`,metrics:[{value:`${passed}/${results.length}`,label:'benchmarks passing'},{value:'Live',label:'computed in browser'},{value:'Explicit',label:'tolerances'}],buttons:[{label:'Open engineering project',href:'#/workspace'},{label:'Method references',href:'#/references',secondary:true}]})}<div class="benchmark-grid">${cards}</div><section class="validation-ladder"><div><p class="eyebrow">Evidence ladder</p><h2>Verification is necessary. Validation is separate.</h2></div><ol><li><span>01</span><strong>Equation and unit check</strong><p>Confirm implementation and dimensions.</p></li><li><span>02</span><strong>Limiting-case benchmark</strong><p>Recover known physical behavior.</p></li><li><span>03</span><strong>Convergence and sensitivity</strong><p>Bound discretization and parameter dependence.</p></li><li><span>04</span><strong>Configuration-relevant validation</strong><p>Compare with applicable test evidence.</p></li></ol></section>`;
  return renderPageShell(page,{variant:'validation'});
}
function renderReferences(){
  const allItems=referenceGroups.reduce((count,group)=>count+group.items.length,0);
  const method=`<section class="reference-section reference-fixed" id="reference-method"><h2>Methodology and verification</h2><p>Every calculator separates a governing model from its interface. Inputs are normalized to coherent units, invalid domains are rejected, limiting cases are checked, and outputs identify whether they are exact within the model, numerical, empirical, or screening-level.</p><ul><li>Match response quantity, units, frequency range, duration, and statistical basis before combining environments.</li><li>Use complex cross terms when sources are correlated.</li><li>Run convergence checks for FFT, SRS, VRS, FDS, modal truncation, and spatial-pattern truncation.</li><li>Check thin-structure, plane-wave, diffuse-field, weak-coupling, and high-modal-overlap assumptions rather than applying them by habit.</li><li>Verify material data at the applicable temperature, orientation, fabrication state, and uncertainty basis.</li></ul>${renderCallout({tone:'warning',label:'Scope',body:'This site is an analysis companion and calculation record—not an authority for qualification limits, certification, or program-controlled design allowables.'})}</section>`;
  const groups=referenceGroups.map(group=>`<section class="reference-section" id="reference-${slug(group.group)}" data-reference-group="${esc(group.group)}"><h2>${esc(group.group)}</h2><ul class="reference-list">${group.items.map(reference=>`<li data-reference-search="${esc(`${reference.title} ${reference.note} ${group.group}`.toLowerCase())}"><strong>${esc(reference.title)}</strong><span>${esc(reference.note)}</span><small>${esc(group.group)} · source provenance</small></li>`).join('')}</ul></section>`).join('');
  const glossarySection=`<section class="reference-section reference-fixed" id="reference-glossary"><h2>Glossary</h2><dl class="glossary-grid">${glossary.map(([term,definition])=>`<div class="glossary-item"><dt>${esc(term)}</dt><dd>${esc(definition)}</dd></div>`).join('')}</dl></section>`;
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Assumptions and references'}])}${intro({eyebrow:'Methodology and source trail',title:'Know where the model<br>came from.',lede:'Searchable references, nomenclature, unit conventions, verification principles, and calculator limitations are part of the engineering record.',aside:'<p>Source provenance distinguishes exact theory, empirical relationships, screening approximations, and configuration-specific evidence.</p>',metrics:[{value:referenceGroups.length,label:'reference groups'},{value:allItems,label:'source records'},{value:glossary.length,label:'defined terms'}],buttons:[{label:'Verification center',href:'#/validation'},{label:'Print this page',action:'print',secondary:true}]})}<div class="reference-filterbar"><label><span>Search title, note, method, or topic</span><input id="reference-search" type="search" placeholder="SEA reciprocity, Corcos, transmission loss…"/></label><label><span>Source group</span><select id="reference-group-filter"><option value="All">All reference groups</option>${referenceGroups.map(group=>`<option value="${esc(group.group)}">${esc(group.group)}</option>`).join('')}</select></label><span id="reference-count">${allItems} sources</span></div><div class="reference-layout site-reference-layout"><nav class="reference-nav" aria-label="Reference sections"><a href="#reference-method">Methodology</a>${referenceGroups.map(group=>`<a href="#reference-${slug(group.group)}">${esc(group.group)}</a>`).join('')}<a href="#reference-glossary">Glossary</a></nav><div>${method}${groups}${glossarySection}</div></div>`;
  return renderPageShell(page,{variant:'references'});
}
function renderNotFound(title='Page not found',text='That route does not exist.'){return renderPageShell(`<div class="not-found"><div><p class="eyebrow">404</p><h1>${esc(title)}</h1><p class="lede">${esc(text)}</p><div class="button-row"><a class="button" href="#/cheat-sheet">Open cheat sheet</a><a class="button-secondary" href="#/tools">Browse tools</a></div></div></div>`,{variant:'not-found'});}

function collectForm(form){const values={};form.querySelectorAll('[data-key]').forEach(el=>values[el.dataset.key]=el.value);return values;}
function renderTable(table){return `<div class="result-block"><h3>${esc(table.title||'Results table')}</h3><div class="table-wrap"><table><thead><tr>${(table.columns||[]).map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(table.rows||[]).map(row=>`<tr>${row.map((v,i)=>`<td>${i===0&&typeof v==='string'?esc(v):esc(formatNumber(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;}
function renderResult(result,meta){
  const values=result.values.map(s=>`<div class="result-stat ${esc(s.tone||s.status||'')}"><small>${esc(s.label)}</small><strong>${esc(formatNumber(s.value))}</strong>${s.unit?`<span class="unit">${esc(s.unit)}</span>`:''}${s.note?`<div class="field-help">${esc(s.note)}</div>`:''}</div>`).join('');
  const assumptions=result.assumptions.satisfied.map(item=>`<li>${esc(item)}</li>`).join('');
  const warnings=result.assumptions.warnings.map(item=>`<li>${esc(item)}</li>`).join('');
  const considerations=result.interpretation.engineeringConsiderations.map(item=>`<li>${esc(item)}</li>`).join('');
  const concepts=result.relatedConcepts.map(item=>`<a class="related-concept site-related-link" href="${esc(item.href)}"><strong>${esc(item.title)}</strong><span>${esc(item.description)}</span></a>`).join('');
  const commentary=`<section class="engineering-commentary" aria-label="Engineering commentary"><article class="commentary-lead"><p class="commentary-label">Engineering interpretation</p><p>${esc(result.interpretation.summary)}</p><h3>Physical meaning</h3><p>${esc(result.interpretation.physicalMeaning)}</p></article><div class="commentary-grid"><article class="commentary-card validity-card"><h3>Validity checks</h3><dl><div><dt>Regime</dt><dd>${esc(result.validity.regime)}</dd></div><div><dt>Confidence</dt><dd>${esc(result.validity.confidence)}</dd></div></dl></article><article class="commentary-card"><h3>Model assumptions</h3><p class="commentary-note">The calculation treats these conditions as satisfied. Confirm them against the real system.</p><ul class="commentary-list assumption-list">${assumptions}</ul>${warnings?`<h4>Active warnings</h4><ul class="warning-list">${warnings}</ul>`:''}</article><article class="commentary-card"><h3>Engineering considerations</h3><ul class="commentary-list">${considerations}</ul></article><article class="commentary-card"><h3>Related concepts</h3><div class="related-concepts">${concepts}</div></article></div></section>`;
  const plots=(result.plots||[]).map((p,i)=>{const svg=lineChartSvg(p);return `<div class="result-block"><div class="chart-toolbar"><button data-chart-svg="${i}">Download SVG</button><button data-chart-png="${i}">Download PNG</button></div><div class="chart-shell site-chart-container" data-chart="${i}">${svg}</div></div>`;}).join('');
  const heatmaps=(result.heatmaps||[]).map((h,i)=>`<div class="result-block"><div class="chart-toolbar"><button data-heatmap-svg="${i}">Download SVG</button><button data-heatmap-png="${i}">Download PNG</button></div><div class="chart-shell site-chart-container" data-heatmap="${i}">${heatmapSvg(h)}</div></div>`).join('');
  const csv=result.csv?`<div class="result-block"><button class="button-secondary" data-action="download-csv">Download result CSV</button></div>`:'';
  const severity=result.assumptions.warnings.length?'warning':/screen|empirical|preliminary/i.test(result.validity.confidence)?'caution':'nominal';
  const validity=`<section class="result-validity-strip result-validity-${severity}" aria-label="Model validity status"><span>${severity==='warning'?'Active warning':severity==='caution'?'Screening regime':'No automatic warning'}</span><p><strong>${esc(result.validity.regime)}</strong>${esc(result.validity.confidence)}</p></section>`;
  const handoffs=toolHandoffs(meta,toolCatalog);
  const actions=`<section class="result-project-actions"><div><p class="eyebrow">Traceable next step</p><h3>Add this result to the engineering project</h3><p>Preserve inputs, values, interpretation, assumptions, warnings, validity, and source route with the shared project record.</p></div><button type="button" class="button" data-action="add-result-to-project">Add result</button></section>${handoffs.length?`<nav class="result-handoffs" aria-label="Recommended next analyses"><span>Recommended handoffs</span>${handoffs.map(tool=>`<a href="#/tool/${encodeURIComponent(tool.id)}?fromProject=1">${esc(tool.title)} →</a>`).join('')}</nav>`:''}`;
  return `<h3 class="result-section-title">Numerical results</h3>${validity}<div class="result-summary">${values}</div>${commentary}${plots}${heatmaps}${(result.tables||[]).map(renderTable).join('')}${csv}${actions}`;
}
function svgToPng(svgText,filename){
  const blob=new Blob([svgText],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const vb=img.width&&img.height?[img.width,img.height]:[1200,700],canvas=document.createElement('canvas');canvas.width=Math.max(1200,vb[0]);canvas.height=Math.round(canvas.width*vb[1]/vb[0]);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(p=>{const a=document.createElement('a');a.href=URL.createObjectURL(p);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);},'image/png');URL.revokeObjectURL(url);};img.src=url;
}
function bindTool(route){
  const id=decodeURIComponent(route.segments[1]||''),meta=toolById.get(id),calc=calculatorRegistry[id],form=document.querySelector('#calculator-form'),resultsEl=document.querySelector('#calculator-results');if(!form||!calc)return;
  let latest=null;
  const run=()=>{try{latest=calc.compute(collectForm(form));resultsEl.innerHTML=renderResult(latest,meta);bindResultActions(latest,meta);}catch(err){latest=null;resultsEl.innerHTML=`<div class="calc-error"><strong>Calculation could not be completed.</strong><br>${esc(err.message||String(err))}</div>`;}};
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
  document.querySelector('[data-action="add-result-to-project"]')?.addEventListener('click',()=>{const nextTools=toolHandoffs(meta,toolCatalog).map(tool=>tool.id);const form=document.querySelector('#calculator-form');addEngineeringArtifact({type:'Calculator result',title:meta.title,route:location.hash,sourceToolId:meta.id,inputs:form?collectForm(form):{},nextTools,takeaway:result.interpretation.summary,validity:`${result.validity.regime} ${result.validity.confidence}`,assumptions:result.assumptions.satisfied,warnings:result.assumptions.warnings,values:result.values,provenance:`${meta.category} · ${meta.id||location.hash.split('/').pop()}`});showToast('Result added to engineering project');document.querySelector('.project-pill b').textContent=loadEngineeringProject().artifacts.length;});
}

const searchItems=(()=>{
  const out=[];
  subjectWheel.forEach(subject=>out.push({type:'Subject',title:subject.label,description:subject.summary,href:`#/subject/${subject.id}`,text:`${subject.label} ${subject.shortLabel} ${subject.question} ${subject.summary} ${subject.chapterIds.join(' ')}`}));
  toolCatalog.forEach(t=>out.push({type:'Tool',title:t.title,description:t.description,href:`#/tool/${t.id}`,text:`${t.title} ${t.description} ${t.category} ${(t.keywords||[]).join(' ')}`}));
  sections.forEach(s=>{out.push({type:'Chapter',title:s.title,description:s.summary,href:`#/cheat-sheet?section=${s.id}`,text:`${s.title} ${s.summary} ${s.eyebrow}`});s.concepts.forEach(c=>out.push({type:'Chapter',title:c.title,description:c.body,href:`#/cheat-sheet?section=${s.id}&concept=${encodeURIComponent(slug(c.title))}`,text:`${c.title} ${c.body} ${c.interpretation||''} ${c.mistake||''} ${(c.tags||[]).join(' ')}`}));});
  demos.forEach(d=>out.push({type:'Demo',title:d.title,description:d.description,href:`#/demo/${d.id}`,text:`${d.title} ${d.description} ${d.topic}`}));
  caseNotes.forEach(c=>out.push({type:'Case note',title:c.title,description:c.summary,href:`#/case-note/${c.id}`,text:`${c.title} ${c.summary} ${stripHtml(c.body)} ${c.tags.join(' ')}`}));
  hardwareTopics.forEach(topic=>out.push({type:'Hardware',title:topic.title,description:topic.summary,href:`#/hardware/${topic.id}`,text:`${topic.title} ${topic.summary} ${topic.sources.join(' ')} ${topic.paths.join(' ')} ${topic.responses.join(' ')}`}));
  learningPathways.forEach(pathway=>out.push({type:'Pathway',title:pathway.title,description:pathway.summary,href:`#/pathway/${pathway.id}`,text:`${pathway.title} ${pathway.role} ${pathway.summary} ${pathway.steps.map(step=>step.title).join(' ')}`}));
  glossary.forEach(([term,def])=>out.push({type:'Glossary',title:term,description:def,href:'#/references',text:`${term} ${def}`}));
  return out.map(x=>({...x,normalized:x.text.toLowerCase()}));
})();
function search(q,type=activeSearchType){const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);const candidates=type==='All'?searchItems:searchItems.filter(item=>item.type===type);if(!terms.length)return candidates.slice(0,12);return candidates.map(item=>{let score=0;for(const term of terms){if(item.title.toLowerCase()===term)score+=20;if(item.title.toLowerCase().includes(term))score+=8;if(item.normalized.includes(term))score+=2;else score-=20;}return{item,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title)).slice(0,18).map(x=>x.item);}
function renderSearchResults(q){const el=document.querySelector('#search-results');if(!el)return;const items=search(q);const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);el.innerHTML=items.length?items.map(x=>`<a class="search-result" href="${x.href}"><span class="search-result-type">${esc(x.type)}</span><span><strong>${esc(x.title)}</strong><p>${esc(x.description).slice(0,180)}</p>${terms.length?`<small>Matched ${esc(terms.filter(term=>x.normalized.includes(term)).join(' · ')||'title relevance')}</small>`:''}</span></a>`).join(''):`<div class="search-empty">No matching subject, equation, hardware topic, method, tool, demo, case note, pathway, or glossary term.</div>`;el.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.search-dialog')?.close()));}
function openSearch(){const dialog=document.querySelector('.search-dialog');if(!dialog)return;if(!dialog.open)dialog.showModal();const input=dialog.querySelector('#global-search');input.value='';activeSearchType='All';dialog.querySelectorAll('[data-search-type]').forEach(button=>button.classList.toggle('active',button.dataset.searchType==='All'));renderSearchResults('');setTimeout(()=>input.focus(),0);}
function bindEmbeddedDemos(){
  const mounts=[...document.querySelectorAll('[data-embedded-demo]')];
  if(!mounts.length)return;
  const cleanups=mounts.map(mount=>mountDemo(mount,mount.dataset.embeddedDemo));
  const old=routeCleanup;
  routeCleanup=()=>{old();cleanups.forEach(cleanup=>cleanup?.());};
}
function bindGlobal(route){
  const primaryNav=document.querySelector('.primary-nav'),mobileToggle=document.querySelector('.menu-button'),toolsMenu=document.querySelector('[data-tools-menu]'),toolsToggle=document.querySelector('[data-tools-toggle]'),toolsPanel=document.querySelector('#tools-menu-panel');
  const setToolsOpen=open=>{if(!toolsPanel||!toolsToggle)return;toolsPanel.hidden=!open;toolsToggle.setAttribute('aria-expanded',String(open));toolsMenu?.classList.toggle('open',open);};
  mobileToggle?.addEventListener('click',e=>{const open=primaryNav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',open);if(!open)setToolsOpen(false);});
  toolsToggle?.addEventListener('click',()=>setToolsOpen(toolsToggle.getAttribute('aria-expanded')!=='true'));
  document.querySelectorAll('.primary-nav a').forEach(link=>link.addEventListener('click',()=>{setToolsOpen(false);primaryNav?.classList.remove('open');mobileToggle?.setAttribute('aria-expanded','false');}));
  const dismissTools=event=>{if(toolsMenu&&!toolsMenu.contains(event.target))setToolsOpen(false);};
  const escapeTools=event=>{if(event.key==='Escape'&&toolsToggle?.getAttribute('aria-expanded')==='true'){setToolsOpen(false);toolsToggle.focus();}};
  document.addEventListener('pointerdown',dismissTools);
  document.addEventListener('keydown',escapeTools);
  const globalCleanup=routeCleanup;routeCleanup=()=>{globalCleanup();document.removeEventListener('pointerdown',dismissTools);document.removeEventListener('keydown',escapeTools);};
  document.querySelectorAll('[data-action="search"]').forEach(b=>b.addEventListener('click',openSearch));
  document.querySelectorAll('[data-action="print"]').forEach(b=>b.addEventListener('click',()=>window.print()));
  document.querySelector('[data-action="close-search"]')?.addEventListener('click',()=>document.querySelector('.search-dialog')?.close());
  const searchInput=document.querySelector('#global-search');searchInput?.addEventListener('input',()=>renderSearchResults(searchInput.value));
  document.querySelectorAll('[data-search-type]').forEach(button=>button.addEventListener('click',()=>{activeSearchType=button.dataset.searchType;document.querySelectorAll('[data-search-type]').forEach(item=>item.classList.toggle('active',item===button));renderSearchResults(searchInput?.value||'');}));
  document.querySelector('.search-dialog')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.close();});
  if(navKey(route)==='tools'&&route.segments[0]==='tools')bindToolFilters();
  if(route.segments[0]==='tool'){
    const id=decodeURIComponent(route.segments[1]||'');
    if(workbenchRegistry[id]&&route.params.get('mode')!=='quick'){
      const cleanup=workbenchRegistry[id].bind(document),old=routeCleanup;
      routeCleanup=()=>{old();cleanup?.();};
    }else bindTool(route);
  }
  if(route.segments[0]==='demo'){const mount=document.querySelector('#demo-mount');if(mount)routeCleanup=mountDemo(mount,decodeURIComponent(route.segments[1]||''));bindDemoLab(route);}
  if(route.segments[0]==='demos')bindDemoFilters();
  if(route.segments[0]==='case-note'){bindEmbeddedDemos();bindCaseNote(route);}
  if(route.segments[0]==='cheat-sheet'||route.segments[0]==='chapter')bindCheat(route);
  if(route.segments[0]==='references')bindReferenceFilters();
  if(route.segments[0]==='hardware')bindHardware(route);
  if(route.segments[0]==='pathway')bindPathway(route);
  if(route.segments[0]==='workspace')bindWorkspace();
  if(!route.segments.length){const cleanup=bindHomepage();const old=routeCleanup;routeCleanup=()=>{old();cleanup();};}
}
function bindToolFilters(){
  const cards=[...document.querySelectorAll('.tool-card')],input=document.querySelector('#tool-filter-search'),count=document.querySelector('#tool-count'),selects=[...document.querySelectorAll('[data-tool-filter]')];
  const update=()=>{const q=(input?.value||'').trim().toLowerCase();let shown=0;cards.forEach(card=>{const matches=selects.every(select=>select.value==='All'||card.dataset[select.dataset.toolFilter]===select.value);const visible=matches&&(!q||card.dataset.search.includes(q));card.hidden=!visible;if(visible)shown++;});count.textContent=`${shown} shown`;};
  input?.addEventListener('input',update);selects.forEach(select=>select.addEventListener('change',update));
  document.querySelectorAll('[data-tool-intent]').forEach(button=>button.addEventListener('click',()=>{const task=selects.find(select=>select.dataset.toolFilter==='task');if(task)task.value=button.dataset.toolIntent;update();document.querySelector('.tool-discovery')?.scrollIntoView({behavior:'smooth',block:'start'});}));
  document.querySelector('[data-action="clear-tool-filters"]')?.addEventListener('click',()=>{if(input)input.value='';selects.forEach(select=>select.value='All');update();});
  update();
}
function bindCheat(route){
  const input=document.querySelector('#chapter-filter'),cards=[...document.querySelectorAll('[data-chapter-search]')];
  input?.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();cards.forEach(card=>card.hidden=Boolean(q)&&!card.dataset.chapterSearch.includes(q));});
  const reviewedButton=document.querySelector('[data-action="chapter-reviewed"]');
  if(reviewedButton){const key='sau-reviewed-chapters-v1';let reviewed=[];try{reviewed=JSON.parse(localStorage.getItem(key)||'[]');}catch{}const id=reviewedButton.dataset.chapterId;if(reviewed.includes(id)){reviewedButton.classList.add('is-complete');reviewedButton.textContent='Chapter reviewed ✓';}reviewedButton.addEventListener('click',()=>{if(!reviewed.includes(id))reviewed.push(id);localStorage.setItem(key,JSON.stringify(reviewed));reviewedButton.classList.add('is-complete');reviewedButton.textContent='Chapter reviewed ✓';showToast('Chapter progress saved locally');});}
  const concept=route.params.get('concept');if(concept)setTimeout(()=>document.querySelector(`#concept-${CSS.escape(concept)}`)?.scrollIntoView({block:'start'}),40);
}

function bindDemoFilters(){const cards=[...document.querySelectorAll('[data-demo-search]')],input=document.querySelector('#demo-filter-search'),select=document.querySelector('#demo-topic-filter'),count=document.querySelector('#demo-count');const update=()=>{const q=(input?.value||'').trim().toLowerCase(),topic=select?.value||'All';let shown=0;cards.forEach(card=>{const visible=(topic==='All'||card.dataset.demoTopic===topic)&&(!q||card.dataset.demoSearch.includes(q));card.hidden=!visible;if(visible)shown++;});if(count)count.textContent=`${shown} labs`;};input?.addEventListener('input',update);select?.addEventListener('change',update);}

function bindDemoLab(route){const id=decodeURIComponent(route.segments[1]||''),demo=demos.find(item=>item.id===id);document.querySelector('[data-action="save-lab-observation"]')?.addEventListener('click',()=>{const a=document.querySelector('[data-lab-scenario="A"]')?.value.trim()||'',b=document.querySelector('[data-lab-scenario="B"]')?.value.trim()||'';if(!a&&!b){showToast('Record at least one observation first');return;}addEngineeringArtifact({type:'Physics lab comparison',title:demo?.title||id,route:location.hash,takeaway:b?`The changed scenario was recorded against the baseline: ${b}`:a,notes:`Scenario A: ${a||'Not recorded'}\nScenario B: ${b||'Not recorded'}`,assumptions:['Interactive teaching model; paired calculator and hardware-specific validity checks remain required.'],provenance:`Interactive demo · ${id}`});showToast('Lab comparison added to project');document.querySelector('.project-pill b').textContent=loadEngineeringProject().artifacts.length;});}

function bindCaseNote(route){const id=decodeURIComponent(route.segments[1]||''),note=caseNotes.find(item=>item.id===id);document.querySelector('[data-action="add-case-to-project"]')?.addEventListener('click',()=>{if(!note)return;addEngineeringArtifact({type:'Applied case note',title:note.title,route:location.hash,takeaway:note.summary,notes:`Tags: ${note.tags.join(', ')}`,provenance:`Case ${note.number} · Structural Acoustics, Understood`});showToast('Case note added to project');document.querySelector('.project-pill b').textContent=loadEngineeringProject().artifacts.length;});}

function bindReferenceFilters(){const input=document.querySelector('#reference-search'),select=document.querySelector('#reference-group-filter'),items=[...document.querySelectorAll('[data-reference-search]')],groups=[...document.querySelectorAll('[data-reference-group]')],count=document.querySelector('#reference-count');const update=()=>{const q=(input?.value||'').trim().toLowerCase(),group=select?.value||'All';let shown=0;items.forEach(item=>{const inGroup=group==='All'||item.closest('[data-reference-group]')?.dataset.referenceGroup===group;const visible=inGroup&&(!q||item.dataset.referenceSearch.includes(q));item.hidden=!visible;if(visible)shown++;});groups.forEach(section=>section.hidden=![...section.querySelectorAll('[data-reference-search]')].some(item=>!item.hidden));if(count)count.textContent=`${shown} sources`;};input?.addEventListener('input',update);select?.addEventListener('change',update);}

function bindHardware(route){const topic=hardwareTopics.find(item=>item.id===decodeURIComponent(route.segments[1]||''));document.querySelector('[data-action="start-hardware-project"]')?.addEventListener('click',()=>{if(!topic)return;const current=loadEngineeringProject();if(current.artifacts.length&&!confirm('Start a new hardware project? Existing project records will be replaced.'))return;const template=projectTemplates.find(item=>item.hardwareId===topic.id)??projectTemplates[0];const project=createEngineeringProject(template.id);project.name=`${topic.title} engineering study`;project.context.hardwareId=topic.id;saveEngineeringProject(project);location.hash='#/workspace';});}

function bindPathway(route){const pathway=learningPathways.find(item=>item.id===decodeURIComponent(route.segments[1]||''));document.querySelectorAll('[data-pathway-step]').forEach(input=>input.addEventListener('change',()=>{if(!pathway)return;const project=loadEngineeringProject(),completed=new Set(project.completedPathSteps[pathway.id]||[]),index=Number(input.dataset.pathwayStep);if(input.checked)completed.add(index);else completed.delete(index);project.completedPathSteps[pathway.id]=[...completed].sort((a,b)=>a-b);saveEngineeringProject(project);render();}));}

function bindWorkspace(){
  let project=loadEngineeringProject();
  const collect=()=>{document.querySelectorAll('[data-project-field]').forEach(field=>project[field.dataset.projectField]=field.value);document.querySelectorAll('[data-project-context]').forEach(field=>project.context[field.dataset.projectContext]=field.value);return project;};
  document.querySelector('[data-project-action="save"]')?.addEventListener('click',()=>{project=saveEngineeringProject(collect());showToast('Project context saved');render();});
  document.querySelector('[data-project-action="export-report"]')?.addEventListener('click',()=>downloadText(`${slug(project.name)}-engineering-report.txt`,engineeringProjectReport(collect())));
  document.querySelector('[data-project-action="export-json"]')?.addEventListener('click',()=>downloadText(`${slug(project.name)}-project.json`,JSON.stringify(saveEngineeringProject(collect()),null,2),'application/json;charset=utf-8'));
  document.querySelector('[data-project-action="import-json"]')?.addEventListener('click',()=>document.querySelector('[data-project-import]')?.click());
  document.querySelector('[data-project-import]')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{project=saveEngineeringProject(normalizeEngineeringProject(JSON.parse(await file.text())));render();}catch{showToast('Project JSON could not be imported');}});
  document.querySelectorAll('[data-remove-artifact]').forEach(button=>button.addEventListener('click',()=>{project.artifacts=project.artifacts.filter(artifact=>artifact.id!==button.dataset.removeArtifact);saveEngineeringProject(project);render();}));
}
function render(){
  routeCleanup();routeCleanup=()=>{};const route=routeInfo();let main;
  const [first]=route.segments;
  if(!first)main=renderHomepage({sections,tools:toolCatalog,demos});
  else if(first==='subject')main=renderSubjectPage(decodeURIComponent(route.segments[1]||''),{sections,tools:toolCatalog,demos,hardware:hardwareTopics,pathways:learningPathways});
  else if(first==='cheat-sheet'||first==='chapter')main=renderCheat(route);
  else if(first==='tools')main=renderTools(route);
  else if(first==='tool')main=renderTool(route);
  else if(first==='demos')main=renderDemos();
  else if(first==='demo')main=renderDemo(route);
  else if(first==='case-notes')main=renderCaseNotes();
  else if(first==='case-note')main=renderCaseNote(route);
  else if(first==='hardware')main=renderHardware(route);
  else if(first==='pathways'||first==='pathway')main=renderPathways(route);
  else if(first==='workspace')main=renderWorkspace();
  else if(first==='validation')main=renderValidation();
  else if(first==='references')main=renderReferences();
  else main=renderNotFound();
  document.body.classList.toggle('home-route',!first);
  document.body.classList.toggle('site-system-route',Boolean(first));
  document.body.classList.toggle('site-system-subject',first==='subject');
  document.body.classList.toggle('site-system-chapter',first==='cheat-sheet'||first==='chapter');
  document.body.classList.toggle('site-system-calculator',first==='tool'||first==='tools');
  document.body.classList.toggle('site-system-demo',first==='demo'||first==='demos');
  document.body.classList.toggle('site-system-article',first==='case-note'||first==='case-notes');
  document.body.classList.toggle('site-system-reference',first==='references');
  document.body.classList.toggle('site-system-hardware',first==='hardware');
  document.body.classList.toggle('site-system-pathway',first==='pathways'||first==='pathway');
  document.body.classList.toggle('site-system-workspace',first==='workspace');
  document.body.classList.toggle('site-system-validation',first==='validation');
  document.body.classList.toggle('site-system-workbench',first==='tool'&&Boolean(workbenchRegistry[decodeURIComponent(route.segments[1]||'')])&&route.params.get('mode')!=='quick');
  document.body.classList.toggle('site-system-capstone',first==='tool'&&decodeURIComponent(route.segments[1]||'')===LAUNCH_SEA_CAPSTONE_ID&&route.params.get('mode')!=='quick');
  app.innerHTML=shell(main,route);bindGlobal(route);
  window.scrollTo({top:0,behavior:'instant'});
  const subjectTitle=first==='subject'?subjectWheel.find(subject=>subject.id===decodeURIComponent(route.segments[1]||''))?.label:'';
  document.title=`${!first?'Structural Acoustics, Understood · Wheel of Acoustics':`${subjectTitle?`${subjectTitle} · `:first==='tool'&&toolById.get(route.segments[1])?`${toolById.get(route.segments[1]).title} · `:''}Structural Acoustics, Understood`}`;
}

window.addEventListener('hashchange',render);
window.addEventListener('keydown',e=>{
  const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
  else if(e.key==='/'&&!typing){e.preventDefault();openSearch();}
  else if(e.key==='Escape')document.querySelector('.search-dialog[open]')?.close();
});
window.addEventListener('sau:add-artifact',event=>{addEngineeringArtifact(event.detail||{});showToast('Workbench evidence added to engineering project');const badge=document.querySelector('.project-pill b');if(badge)badge.textContent=loadEngineeringProject().artifacts.length;});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
