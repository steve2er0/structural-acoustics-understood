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
import { lineChartSvg, rangeChartSvg, heatmapSvg, surface3dSvg, harmonicPhase, signedHeatColor, downloadCsv, downloadSvg, downloadText } from './charts.js';
import { demoPreviewSvg, mountDemo } from './demos.js';
import { engineeringResultToText } from './engineering-results.js';
import { homepageNavigation, homepageNavKey, renderHomepage, renderSubjectPage, bindHomepage, subjectWheel } from './homepage.js';
import { renderPageShell, renderBreadcrumbs, renderSectionHeader, renderCallout, renderLinkCollection } from './site-components.js';
import { renderLaunchSeaCapstone, bindLaunchSeaCapstone } from './launch-sea-capstone.js';
import { engineeringAnalysisIds, engineeringAnalysisRegistry, engineeringWorkbenchIds, engineeringWorkbenchRegistry } from './engineering-workbenches.js';
import { sorbothaneIsolationCalculator, sorbothaneIsolationWorkbench } from './sorbothane-isolation.js';
import { displayEngineeringResult, fromDisplayNumber, toDisplayNumber, toDisplayStep, toDisplayUnit, unitConversion } from './unit-system.js';
import {
  addEngineeringArtifact,
  classifyTool,
  engineeringProjectReport,
  environmentLibrary,
  handoffInputs,
  loadEngineeringProject,
  materialLibrary,
  normalizeEngineeringProject,
  projectTemplates,
  runValidationBenchmarks,
  saveEngineeringProject
} from './engineering-system.js';

const sections = [...baseSections, ...acs519Sections, ...workflowExpansionSections, ...programExpansionSections, ...seaParameterSections];
const calculatorRegistry = { ...baseCalculatorRegistry, ...extraCalculatorRegistry, ...acs519CalculatorRegistry, ...workflowExpansionCalculatorRegistry, ...programExpansionCalculatorRegistry, ...seaParameterCalculatorRegistry, 'sorbothane-isolation': sorbothaneIsolationCalculator };
const toolCatalog = [...baseToolCatalog, ...extraToolCatalog, ...acs519ToolCatalog, ...workflowExpansionToolCatalog, ...programExpansionToolCatalog, ...seaParameterToolCatalog];
const demos = [...baseDemos, ...acs519Demos, ...workflowExpansionDemos, ...programExpansionDemos, ...seaParameterDemos];
const caseNotes = [...baseCaseNotes, ...acs519CaseNotes, ...workflowExpansionCaseNotes, ...programExpansionCaseNotes, ...seaParameterCaseNotes];
const referenceGroups = [...baseReferenceGroups, ...acs519ReferenceGroups, ...workflowExpansionReferenceGroups, ...programExpansionReferenceGroups, ...seaParameterReferenceGroups];
const toolById = new Map(toolCatalog.map(t => [t.id, t]));
const sectionById = new Map(sections.map(section => [section.id, section]));
const demoById = new Map(demos.map(demo => [demo.id, demo]));
const generalToolSubject = { id: 'general', label: 'General Utilities', shortLabel: 'Utilities', accent: '#8fa8c2' };
const toolSubjects = [...subjectWheel, generalToolSubject];
const subjectToolSets = new Map(subjectWheel.map(subject => [subject.id, new Set([
  ...(subject.toolIds || []),
  ...subject.chapterIds.flatMap(id => (sectionById.get(id)?.concepts || []).map(concept => concept.toolId).filter(Boolean)),
  ...subject.demoIds.map(id => demoById.get(id)?.toolId).filter(Boolean)
])]));
const DESIGN_PROOF_CHAPTER_ID = 'shell-acoustics-deep-dive';
const DESIGN_PROOF_TOOL_ID = 'critical-frequency';
const LAUNCH_SEA_CAPSTONE_ID = 'launch-vibroacoustic-capstone';
const workbenchRegistry = {
  [LAUNCH_SEA_CAPSTONE_ID]: { render: () => renderLaunchSeaCapstone(), bind: root => bindLaunchSeaCapstone(root) },
  'sorbothane-isolation': sorbothaneIsolationWorkbench,
  ...engineeringWorkbenchRegistry,
  ...engineeringAnalysisRegistry
};
const guidedWorkbenchIds = [...engineeringWorkbenchIds, LAUNCH_SEA_CAPSTONE_ID, 'sorbothane-isolation'];
const toolProfile = tool => classifyTool(tool, guidedWorkbenchIds, engineeringAnalysisIds);
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
function fallbackToolSubjectId(tool){
  const text=`${tool.id} ${tool.title} ${tool.description} ${tool.category} ${(tool.keywords||[]).join(' ')}`.toLowerCase();
  if(tool.category==='Random & Shock'){
    if(/fatigue|damage|fds|duration/.test(text))return 'fatigue';
    if(/shock|srs|pyro|pulse/.test(text))return 'shock';
    return 'random-vibration';
  }
  return ({
    Acoustics:'acoustics','Noise Control':'acoustics',Dynamics:'dynamics',Structures:'structures-waves','Waves & Structures':'structures-waves',
    'Structural Acoustics':'structural-acoustics','Aero / Distributed Loads':'distributed-loads','SEA & Energy':'sea','Test & Signal':'measurement-test'
  })[tool.category]||'general';
}
function toolSubjectIds(tool){
  const direct=subjectWheel.filter(subject=>subjectToolSets.get(subject.id)?.has(tool.id)).map(subject=>subject.id);
  return direct.length?direct:[fallbackToolSubjectId(tool)];
}
function primaryToolSubject(tool){return toolSubjects.find(subject=>subject.id===toolSubjectIds(tool)[0])||generalToolSubject;}
function caseStudySubjects(study){return subjectWheel.filter(subject=>(subject.caseStudyIds||[]).includes(study.id));}
function caseStudyLinksForSection(section){
  const subject=subjectWheel.find(item=>item.chapterIds.includes(section.id));
  if(!subject)return [];
  return caseNotes.filter(study=>subject.caseStudyIds.includes(study.id)).slice(0,3).map(study=>({title:study.title,description:`Case ${study.number} · ${study.readTime} read`,href:`#/case-study/${encodeURIComponent(study.id)}`}));
}
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
  const groups=toolSubjects.map(subject=>({subject,tools:toolCatalog.filter(tool=>primaryToolSubject(tool).id===subject.id)})).filter(group=>group.tools.length);
  return `<div class="tools-menu" data-tools-menu><button type="button" class="tools-menu-trigger ${active?'active':''}" data-tools-toggle aria-expanded="false" aria-controls="tools-menu-panel">${icon('tools')}<span>Tools<small>Calculators & workbenches</small></span><b aria-hidden="true">⌄</b></button><div class="tools-menu-panel" id="tools-menu-panel" hidden><header><div><p class="eyebrow">Engineering tools</p><h2>Choose a model by subject.</h2></div><a class="tools-menu-all" href="#/tools">Browse all ${toolCatalog.length} tools <span aria-hidden="true">→</span></a></header><div class="tools-menu-grid">${groups.map(({subject,tools})=>`<section style="--menu-subject-color:${subject.accent}"><a class="tools-menu-category" href="#/tools?subject=${encodeURIComponent(subject.id)}"><strong>${esc(subject.label)}</strong><span>${tools.length} tools</span></a><div>${tools.slice(0,3).map(tool=>`<a href="#/tool/${encodeURIComponent(tool.id)}">${esc(tool.title)}</a>`).join('')}</div>${tools.length>3?`<a class="tools-menu-more" href="#/tools?subject=${encodeURIComponent(subject.id)}">View all ${tools.length} →</a>`:''}</section>`).join('')}</div></div></div>`;
}
function shell(main, route) {
  const active=navKey(route);
  const project=loadEngineeringProject();
  return `<header class="site-header">
    <a class="brand" href="#/">${brandMark()}<span class="brand-copy"><strong>Structural Acoustics</strong><small>Understood</small></span></a>
    <nav class="primary-nav" aria-label="Primary">${homepageNavigation.map(item=>item.id==='tools'?renderToolsMenu(active==='tools'):`<a href="${item.href}" class="${active===item.id?'active':''}" ${active===item.id?'aria-current="page"':''}><span>${item.label}</span><small>${item.descriptor}</small></a>`).join('')}</nav>
    <div class="header-actions"><a class="project-pill" href="#/workspace" aria-label="Open engineering project"><span>Project</span><b>${project.artifacts.length}</b></a><button class="icon-button header-search" data-action="search" aria-label="Search">${icon('search')}<span>Search</span></button><button class="icon-button header-print" data-action="print" aria-label="Print current page">${icon('print')}</button><button class="menu-button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button></div>
  </header>
  <main id="main-content">${main}</main>
  <footer class="site-footer"><div><strong>Structural Acoustics, Understood</strong><p>Original engineering reference and browser-based screening tools. Verify controlled methods before design or qualification use.</p></div><div class="footer-links"><a href="#/">Subjects</a><a href="#/demos">${demos.length} demos</a><a href="#/tools">${toolCatalog.length} tools</a><a href="#/case-studies">${caseNotes.length} case studies</a><a href="#/references">References</a><a href="#/workspace">Project</a><a href="#/validation">Validation</a><button class="link-button" data-action="print">Print / PDF</button></div></footer>
  ${searchDialog()}<div class="toast" role="status" aria-live="polite"></div>`;
}
function searchDialog(){return `<dialog class="search-dialog"><div class="search-shell"><div class="search-input-wrap">${icon('search')}<input id="global-search" type="search" placeholder="Search subjects, demos, tools, or case studies…" autocomplete="off" aria-label="Search engineering reference"/><button class="kbd-button" data-action="close-search">Esc</button></div><div class="search-facets" aria-label="Search result types"><button class="active" data-search-type="All">All</button>${['Subject','Demo','Tool','Case study','Chapter','Glossary'].map(type=>`<button data-search-type="${type}">${type}</button>`).join('')}</div><div class="search-results" id="search-results"></div></div></dialog>`;}
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

function renderChapterDirectory() {
  return `<div class="chapter-directory-toolbar"><label><span>Find a chapter</span><input id="chapter-filter" type="search" placeholder="Filter by concept, method, or physical behavior…"/></label><a class="button-secondary" href="#/case-studies">Browse applied case studies</a></div><div class="chapter-directory" id="chapter-directory">${sections.map(section=>`<a class="chapter-directory-card" href="#/cheat-sheet?section=${encodeURIComponent(section.id)}" data-chapter-search="${esc(`${section.title} ${section.summary} ${section.eyebrow} ${(section.concepts||[]).map(c=>`${c.title} ${(c.tags||[]).join(' ')}`).join(' ')}`.toLowerCase())}"><span>${esc(section.number)}</span><div><p class="eyebrow">${esc(section.eyebrow)}</p><h2>${esc(section.title)}</h2><p>${esc(section.summary)}</p><small>${section.concepts.length} concepts · ${chapterTools(section).length} linked tools</small></div><b aria-hidden="true">→</b></a>`).join('')}</div>`;
}

function renderCheat(route){
  const selectedId=route.segments[0]==='chapter'?decodeURIComponent(route.segments[1]||''):route.params.get('section');
  const selectedSection=sections.find(section=>section.id===selectedId);
  const breadcrumbs=renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Working reference',href:'#/cheat-sheet'},...(selectedSection?[{label:selectedSection.title}]:[])]);
  if(!selectedSection){
    const page=`${breadcrumbs}${intro({eyebrow:'The working reference',title:'Choose a chapter.<br>Follow the physics.',lede:'A focused library for structural dynamics, random vibration, shock, acoustics, shells, distributed loads, SEA, measurement, and launch-vehicle applications.',aside:'<p>Each chapter now opens as a deliberate learning sequence instead of loading the entire reference into one page.</p>',metrics:[{value:sections.length,label:'chapters'},{value:sections.reduce((count,section)=>count+section.concepts.length,0),label:'engineering concepts'},{value:toolCatalog.length,label:'linked tools'}],buttons:[{label:'Return to subjects',href:'#/'},{label:'Browse all tools',href:'#/tools',secondary:true}]})}${renderChapterDirectory()}`;
    return renderPageShell(page,{variant:'chapter-library'});
  }
  const proof=selectedSection.id===DESIGN_PROOF_CHAPTER_ID;
  const index=sections.indexOf(selectedSection);
  const tools=chapterTools(selectedSection);
  const studies=caseStudyLinksForSection(selectedSection);
  const deepDive=selectedSection.deepDiveId?{label:'Read the complete applied case study',href:`#/case-study/${encodeURIComponent(selectedSection.deepDiveId)}`}:null;
  const sequence=`<nav class="chapter-sequence" aria-label="Chapter learning sequence"><span><b>01</b>Build intuition</span><span><b>02</b>Read the equations</span><span><b>03</b>Use the models</span><span><b>04</b>Verify the limits</span></nav>`;
  const header=`<header class="section-heading site-section-header focused-chapter-header"><span class="section-number">${esc(selectedSection.number)}</span><div><p class="eyebrow">${esc(selectedSection.eyebrow)}</p><h1>${esc(selectedSection.title)}</h1><p>${esc(selectedSection.summary)}</p>${deepDive?`<a class="concept-tool-link site-inline-link" href="${esc(deepDive.href)}">${esc(deepDive.label)} <span aria-hidden="true">→</span></a>`:''}</div></header>`;
  const rail=`<aside class="section-rail chapter-local-rail" aria-label="Chapter navigation"><p class="rail-title">Chapter concepts</p>${selectedSection.concepts.map(concept=>`<a href="#/cheat-sheet?section=${encodeURIComponent(selectedSection.id)}&concept=${encodeURIComponent(slug(concept.title))}"><span>${String(selectedSection.concepts.indexOf(concept)+1).padStart(2,'0')}</span>${esc(concept.title)}</a>`).join('')}<a class="chapter-all-link" href="#/cheat-sheet">All ${sections.length} chapters</a></aside>`;
  const context=`<section class="site-context-grid chapter-context" aria-label="Chapter application context">${studies.length?renderLinkCollection({label:'Applied case studies',items:studies,variant:'related'}):''}${tools.length?renderLinkCollection({label:'Continue with a model',items:tools.slice(0,4),variant:'related'}):''}</section>`;
  const next=sections[index+1]??sections[0],previous=sections[index-1]??sections.at(-1);
  const footer=`<nav class="chapter-pagination" aria-label="Adjacent chapters"><a href="#/cheat-sheet?section=${encodeURIComponent(previous.id)}"><small>Previous chapter</small><strong>${esc(previous.title)}</strong></a><button type="button" data-action="chapter-reviewed" data-chapter-id="${esc(selectedSection.id)}">Mark chapter reviewed</button><a href="#/cheat-sheet?section=${encodeURIComponent(next.id)}"><small>Next chapter</small><strong>${esc(next.title)}</strong></a></nav>`;
  const content=`<section class="cheat-section site-chapter-section site-focused-chapter${proof?' site-design-proof-section':''}" id="section-${esc(selectedSection.id)}" data-section="${esc(selectedSection.id)}">${header}${sequence}${context}<div class="concept-grid site-concept-grid">${selectedSection.concepts.map(concept=>renderConceptCard(concept,proof)).join('')}</div>${footer}</section>`;
  const page=`${breadcrumbs}<div class="focused-chapter-layout">${rail}<div class="cheat-content">${content}</div></div>`;
  return renderPageShell(page,{variant:'focused-chapter'});
}
function toolCard(t,index){const profile=toolProfile(t),subject=primaryToolSubject(t);return `<a class="tool-card site-tool-card" href="#/tool/${encodeURIComponent(t.id)}" data-subject="${esc(subject.id)}" data-task="${esc(profile.task)}" data-input="${esc(profile.input)}" data-level="${esc(profile.level)}" data-search="${esc(`${t.title} ${t.description} ${(t.keywords||[]).join(' ')} ${subject.label} ${profile.task} ${profile.input}`.toLowerCase())}"><span class="tool-index">${String(index+1).padStart(2,'0')}</span><div class="tool-type-row"><span>${esc(profile.level)}</span>${profile.workbench?'<b>GUIDED</b>':profile.analysis?'<b>ANALYSIS</b>':''}</div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><footer><span>${esc(subject.label)} · ${esc(t.category)}</span><span class="arrow">→</span></footer></a>`;}
function renderTools(route){
  const profiles=toolCatalog.map(tool=>toolProfile(tool));
  const requestedSubject=route?.params?.get('subject');
  const legacyCategory=route?.params?.get('category');
  const legacySubject=legacyCategory?primaryToolSubject(toolCatalog.find(tool=>tool.category===legacyCategory)||{}).id:null;
  const selectedSubject=toolSubjects.some(subject=>subject.id===(requestedSubject||legacySubject))?(requestedSubject||legacySubject):'All';
  const options=(label,values,key,selected='All')=>`<label><span>${label}</span><select data-tool-filter="${key}"><option value="All" ${selected==='All'?'selected':''}>All</option>${[...new Set(values)].sort().map(value=>`<option value="${esc(value)}" ${selected===value?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
  const subjectOptions=`<label><span>Subject</span><select data-tool-filter="subject"><option value="All" ${selectedSubject==='All'?'selected':''}>All subjects</option>${toolSubjects.map(subject=>`<option value="${esc(subject.id)}" ${selectedSubject===subject.id?'selected':''}>${esc(subject.label)}</option>`).join('')}</select></label>`;
  const intents=[
    ['I have a PSD','Response & loads','Start with response, extremes, fatigue, or test planning.'],
    ['I need panel TL','Transmission & control','Move from mass law through coincidence and installed paths.'],
    ['I am planning a test','Test & validation','Build measurement, control, notching, and evidence.'],
    ['I need SEA parameters','SEA & energy','Inspect modal density, damping, coupling, and response recovery.']
  ];
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Engineering tools'}])}${intro({eyebrow:'Engineering tools',title:'Start with the subject.<br>Then choose the model.',lede:'Quick screens stay fast. Physics demos expose behavior. Guided workbenches preserve multi-step engineering decisions and evidence.',aside:'<p>Calculations run locally in the browser. Imported engineering data is not uploaded by this static application.</p>',metrics:[{value:toolCatalog.length,label:'tools'},{value:Object.keys(workbenchRegistry).length,label:'analysis workspaces'},{value:subjectWheel.length,label:'subjects'}],buttons:[{label:'Browse subjects',href:'#/'},{label:'Explore demos',href:'#/demos',secondary:true}]})}<section class="tool-intents" aria-label="Common engineering starting points">${intents.map(([title,task,description])=>`<button type="button" data-tool-intent="${esc(task)}"><strong>${esc(title)}</strong><span>${esc(description)}</span><b aria-hidden="true">→</b></button>`).join('')}</section><div class="tool-discovery" aria-label="Tool decision filters"><label class="tool-filter-search"><span>Search</span><input id="tool-filter-search" type="search" placeholder="Method, output, subject, or input…"/></label>${subjectOptions}${options('Engineering task',profiles.map(profile=>profile.task),'task')}${options('Available input',profiles.map(profile=>profile.input),'input')}${options('Tool depth',profiles.map(profile=>profile.level),'level')}<button type="button" class="button-quiet" data-action="clear-tool-filters">Clear</button><span id="tool-count" class="filter-count">${toolCatalog.length} shown</span></div><div class="tool-grid">${toolCatalog.map(toolCard).join('')}</div>`;
  return renderPageShell(page,{variant:'tool-library'});
}
function fieldHtml(field,value,unitSystem='SI'){
  const key=esc(field.key),displayUnit=toDisplayUnit(field.unit,unitSystem),label=`<label for="field-${key}">${esc(field.label)}${field.unit?`<span data-field-unit="${key}" data-native-unit="${esc(field.unit)}">${esc(displayUnit)}</span>`:''}</label>`;
  const convertible=field.type!=='textarea'&&unitConversion(field.unit),displayValue=convertible?toDisplayNumber(value,field.unit,unitSystem):value;
  const unitData=field.unit?` data-native-unit="${esc(field.unit)}"`:'';
  const visibilityData=field.visibleWhen?` data-visible-when="${esc(JSON.stringify(field.visibleWhen))}"`:'';
  const limit=(name,raw)=>raw!=null?`${name}="${esc(convertible?toDisplayNumber(raw,field.unit,unitSystem):raw)}"`:'';
  const displayStep=field.step!=null?toDisplayStep(field.step,field.unit,unitSystem):field.step;
  let control='';
  if(field.type==='select'){
    const options=(field.options||[]).map(option=>Array.isArray(option)?{value:option[0],label:option[1]}:option);
    const optionHtml=option=>`<option value="${esc(option.value)}" ${String(option.value)===String(value)?'selected':''}>${esc(option.label)}</option>`;
    const grouped=options.some(option=>option.group);
    let selectOptions;
    if(grouped){
      const groups=new Map(),ungrouped=[];
      for(const option of options){if(!option.group)ungrouped.push(option);else{if(!groups.has(option.group))groups.set(option.group,[]);groups.get(option.group).push(option);}}
      selectOptions=ungrouped.map(optionHtml).join('')+[...groups].map(([group,items])=>`<optgroup label="${esc(group)}">${items.map(optionHtml).join('')}</optgroup>`).join('');
    }else selectOptions=options.map(optionHtml).join('');
    const searchConfig=field.searchable?(typeof field.searchable==='object'?field.searchable:{}):null;
    const optionNoun=searchConfig?.noun||'options';
    const searchControl=searchConfig?`<div class="select-search-filter"><input id="field-${key}-search" type="search" data-select-search="${key}" aria-label="${esc(`Search ${field.label}`)}" aria-describedby="field-${key}-search-count" placeholder="${esc(searchConfig.placeholder||`Search ${field.label.toLowerCase()}…`)}" autocomplete="off"/><output id="field-${key}-search-count" data-select-search-count="${key}" data-option-noun="${esc(optionNoun)}" aria-live="polite">${options.length} ${esc(optionNoun)}</output></div>`:'';
    control=`${searchControl}<select id="field-${key}" data-key="${key}"${searchConfig?` data-searchable-select="${key}"`:''}${unitData}>${selectOptions}</select>`;
  }
  else if(field.type==='textarea')control=`<textarea id="field-${key}" data-key="${key}"${unitData} spellcheck="false">${esc(value)}</textarea><div class="field-file-row"><button type="button" class="button-quiet file-load" data-target="field-${key}">Load CSV / text</button><input class="file-input" type="file" accept=".csv,.txt,text/csv,text/plain" data-target="field-${key}" hidden/></div>`;
  else if(field.type==='range')control=`<input id="field-${key}" data-key="${key}"${unitData} type="range" value="${esc(displayValue)}" ${limit('min',field.min)} ${limit('max',field.max)} ${field.step!=null?`step="${esc(displayStep)}"`:''}/>`;
  else control=`<input id="field-${key}" data-key="${key}"${unitData} type="${field.type==='text'?'text':'number'}" value="${esc(displayValue)}" ${limit('min',field.min)} ${limit('max',field.max)} ${field.type==='number'?'step="any"':''}/>`;
  return `<div class="field-group"${visibilityData}>${label}${control}${field.help?`<div class="field-help">${esc(field.help)}</div>`:''}</div>`;
}
function fieldGroup(field){
  if(field.group)return field.group;
  const text=`${field.key} ${field.label}`.toLowerCase();
  if(/method|model|preset|material|boundary|condition|type|system|basis|standard|option|mode/.test(text)||field.type==='select')return 'Setup';
  if(/length|width|height|thickness|diameter|radius|area|volume|density|modulus|poisson|geometry|spacing|position|coordinate|mass/.test(text))return 'Geometry & material';
  if(/frequency|psd|force|pressure|power|level|velocity|acceleration|duration|temperature|flow|load|spectrum|signal|time history|damping/.test(text))return 'Excitation & environment';
  if(/points|samples|bins|bands|grid|step|seed|average|overlap|nfft|resolution|tolerance|iteration|modes/.test(text))return 'Numerical controls';
  return 'Model parameters';
}
function renderInputFields(fields,values,unitSystem){
  if(fields.length<=10)return fields.map(field=>fieldHtml(field,values[field.key],unitSystem)).join('');
  const groups=new Map();for(const field of fields){const group=fieldGroup(field);if(!groups.has(group))groups.set(group,[]);groups.get(group).push(field);}
  return [...groups].map(([name,items],index)=>`<details class="calc-input-group" data-input-group ${items.some(field=>field.groupOpen)||index<2?'open':''}><summary>${esc(name)} <span>${items.length}</span></summary><div>${items.map(field=>fieldHtml(field,values[field.key],unitSystem)).join('')}</div></details>`).join('');
}
function relevantReferences(category){
  const map={Acoustics:'Structural acoustics',Dynamics:'Structural dynamics','Random & Shock':'Random vibration and shock',Structures:'Structural dynamics','Waves & Structures':'Structural acoustics','Structural Acoustics':'Structural acoustics','Aero / Distributed Loads':'Aeroacoustics and distributed pressure','SEA & Energy':'SEA and high frequency','Test & Signal':'Signal processing and measurements','Noise Control':'Structural acoustics',Utilities:'Signal processing and measurements'};
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
  const profile=toolProfile(meta);
  const subject=primaryToolSubject(meta);
  const project=loadEngineeringProject();
  const unitSystem=route.params.get('units')==='English'||(!route.params.has('units')&&/english|imperial/i.test(project.context?.units||''))?'English':'SI';
  const projectHandoff=route.params.get('fromProject')==='1'?handoffInputs(id):null;
  const values={};for(const field of calc.inputs||[])values[field.key]=route.params.has(field.key)?route.params.get(field.key):(projectHandoff?.inputs&&Object.hasOwn(projectHandoff.inputs,field.key)?projectHandoff.inputs[field.key]:field.default);
  const refs=calc.references?.length?calc.references:relevantReferences(meta.category);
  const concepts=conceptLinksForTool(id);
  const contextLinks=calc.relatedLinks?.length?calc.relatedLinks:(concepts.length?concepts:calculatorRelatedLinks);
  const breadcrumbs=renderBreadcrumbs([{label:'Tools',href:'#/tools'},{label:subject.label,href:`#/tools?subject=${encodeURIComponent(subject.id)}`},{label:meta.title}]);
  const context=`<section class="site-context-grid calculator-context-grid" aria-label="Calculator context">${renderLinkCollection({label:'Related concepts',items:contextLinks,variant:'related'})}</section>`;
  const assumptionRule=renderCallout({tone:'assumption',label:'Use rule',body:'A polished numerical result does not expand the validity of its governing model.'});
  const provenance=`<aside class="model-provenance"><p class="eyebrow">Model provenance</p><dl><div><dt>Tool depth</dt><dd>${esc(profile.level)}</dd></div><div><dt>Engineering task</dt><dd>${esc(profile.task)}</dd></div><div><dt>Primary subject</dt><dd>${esc(subject.label)}</dd></div><div><dt>Expected input</dt><dd>${esc(profile.input)}</dd></div></dl></aside>`;
  const handoffBanner=projectHandoff?renderCallout({tone:'warning',label:'Project handoff applied',body:`Matching field keys were transferred from ${projectHandoff.source}. Confirm units, statistical basis, frequency convention, and physical meaning before accepting the imported values.`}):'';
  const unitControl=`<label class="unit-system-control"><span>Display units</span><select data-unit-system><option value="SI" ${unitSystem==='SI'?'selected':''}>SI</option><option value="English" ${unitSystem==='English'?'selected':''}>English</option></select><small>Input fields, result values, plot axes, and recognized table columns convert without changing the native model. Pasted spectra and governing equations retain their labeled units.</small></label>`;
  const page=`${breadcrumbs}${handoffBanner}<section class="tool-hero site-page-header"><div class="tool-hero-copy"><p class="eyebrow">${esc(subject.label)} · ${esc(profile.level)}</p><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p></div><aside class="tool-status site-status-panel"><dl><dt>Basis</dt><dd>${esc(calc.basis||'Documented engineering relation')}</dd><dt>Result</dt><dd>${esc(calc.confidence||'Screening calculation')}</dd><dt>Subject</dt><dd>${esc(subject.label)}</dd><dt>Execution</dt><dd>Local browser</dd></dl></aside></section>${context}<div class="calculator-layout site-calculator-container"><section class="calc-panel site-calculator-panel"><header class="calc-panel-header site-panel-header"><h2>Inputs</h2><button class="button-quiet" data-action="reset-calculator">Reset</button></header><form class="calc-form" id="calculator-form">${unitControl}${renderInputFields(calc.inputs||[],values,unitSystem)}<div class="calc-form-actions"><button class="button" type="submit">Calculate</button><button class="button-secondary" type="button" data-action="share-calculation">Copy share link</button></div></form></section><section class="calc-panel site-calculator-panel"><header class="calc-panel-header site-panel-header"><h2>Results</h2><div><button class="button-quiet" data-action="copy-results">Copy engineering result</button><button class="button-quiet" data-action="print">Print / PDF</button></div></header><div class="calc-results" id="calculator-results"><div class="calc-empty">Enter values and calculate.</div></div></section></div><section class="tabs site-tabs"><div class="tab-list" role="tablist"><button class="tab-button active" data-tab="theory" role="tab">Theory</button><button class="tab-button" data-tab="example" role="tab">Worked example</button><button class="tab-button" data-tab="assumptions" role="tab">Assumptions</button><button class="tab-button" data-tab="references" role="tab">References & provenance</button></div><div class="tab-panel site-theory-panel" id="tab-panel"><h2>Governing model</h2>${calc.theory||'<p>This calculator implements the documented governing relationship shown in the cheat sheet.</p>'}<h3>Inputs and units</h3><div class="variable-table">${(calc.inputs||[]).map(f=>`<div>${esc(f.key)}</div><div>${esc(f.label)}${f.unit?` · ${esc(f.unit)}`:''}</div>`).join('')}</div></div><template id="tab-theory"><h2>Governing model</h2>${calc.theory||''}<h3>Inputs and units</h3><div class="variable-table">${(calc.inputs||[]).map(f=>`<div>${esc(f.key)}</div><div>${esc(f.label)}${f.unit?` · ${esc(f.unit)}`:''}</div>`).join('')}</div></template><template id="tab-example"><h2>Worked example</h2><p>${esc(calc.example||'Load the defaults and compare the reported primary result with a hand calculation using the governing equation.')}</p><p><a class="concept-tool-link site-inline-link" href="#/cheat-sheet">Open the linked cheat-sheet context <span aria-hidden="true">→</span></a></p></template><template id="tab-assumptions"><h2>Assumptions and validity</h2><ul>${(calc.assumptions||['Linear response and consistent units.']).map(a=>`<li>${esc(a)}</li>`).join('')}</ul>${assumptionRule}</template><template id="tab-references"><h2>References for this topic</h2><ul class="reference-list">${refs.map(r=>`<li><strong>${esc(r.title)}</strong><span>${esc(r.note)}</span></li>`).join('')}</ul>${provenance}<p>Also verify the controlled analysis method, handbook revision, material data, and program-specific statistical convention used by the actual deliverable.</p></template></section>`;
  const pageWithRelatedConceptsBelowTool=`${page.replace(context,'')}${context}`;
  return renderPageShell(pageWithRelatedConceptsBelowTool,{variant:proof?'calculator-proof':''});
}
function renderDemos(){const topics=[...new Set(demos.map(d=>d.topic))].sort();const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Interactive demos'}])}${intro({eyebrow:'Interactive physics',title:'Form a hypothesis.<br>Move the variables.',lede:'The shared lab format connects physical behavior to limiting cases, scenario comparisons, paired tools, and a state-aware engineering takeaway.',aside:'<p>Use demos for exploration, tools for numerical screening, and case studies for applied engineering judgment.</p>',metrics:[{value:demos.length,label:'physics labs'},{value:topics.length,label:'topics'},{value:subjectWheel.length,label:'subjects'}],buttons:[{label:'Browse subjects',href:'#/'},{label:'Open engineering tools',href:'#/tools',secondary:true}]})}<div class="demo-discovery"><label><span>Filter labs</span><input id="demo-filter-search" type="search" placeholder="Resonance, SEA, shock, radiation…"/></label><label><span>Topic</span><select id="demo-topic-filter"><option value="All">All topics</option>${topics.map(topic=>`<option value="${esc(topic)}">${esc(topic)}</option>`).join('')}</select></label><span id="demo-count">${demos.length} labs</span></div><div class="demo-grid">${demos.map(d=>`<a class="demo-card site-demo-card" href="#/demo/${encodeURIComponent(d.id)}" data-demo-topic="${esc(d.topic)}" data-demo-search="${esc(`${d.title} ${d.description} ${d.topic}`.toLowerCase())}"><div class="demo-preview">${demoPreviewSvg(d.id)}</div><div class="demo-card-copy"><p class="eyebrow">${esc(d.topic)} · Physics lab</p><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p><span class="concept-tool-link site-inline-link">Open lab →</span></div></a>`).join('')}</div>`;return renderPageShell(page,{variant:'demo-library'});}
function demoLabPrompts(d){
  const text=`${d.id} ${d.topic}`.toLowerCase();
  if(/sea|energy|coupling/.test(text))return ['Start with weak coupling and equal damping.','Increase coupling until subsystem energies converge.','Identify the assumption that fails first at low modal population.'];
  if(/shock|srs|random|psd|fatigue/.test(text))return ['Establish a low-severity baseline.','Change duration, damping, or bandwidth one at a time.','Compare RMS, extreme, shock, and fatigue conclusions.'];
  if(/wave|coincidence|radiation|shell|panel/.test(text))return ['Locate the long-wavelength limiting regime.','Move through the matching or coincidence region.','Compare the finite-structure behavior with the asymptotic expectation.'];
  return ['Establish the nominal configuration.','Change one physically meaningful parameter at a time.','Record the mechanism controlling the observed change.'];
}
function renderDemo(route){const id=decodeURIComponent(route.segments[1]||''),d=demos.find(x=>x.id===id);if(!d)return renderNotFound('Demo not found','The requested interactive demonstration is not in this build.');const prompts=demoLabPrompts(d);const page=`${renderBreadcrumbs([{label:'Demos',href:'#/demos'},{label:d.topic},{label:d.title}])}<section class="tool-hero site-page-header"><div class="tool-hero-copy"><p class="eyebrow">${esc(d.topic)} · Interactive physics lab</p><h1>${esc(d.title)}</h1><p>${esc(d.description)}</p><div class="button-row"><a class="button" href="#/tool/${encodeURIComponent(d.toolId)}">Open paired calculator</a><a class="button-secondary" href="#/demos">All demos</a></div></div><aside class="tool-status site-status-panel"><dl><dt>Question</dt><dd>What mechanism controls the trend?</dd><dt>Method</dt><dd>Hypothesis → variation → comparison</dd><dt>Continue</dt><dd>Tool → applied case study</dd></dl></aside></section><section class="lab-guide" aria-label="Engineering lab guide"><div><p class="eyebrow">Hypothesis</p><h2>Predict before moving the controls.</h2><p>${esc(`If the controlling ${d.topic.toLowerCase()} mechanism is represented correctly, a one-at-a-time parameter change should produce a physically explainable trend rather than only a new number.`)}</p></div><ol>${prompts.map((prompt,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span>${esc(prompt)}</li>`).join('')}</ol></section><section class="demo-stage site-demo-container" id="demo-mount"></section>`;return renderPageShell(page,{variant:'demo'});}
function renderCaseStudies(route){
  const requested=route?.params?.get('subject');
  const selected=subjectWheel.some(subject=>subject.id===requested)?requested:'All';
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Case studies'}])}${intro({eyebrow:'Case studies & articles',title:'Where the equation<br>meets the messy system.',lede:'Applied engineering stories about the assumptions, judgment calls, measurements, and cross-checks that change a structural-acoustic conclusion.',aside:'<p>Use subjects to learn the physics, demos to explore behavior, tools to calculate, and these cases to see how real decisions get complicated.</p>',metrics:[{value:caseNotes.length,label:'case studies'},{value:subjectWheel.length,label:'subjects'},{value:'Applied',label:'engineering judgment'}],buttons:[{label:'Browse subjects',href:'#/'},{label:'Explore demos',href:'#/demos',secondary:true}]})}<div class="case-study-discovery"><label><span>Find a case study</span><input id="case-study-search" type="search" placeholder="Assumption, method, failure mode, or result…"/></label><label><span>Subject</span><select id="case-study-subject-filter"><option value="All" ${selected==='All'?'selected':''}>All subjects</option>${subjectWheel.map(subject=>`<option value="${esc(subject.id)}" ${selected===subject.id?'selected':''}>${esc(subject.label)}</option>`).join('')}</select></label><span id="case-study-count">${caseNotes.length} cases</span></div><div class="case-grid">${caseNotes.map(study=>{const subjects=caseStudySubjects(study);return `<a class="case-card site-case-card" href="#/case-study/${encodeURIComponent(study.id)}" data-case-subjects="${esc(subjects.map(subject=>subject.id).join(' '))}" data-case-search="${esc(`${study.title} ${study.summary} ${study.tags.join(' ')} ${subjects.map(subject=>subject.label).join(' ')}`.toLowerCase())}"><span class="case-number">CASE ${esc(study.number)} · ${esc(subjects[0]?.shortLabel||'Applied')}</span><h3>${esc(study.title)}</h3><p>${esc(study.summary)}</p><div class="card-meta">${subjects.slice(0,2).map(subject=>`<span class="tag">${esc(subject.shortLabel)}</span>`).join('')}${study.tags.slice(0,2).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')}</div><footer>${esc(study.readTime)} read →</footer></a>`;}).join('')}</div>`;
  return renderPageShell(page,{variant:'case-library'});
}
function renderCaseStudy(route){const id=decodeURIComponent(route.segments[1]||''),study=caseNotes.find(item=>item.id===id);if(!study)return renderNotFound('Case study not found','The requested engineering article is not in this build.');const subjects=caseStudySubjects(study);const page=`<article class="article-shell site-article-shell">${renderBreadcrumbs([{label:'Case studies',href:'#/case-studies'},{label:`Case ${study.number}`}])}<header class="article-header"><p class="eyebrow">Applied engineering · Case ${esc(study.number)}</p><h1>${esc(study.title)}</h1><p class="lede">${esc(study.summary)}</p><div class="article-meta"><span>${esc(study.readTime)} read</span>${subjects.map(subject=>`<span>${esc(subject.shortLabel)}</span>`).join('')}${study.tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><div class="button-row"><button type="button" class="button-secondary" data-action="add-case-to-project" data-case-id="${esc(study.id)}">Add case to project</button><a class="button-secondary" href="#/case-studies">All case studies</a></div></header><div class="article-body">${study.body}</div></article>`;return renderPageShell(page,{variant:'article'});}

function renderWorkspace(){
  const project=loadEngineeringProject();
  const template=projectTemplates.find(item=>item.id===project.templateId)||projectTemplates[0];
  const artifacts=project.artifacts.length?project.artifacts.map((artifact,index)=>`<article class="project-artifact"><header><div><span>${String(index+1).padStart(2,'0')} · ${esc(artifact.type)}</span><h3>${esc(artifact.title)}</h3></div><button type="button" class="button-quiet" data-remove-artifact="${esc(artifact.id)}">Remove</button></header><p>${esc(artifact.takeaway||'No takeaway recorded.')}</p><dl><div><dt>Validity</dt><dd>${esc(artifact.validity||'Not recorded')}</dd></div><div><dt>Source</dt><dd>${artifact.route?`<a href="${esc(artifact.route)}">Open record</a>`:'Not recorded'}</dd></div><div><dt>Warnings</dt><dd>${artifact.warnings.length}</dd></div><div><dt>Saved</dt><dd>${esc(new Date(artifact.createdAt).toLocaleString())}</dd></div></dl></article>`).join(''):'<div class="project-empty"><h3>No engineering records yet.</h3><p>Add a case study or save a workbench step.</p><a class="button-secondary" href="#/tools">Browse tools</a></div>';
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
  const page=`${renderBreadcrumbs([{label:'Home',href:'#/'},{label:'Assumptions and references'}])}${intro({eyebrow:'Methodology and source trail',title:'Know where the model<br>came from.',lede:'Searchable references, nomenclature, unit conventions, verification principles, and calculator limitations are part of the engineering record.',aside:'<p>Source provenance distinguishes exact theory, empirical relationships, screening approximations, and configuration-specific evidence.</p>',metrics:[{value:referenceGroups.length,label:'reference groups'},{value:allItems,label:'source records'},{value:glossary.length,label:'defined terms'}],buttons:[{label:'Verification center',href:'#/validation'},{label:'Print this page',action:'print',secondary:true}]})}<div class="reference-filterbar"><label><span>Search title, note, method, or topic</span><input id="reference-search" type="search" placeholder="SEA reciprocity, Corcos, transmission loss…"/></label><label><span>Source group</span><select id="reference-group-filter"><option value="All">All reference groups</option>${referenceGroups.map(group=>`<option value="${esc(group.group)}">${esc(group.group)}</option>`).join('')}</select></label><span id="reference-count">${allItems} sources</span></div><div class="reference-layout site-reference-layout"><nav class="reference-nav" aria-label="Reference sections"><a href="#/references?anchor=reference-method">Methodology</a>${referenceGroups.map(group=>`<a href="#/references?anchor=${encodeURIComponent(`reference-${slug(group.group)}`)}">${esc(group.group)}</a>`).join('')}<a href="#/references?anchor=reference-glossary">Glossary</a></nav><div>${method}${groups}${glossarySection}</div></div>`;
  return renderPageShell(page,{variant:'references'});
}
function renderNotFound(title='Page not found',text='That route does not exist.'){return renderPageShell(`<div class="not-found"><div><p class="eyebrow">404</p><h1>${esc(title)}</h1><p class="lede">${esc(text)}</p><div class="button-row"><a class="button" href="#/cheat-sheet">Open cheat sheet</a><a class="button-secondary" href="#/tools">Browse tools</a></div></div></div>`,{variant:'not-found'});}

function collectForm(form){const values={},system=form.querySelector('[data-unit-system]')?.value||'SI';form.querySelectorAll('[data-key]').forEach(el=>values[el.dataset.key]=el.matches('input[type="number"],input[type="range"]')?fromDisplayNumber(el.value,el.dataset.nativeUnit,system):el.value);return values;}
function bindSearchableSelects(form){
  const bindings=[...form.querySelectorAll('[data-select-search]')].map(input=>{
    const key=input.dataset.selectSearch,select=form.querySelector(`[data-searchable-select="${CSS.escape(key)}"]`),status=form.querySelector(`[data-select-search-count="${CSS.escape(key)}"]`);if(!select||!status)return null;
    const noun=status.dataset.optionNoun||'options',source=[...select.options].map(option=>({option:option.cloneNode(true),group:option.parentElement?.tagName==='OPTGROUP'?option.parentElement.label:''}));
    const render=()=>{
      const selected=select.value,terms=input.value.trim().toLowerCase().split(/\s+/).filter(Boolean),matches=source.filter(item=>{const haystack=`${item.option.value} ${item.option.textContent} ${item.group}`.toLowerCase();return terms.every(term=>haystack.includes(term));}),visible=terms.length?source.filter(item=>matches.includes(item)||item.option.value===selected):source,fragment=document.createDocumentFragment(),groups=new Map();
      visible.forEach(item=>{if(!item.group)fragment.append(item.option.cloneNode(true));else{if(!groups.has(item.group)){const group=document.createElement('optgroup');group.label=item.group;groups.set(item.group,group);fragment.append(group);}groups.get(item.group).append(item.option.cloneNode(true));}});
      select.replaceChildren(fragment);select.value=selected;status.textContent=terms.length?`${matches.length} matching ${noun}`:`${source.length} ${noun}`;
    };
    const onInput=()=>render(),onChange=()=>{input.value='';render();},onKeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();select.focus();}else if(event.key==='Escape'&&input.value){input.value='';render();}};
    input.addEventListener('input',onInput);input.addEventListener('keydown',onKeydown);select.addEventListener('change',onChange);render();
    return{input,render,cleanup:()=>{input.removeEventListener('input',onInput);input.removeEventListener('keydown',onKeydown);select.removeEventListener('change',onChange);}};
  }).filter(Boolean);
  return{reset:()=>bindings.forEach(binding=>{binding.input.value='';binding.render();}),cleanup:()=>bindings.forEach(binding=>binding.cleanup())};
}
function renderTable(table,{primary=false,index=-1}={}){const cell=(value,column)=>{if(typeof value==='string'&&/^https:\/\//i.test(value))return `<a href="${esc(value)}" target="_blank" rel="noreferrer">Open source</a>`;return esc(column===0&&typeof value==='string'?value:formatNumber(value));};return `<div class="result-block${primary?' result-block-primary':''}" data-result-section="table"${index>=0?` data-table="${index}"`:''}><h3>${esc(table.title||'Results table')}</h3><div class="table-wrap"><table><thead><tr>${(table.columns||[]).map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(table.rows||[]).map(row=>`<tr>${row.map((value,column)=>`<td>${cell(value,column)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;}
function initialChartTraceIndices(plot){
  const traces=plot.traces||[];
  if(!plot.traceSelector)return traces.map((_,index)=>index);
  if(plot.traceSelector.initial==='emphasis'){
    const emphasized=traces.map((trace,index)=>trace.emphasis?index:-1).filter(index=>index>=0);
    if(emphasized.length)return emphasized;
  }
  return traces.map((_,index)=>index);
}
function chartPlotForIndices(plot,indices){
  const active=new Set(indices);
  return {...plot,traces:(plot.traces||[]).map((trace,index)=>({...trace,sourceIndex:index})).filter(trace=>active.has(trace.sourceIndex))};
}
function renderResult(result,meta){
  const valueHtml=s=>`<div class="result-stat ${esc(s.tone||s.status||'')}"><small>${esc(s.label)}</small><strong>${esc(formatNumber(s.value))}</strong>${s.unit?`<span class="unit">${esc(s.unit)}</span>`:''}${s.note?`<div class="field-help">${esc(s.note)}</div>`:''}</div>`;
  const primaryValueCount=result.presentation?.primaryValueCount||Math.min(6,result.values.length);
  const primaryValues=result.values.slice(0,primaryValueCount).map(valueHtml).join('');
  const supportingValues=result.values.slice(primaryValueCount).map(valueHtml).join('');
  const assumptions=result.assumptions.satisfied.map(item=>`<li>${esc(item)}</li>`).join('');
  const limitations=result.assumptions.limitations.map(item=>`<li>${esc(item)}</li>`).join('');
  const alerts=result.assumptions.alerts.map(item=>`<li>${esc(item)}</li>`).join('');
  const assumptionCard=`<article class="commentary-card commentary-card-wide"><h3>Model assumptions</h3><ul class="commentary-list assumption-list">${assumptions}</ul>${limitations?`<h4>Model limitations</h4><ul class="commentary-list limitation-list">${limitations}</ul>`:''}</article>`;
  const alertBlock=alerts?`<section class="result-alerts" aria-label="Active result alerts"><h3>Active alerts</h3><ul>${alerts}</ul></section>`:'';
  const commentary=`<section class="engineering-commentary" data-result-section="explanation" aria-label="Engineering commentary"><article class="commentary-lead"><p class="commentary-label">Engineering interpretation</p><p>${esc(result.interpretation.summary)}</p><h3>Physical meaning</h3><p>${esc(result.interpretation.physicalMeaning)}</p></article>${alertBlock}<div class="commentary-grid">${assumptionCard}</div></section>`;
  const renderPlot=(p,i,primary=false)=>{
    const initialIndices=initialChartTraceIndices(p),svg=lineChartSvg(chartPlotForIndices(p,initialIndices));
    const selector=p.traceSelector&&p.traces?.length>1?`<fieldset class="chart-trace-selector" data-chart-trace-selector="${i}"><legend>${esc(p.traceSelector.label||'Curves to display')}</legend><div class="chart-trace-options">${p.traces.map((trace,index)=>`<label><input type="checkbox" data-chart-trace-option="${index}" ${initialIndices.includes(index)?'checked':''}/><span>${esc(trace.name||`Trace ${index+1}`)}</span></label>`).join('')}</div><div class="chart-trace-actions"><button type="button" class="button-quiet" data-chart-trace-all>Show all</button><button type="button" class="button-quiet" data-chart-trace-current>Current only</button></div><small>Choose one or more curves. The axes rescale to the visible response curves.</small></fieldset>`:'';
    return `<div class="result-block${primary?' result-block-primary':''}" data-result-section="plot">${selector}<div class="chart-toolbar"><button data-chart-data="${i}">View data</button><button data-chart-csv="${i}">Download CSV</button><button data-chart-svg="${i}">Download SVG</button><button data-chart-png="${i}">Download PNG</button></div><div class="chart-shell site-chart-container" data-chart="${i}">${svg}</div><div class="chart-data-panel" data-chart-data-panel="${i}" hidden></div></div>`;
  };
  const renderRangeChart=(chart,i,primary=false)=>`<div class="result-block result-range-chart${primary?' result-block-primary':''}" data-result-section="range-chart"><div class="chart-toolbar"><button data-range-chart-svg="${i}">Download SVG</button><button data-range-chart-png="${i}">Download PNG</button></div><div class="chart-shell site-chart-container" data-range-chart="${i}">${rangeChartSvg(chart)}</div></div>`;
  const renderHeatmap=(h,i,primary=false)=>`<div class="result-block${primary?' result-block-primary':''}" data-result-section="heatmap"><div class="chart-toolbar"><button data-heatmap-svg="${i}">Download SVG</button><button data-heatmap-png="${i}">Download PNG</button></div><div class="chart-shell site-chart-container" data-heatmap="${i}">${heatmapSvg(h)}</div></div>`;
  const renderSurface3d=(surface,i,primary=false)=>`<div class="result-block${primary?' result-block-primary':''}" data-result-section="surface3d"><div class="chart-toolbar"><button data-surface3d-svg="${i}">Download SVG</button><button data-surface3d-png="${i}">Download PNG</button></div><div class="chart-shell surface3d-shell site-chart-container" data-surface3d="${i}">${surface3dSvg(surface)}</div></div>`;
  const renderSchematic=(schematic,i,primary=false)=>`<div class="result-block result-schematic${primary?' result-block-primary':''}" data-result-section="schematic"><div class="chart-toolbar"><button data-schematic-svg="${i}">Download SVG</button><button data-schematic-png="${i}">Download PNG</button></div><div class="engineering-schematic site-chart-container" data-schematic="${i}">${schematic.svg||''}</div></div>`;
  const evidence=result.presentation?.primaryEvidence;
  const explicitEvidenceStack=Array.isArray(result.presentation?.primaryEvidenceStack)&&result.presentation.primaryEvidenceStack.length>1;
  const evidenceStack=explicitEvidenceStack?result.presentation.primaryEvidenceStack:(evidence?[evidence]:[]);
  const animation=result.presentation?.animation;
  const animationControls=animation?.type==='harmonic'?`<section class="mode-animation-panel" data-mode-animation data-default-rate="${animation.defaultRateHz}"><div class="mode-animation-copy"><p class="eyebrow">Harmonic mode animation</p><p>${esc(animation.note)}</p></div><div class="mode-animation-actions"><button type="button" class="button-secondary" data-mode-animation-toggle aria-pressed="true">Pause</button><label><span>Visual speed</span><select data-mode-animation-rate><option value="0.25">Slow</option><option value="0.5" ${animation.defaultRateHz===.5?'selected':''}>Normal</option><option value="1">Fast</option></select></label><button type="button" class="button-quiet" data-mode-animation-reset>Reset</button><output data-mode-animation-phase aria-hidden="true">+1.00 phase</output><span class="sr-only" data-mode-animation-status aria-live="polite"></span></div></section>`:'';
  const primaryHeatmapIndices=new Set();
  const primarySurfaceIndices=new Set();
  const primarySchematicIndices=new Set();
  const primaryPlotIndices=new Set();
  const primaryRangeChartIndices=new Set();
  const primaryTableIndices=new Set();
  const renderPrimarySelection=(selection,selectionIndex)=>{
    const defaultCount=!explicitEvidenceStack&&selectionIndex===0?result.presentation?.primaryEvidenceCount||1:1;
    const count=Math.max(1,selection.count||defaultCount);
    if(selection.type==='plot'&&result.plots?.[selection.index]){primaryPlotIndices.add(selection.index);return renderPlot(result.plots[selection.index],selection.index,true);}
    if(selection.type==='rangeChart'&&result.rangeCharts?.[selection.index]){primaryRangeChartIndices.add(selection.index);return renderRangeChart(result.rangeCharts[selection.index],selection.index,true);}
    if(selection.type==='heatmap'&&result.heatmaps?.[selection.index]){
      const indices=result.heatmaps.map((_,index)=>index).slice(selection.index,selection.index+count);indices.forEach(index=>primaryHeatmapIndices.add(index));
      const maps=indices.map(index=>renderHeatmap(result.heatmaps[index],index,true)).join('');return indices.length>1?`<div class="result-evidence-grid" aria-label="Primary mode-shape plots">${maps}</div>`:maps;
    }
    if(selection.type==='surface3d'&&result.surfaces3d?.[selection.index]){
      const indices=result.surfaces3d.map((_,index)=>index).slice(selection.index,selection.index+count);indices.forEach(index=>primarySurfaceIndices.add(index));
      const surfaces=indices.map(index=>renderSurface3d(result.surfaces3d[index],index,true)).join('');return indices.length>1?`<div class="result-evidence-grid result-evidence-grid-3d" aria-label="Primary 3D mode shapes">${surfaces}</div>`:surfaces;
    }
    if(selection.type==='schematic'&&result.schematics?.[selection.index]){primarySchematicIndices.add(selection.index);return renderSchematic(result.schematics[selection.index],selection.index,true);}
    if(selection.type==='table'&&result.tables?.[selection.index]){primaryTableIndices.add(selection.index);return renderTable(result.tables[selection.index],{primary:true,index:selection.index});}
    return'';
  };
  const primaryEvidenceParts=evidenceStack.map(renderPrimarySelection);
  const primaryEvidence=primaryEvidenceParts.length>1&&evidenceStack.every(item=>item.type==='rangeChart')?`<div class="result-range-chart-grid" aria-label="Primary capability ranges">${primaryEvidenceParts.join('')}</div>`:primaryEvidenceParts.join('');
  const supportingPlots=(result.plots||[]).map((plot,index)=>primaryPlotIndices.has(index)?'':renderPlot(plot,index)).join('');
  const supportingRangeCharts=(result.rangeCharts||[]).map((chart,index)=>primaryRangeChartIndices.has(index)?'':renderRangeChart(chart,index)).join('');
  const supportingHeatmaps=(result.heatmaps||[]).map((heatmap,index)=>primaryHeatmapIndices.has(index)?'':renderHeatmap(heatmap,index)).join('');
  const supportingSurfaces=(result.surfaces3d||[]).map((surface,index)=>primarySurfaceIndices.has(index)?'':renderSurface3d(surface,index)).join('');
  const supportingSchematics=(result.schematics||[]).map((schematic,index)=>primarySchematicIndices.has(index)?'':renderSchematic(schematic,index)).join('');
  const supportingTables=(result.tables||[]).map((table,index)=>primaryTableIndices.has(index)?'':renderTable(table,{index})).join('');
  const supportingEvidence=`${supportingSchematics}${supportingSurfaces}${supportingPlots}${supportingRangeCharts}${supportingHeatmaps}${supportingTables}`;
  const csv=result.csv?`<div class="result-block"><button class="button-secondary" data-action="download-csv">Download result CSV</button></div>`:'';
  const secondaryValues=supportingValues?`<details class="supporting-values"><summary>Supporting values <span>${result.values.length-primaryValueCount}</span></summary><div class="result-summary result-summary-supporting">${supportingValues}</div></details>`:'';
  const numericalResults=`<section class="numerical-results-section" data-result-section="numerical"><h3 class="result-section-title">Numerical results</h3><div class="result-summary">${primaryValues}</div>${secondaryValues}</section>`;
  const supportingSection=supportingEvidence?`<details class="supporting-evidence"><summary>Supporting plots, maps, and tables</summary><div class="supporting-evidence-body">${supportingEvidence}</div></details>`:'';
  const hasVisualPrimary=evidenceStack.some(item=>item.type==='plot'||item.type==='rangeChart'||item.type==='heatmap'||item.type==='surface3d'||item.type==='schematic');
  const hasTablePrimary=evidenceStack.some(item=>item.type==='table');
  const resultBody=hasVisualPrimary?`${animationControls}${primaryEvidence}${numericalResults}${commentary}`:hasTablePrimary?`${numericalResults}${primaryEvidence}${commentary}`:`${numericalResults}${commentary}`;
  return `${resultBody}${supportingSection}${csv}`;
}
function svgToPng(svgText,filename){
  const blob=new Blob([svgText],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const vb=img.width&&img.height?[img.width,img.height]:[1200,700],canvas=document.createElement('canvas');canvas.width=Math.max(1200,vb[0]);canvas.height=Math.round(canvas.width*vb[1]/vb[0]);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(p=>{const a=document.createElement('a');a.href=URL.createObjectURL(p);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);},'image/png');URL.revokeObjectURL(url);};img.src=url;
}
function bindTool(route){
  const id=decodeURIComponent(route.segments[1]||''),meta=toolById.get(id),calc=calculatorRegistry[id],form=document.querySelector('#calculator-form'),resultsEl=document.querySelector('#calculator-results');if(!form||!calc)return;
  const unitSystem=form.querySelector('[data-unit-system]');
  const searchableSelects=bindSearchableSelects(form);
  const fieldsByKey=new Map((calc.inputs||[]).map(field=>[field.key,field]));
  let latest=null,lastUnitSystem=unitSystem?.value||'SI',resultCleanup=()=>{};
  const run=()=>{resultCleanup();resultCleanup=()=>{};try{latest=displayEngineeringResult(calc.compute(collectForm(form)),unitSystem?.value||'SI');resultsEl.innerHTML=renderResult(latest,meta);resultCleanup=bindResultActions(latest,meta)||(()=>{});}catch(err){latest=null;resultsEl.innerHTML=`<div class="calc-error"><strong>Calculation could not be completed.</strong><br>${esc(err.message||String(err))}</div>`;}};
  const syncConditionalFields=()=>{
    const current=collectForm(form);
    form.querySelectorAll('[data-visible-when]').forEach(field=>{
      try{
        const rule=JSON.parse(field.dataset.visibleWhen||'{}');
        const visible=Object.entries(rule).every(([key,expected])=>{
          const actual=String(current[key]??'');
          return Array.isArray(expected)?expected.map(String).includes(actual):actual===String(expected);
        });
        field.hidden=!visible;
      }catch{field.hidden=false;}
    });
    form.querySelectorAll('[data-input-group]').forEach(group=>{
      const visible=[...group.querySelectorAll('.field-group')].filter(field=>!field.hidden);
      group.hidden=!visible.length;
      const count=group.querySelector('summary span');if(count)count.textContent=String(visible.length);
    });
  };
  const applyPresetDependencies=target=>{
    if(target?.dataset.key!=='material'||typeof calc.syncPreset!=='function')return;
    const current=collectForm(form),synced=calc.syncPreset(current),system=unitSystem?.value||'SI';
    for(const field of calc.inputs||[]){
      if(!(field.key in synced)||Object.is(synced[field.key],current[field.key]))continue;
      const input=form.querySelector(`[data-key="${CSS.escape(field.key)}"]`);if(!input)continue;
      const displayValue=input.matches('input[type="number"],input[type="range"]')?toDisplayNumber(synced[field.key],field.unit,system):synced[field.key];
      input.value=Number.isFinite(Number(displayValue))?String(Number(Number(displayValue).toPrecision(12))):String(displayValue??'');
    }
  };
  const syncUnitSystem=()=>{
    const next=unitSystem?.value||'SI';
    if(next===lastUnitSystem)return;
    form.querySelectorAll('input[data-native-unit]').forEach(input=>{const native=fromDisplayNumber(input.value,input.dataset.nativeUnit,lastUnitSystem),field=fieldsByKey.get(input.dataset.key),displayed=Number(toDisplayNumber(native,input.dataset.nativeUnit,next));input.value=Number.isFinite(displayed)?String(Number(displayed.toPrecision(12))):String(native??'');if(field?.min!=null)input.min=String(toDisplayNumber(field.min,input.dataset.nativeUnit,next));if(field?.max!=null)input.max=String(toDisplayNumber(field.max,input.dataset.nativeUnit,next));input.step=input.matches('input[type="range"]')&&field?.step!=null?String(toDisplayStep(field.step,input.dataset.nativeUnit,next)):'any';});
    form.querySelectorAll('[data-field-unit]').forEach(label=>{label.textContent=toDisplayUnit(label.dataset.nativeUnit,next);});
    lastUnitSystem=next;run();
  };
  form.addEventListener('submit',e=>{e.preventDefault();run();});
  unitSystem?.addEventListener('input',syncUnitSystem);
  unitSystem?.addEventListener('change',syncUnitSystem);
  let timer;const handleFieldEdit=e=>{if(e.target===unitSystem||e.target.matches('textarea,[data-select-search]'))return;applyPresetDependencies(e.target);syncConditionalFields();clearTimeout(timer);timer=setTimeout(run,120);};form.addEventListener('input',handleFieldEdit);form.addEventListener('change',handleFieldEdit);
  document.querySelector('[data-action="reset-calculator"]')?.addEventListener('click',()=>{const system=unitSystem?.value||'SI';searchableSelects.reset();for(const f of calc.inputs||[]){const el=form.querySelector(`[data-key="${CSS.escape(f.key)}"]`);if(el)el.value=el.matches('input[type="number"],input[type="range"]')?toDisplayNumber(f.default,f.unit,system):f.default??'';}searchableSelects.reset();syncConditionalFields();run();});
  document.querySelector('[data-action="share-calculation"]')?.addEventListener('click',async()=>{const values=collectForm(form),params=new URLSearchParams();if(unitSystem?.value==='English')params.set('units','English');for(const f of calc.inputs||[]){const value=String(values[f.key]??'');if(value===String(f.default??''))continue;if(f.type==='textarea'&&value.length>800)continue;params.set(f.key,value);}const url=`${location.origin}${location.pathname}#/tool/${encodeURIComponent(id)}${params.size?`?${params}`:''}`;try{await navigator.clipboard.writeText(url);showToast(params.size?'Share link copied':'Link copied; large pasted data remains local');}catch{prompt('Copy this link',url);}});
  document.querySelector('[data-action="copy-results"]')?.addEventListener('click',async()=>{if(!latest){showToast('Calculate first');return;}const text=engineeringResultToText(meta.title,latest,formatNumber);try{await navigator.clipboard.writeText(text);showToast('Engineering result copied');}catch{prompt('Copy engineering result',text);}});
  document.querySelectorAll('.file-load').forEach(btn=>btn.addEventListener('click',()=>document.querySelector(`.file-input[data-target="${CSS.escape(btn.dataset.target)}"]`)?.click()));
  document.querySelectorAll('.file-input').forEach(input=>input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;const text=await file.text(),target=document.getElementById(input.dataset.target);if(target){target.value=text;run();showToast(`${file.name} loaded locally`);}}));
  document.querySelectorAll('.tab-button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab-button').forEach(b=>b.classList.toggle('active',b===btn));const tpl=document.querySelector(`#tab-${CSS.escape(btn.dataset.tab)}`);document.querySelector('#tab-panel').innerHTML=tpl?.innerHTML||'';}));
  const priorCleanup=routeCleanup;routeCleanup=()=>{priorCleanup();resultCleanup();searchableSelects.cleanup();clearTimeout(timer);};
  syncConditionalFields();run();
}
function bindHarmonicAnimation(result){
  const controls=document.querySelector('[data-mode-animation]');
  if(!controls||result.presentation?.animation?.type!=='harmonic')return()=>{};
  const plotSvgs=[...document.querySelectorAll('svg[data-chart-animation="harmonic"]')];
  const heatmapCells=[...document.querySelectorAll('[data-heatmap-base-value]')].filter(cell=>!cell.closest('.supporting-evidence'));
  const surfaceCells=[...document.querySelectorAll('[data-surface-base-points]')].filter(cell=>!cell.closest('.supporting-evidence')).map(cell=>({cell,base:cell.dataset.surfaceBasePoints.split(',').map(Number),delta:cell.dataset.surfaceDeltaPoints.split(',').map(Number),value:Number(cell.dataset.surfaceBaseValue),scale:Number(cell.dataset.surfaceScale)}));
  if(!plotSvgs.length&&!heatmapCells.length&&!surfaceCells.length)return()=>{};
  const toggle=controls.querySelector('[data-mode-animation-toggle]'),rateInput=controls.querySelector('[data-mode-animation-rate]'),reset=controls.querySelector('[data-mode-animation-reset]'),phaseOutput=controls.querySelector('[data-mode-animation-phase]'),status=controls.querySelector('[data-mode-animation-status]'),reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let running=!reducedMotion.matches,elapsed=0,lastTime=null,lastDraw=-Infinity,frameId=0,rate=Number(rateInput?.value)||Number(controls.dataset.defaultRate)||.5;
  const setControlState=message=>{toggle.textContent=running?'Pause':'Play';toggle.setAttribute('aria-pressed',String(running));controls.classList.toggle('is-paused',!running);if(message)status.textContent=message;};
  const applyPhase=phase=>{
    phaseOutput.textContent=`${phase>=0?'+':''}${phase.toFixed(2)} phase`;
    controls.style.setProperty('--mode-phase',String((phase+1)/2));
    plotSvgs.forEach(svg=>{const zero=Number(svg.dataset.chartZeroY)||0;svg.querySelectorAll('[data-chart-animated-path]').forEach(path=>path.setAttribute('transform',`translate(0 ${zero}) scale(1 ${phase}) translate(0 ${-zero})`));});
    heatmapCells.forEach(cell=>cell.setAttribute('fill',signedHeatColor(Number(cell.dataset.heatmapBaseValue)*phase,Number(cell.dataset.heatmapScale))));
    surfaceCells.forEach(({cell,base,delta,value,scale})=>{const points=[];for(let index=0;index<base.length;index+=2)points.push(`${(base[index]+phase*delta[index]).toFixed(2)},${(base[index+1]+phase*delta[index+1]).toFixed(2)}`);cell.setAttribute('points',points.join(' '));cell.setAttribute('fill',signedHeatColor(value*phase,scale));});
  };
  const schedule=()=>{if(running&&!document.hidden&&!frameId)frameId=requestAnimationFrame(step);};
  const step=now=>{frameId=0;if(!running)return;if(lastTime!=null)elapsed+=(now-lastTime)/1000;lastTime=now;if(now-lastDraw>=50){applyPhase(harmonicPhase(elapsed,rate));lastDraw=now;}schedule();};
  const setRunning=(next,message)=>{running=next;lastTime=null;if(!running&&frameId){cancelAnimationFrame(frameId);frameId=0;}setControlState(message);schedule();};
  const onToggle=()=>setRunning(!running,running?'Mode animation paused.':'Mode animation playing.');
  const onRate=()=>{rate=Number(rateInput.value)||.5;status.textContent=`Visual speed set to ${rateInput.selectedOptions[0]?.textContent||rate}.`;};
  const onReset=()=>{elapsed=0;lastTime=null;lastDraw=-Infinity;applyPhase(1);status.textContent='Mode animation reset to maximum positive displacement.';};
  const onVisibility=()=>{lastTime=null;if(document.hidden&&frameId){cancelAnimationFrame(frameId);frameId=0;}else schedule();};
  const onReducedMotion=event=>{if(event.matches)setRunning(false,'Mode animation paused because reduced motion is enabled.');};
  toggle.addEventListener('click',onToggle);rateInput.addEventListener('change',onRate);reset.addEventListener('click',onReset);document.addEventListener('visibilitychange',onVisibility);reducedMotion.addEventListener?.('change',onReducedMotion);
  applyPhase(1);setControlState(reducedMotion.matches?'Mode animation starts paused because reduced motion is enabled.':'Mode animation playing.');schedule();
  return()=>{running=false;if(frameId)cancelAnimationFrame(frameId);toggle.removeEventListener('click',onToggle);rateInput.removeEventListener('change',onRate);reset.removeEventListener('click',onReset);document.removeEventListener('visibilitychange',onVisibility);reducedMotion.removeEventListener?.('change',onReducedMotion);};
}
function bindResultActions(result,meta){
  document.querySelector('[data-action="download-csv"]')?.addEventListener('click',()=>downloadCsv(result.csv));
  (result.plots||[]).forEach((p,i)=>{
    const selector=document.querySelector(`[data-chart-trace-selector="${i}"]`),shell=document.querySelector(`[data-chart="${i}"]`),panel=document.querySelector(`[data-chart-data-panel="${i}"]`);
    const selectedIndices=()=>selector?[...selector.querySelectorAll('[data-chart-trace-option]:checked')].map(input=>Number(input.dataset.chartTraceOption)):(p.traces||[]).map((_,index)=>index);
    const activePlot=()=>selector?chartPlotForIndices(p,selectedIndices()):p;
    const activeRows=()=>activePlot().traces.flatMap(trace=>(trace.x||[]).map((x,index)=>[trace.name||'Trace',x,trace.y?.[index]]));
    const activeCsv=()=>({filename:`${slug(meta.title)}-${i+1}.csv`,columns:['trace',p.xLabel||'x',p.yLabel||'y'],rows:activeRows()});
    const activeSvg=()=>lineChartSvg(activePlot());
    const updateDataPanel=()=>{if(!panel)return;const csv=activeCsv();panel.innerHTML=`<div class="table-wrap"><table><thead><tr>${csv.columns.map(column=>`<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${csv.rows.map(row=>`<tr>${row.map(value=>`<td>${esc(formatNumber(value))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;panel.dataset.ready='1';};
    const updateChart=()=>{if(shell)shell.innerHTML=activeSvg();if(panel?.dataset.ready)updateDataPanel();};
    const keepOneSelected=changed=>{if(selectedIndices().length)return true;changed.checked=true;showToast('Keep at least one modal-density curve selected.');return false;};
    document.querySelector(`[data-chart-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-${i+1}.svg`,activeSvg()));
    document.querySelector(`[data-chart-png="${i}"]`)?.addEventListener('click',()=>svgToPng(activeSvg(),`${slug(meta.title)}-${i+1}.png`));
    document.querySelector(`[data-chart-csv="${i}"]`)?.addEventListener('click',()=>downloadCsv(activeCsv()));
    document.querySelector(`[data-chart-data="${i}"]`)?.addEventListener('click',event=>{
      if(!panel)return;
      if(!panel.dataset.ready)updateDataPanel();
      panel.hidden=!panel.hidden;event.currentTarget.textContent=panel.hidden?'View data':'Hide data';
    });
    selector?.addEventListener('change',event=>{if(!event.target.matches('[data-chart-trace-option]'))return;if(keepOneSelected(event.target))updateChart();});
    selector?.querySelector('[data-chart-trace-all]')?.addEventListener('click',()=>{selector.querySelectorAll('[data-chart-trace-option]').forEach(input=>input.checked=true);updateChart();});
    selector?.querySelector('[data-chart-trace-current]')?.addEventListener('click',()=>{const current=initialChartTraceIndices(p);selector.querySelectorAll('[data-chart-trace-option]').forEach(input=>input.checked=current.includes(Number(input.dataset.chartTraceOption)));updateChart();});
    const toggleTrace=target=>{const legend=target.closest?.('[data-legend-trace]');if(!legend||!shell)return;const index=legend.dataset.legendTrace;if(selector){const input=selector.querySelector(`[data-chart-trace-option="${CSS.escape(index)}"]`);if(!input)return;input.checked=!input.checked;if(keepOneSelected(input))updateChart();return;}const hidden=legend.dataset.hidden!=='1';legend.dataset.hidden=hidden?'1':'0';legend.setAttribute('opacity',hidden?'.38':'1');shell.querySelectorAll(`[data-chart-trace="${CSS.escape(index)}"]`).forEach(node=>node.setAttribute('opacity',hidden?'0':'1'));};
    shell?.addEventListener('click',event=>toggleTrace(event.target));
    shell?.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest?.('[data-legend-trace]')){event.preventDefault();toggleTrace(event.target);}});
  });
  (result.rangeCharts||[]).forEach((chart,i)=>{const svg=rangeChartSvg(chart);document.querySelector(`[data-range-chart-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-range-${i+1}.svg`,svg));document.querySelector(`[data-range-chart-png="${i}"]`)?.addEventListener('click',()=>svgToPng(svg,`${slug(meta.title)}-range-${i+1}.png`));});
  (result.heatmaps||[]).forEach((h,i)=>{const svg=heatmapSvg(h);document.querySelector(`[data-heatmap-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-heatmap-${i+1}.svg`,svg));document.querySelector(`[data-heatmap-png="${i}"]`)?.addEventListener('click',()=>svgToPng(svg,`${slug(meta.title)}-heatmap-${i+1}.png`));});
  (result.surfaces3d||[]).forEach((surface,i)=>{const svg=surface3dSvg(surface);document.querySelector(`[data-surface3d-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-3d-mode-${i+1}.svg`,svg));document.querySelector(`[data-surface3d-png="${i}"]`)?.addEventListener('click',()=>svgToPng(svg,`${slug(meta.title)}-3d-mode-${i+1}.png`));});
  (result.schematics||[]).forEach((schematic,i)=>{const svg=schematic.svg||'';document.querySelector(`[data-schematic-svg="${i}"]`)?.addEventListener('click',()=>downloadSvg(`${slug(meta.title)}-geometry-${i+1}.svg`,svg));document.querySelector(`[data-schematic-png="${i}"]`)?.addEventListener('click',()=>svgToPng(svg,`${slug(meta.title)}-geometry-${i+1}.png`));});
  return bindHarmonicAnimation(result);
}

const searchItems=(()=>{
  const out=[];
  subjectWheel.forEach(subject=>out.push({type:'Subject',title:subject.label,description:subject.summary,href:`#/subject/${subject.id}`,text:`${subject.label} ${subject.shortLabel} ${subject.question} ${subject.summary} ${subject.chapterIds.join(' ')}`}));
  toolCatalog.forEach(t=>out.push({type:'Tool',title:t.title,description:t.description,href:`#/tool/${t.id}`,text:`${t.title} ${t.description} ${t.category} ${(t.keywords||[]).join(' ')}`}));
  sections.forEach(s=>{out.push({type:'Chapter',title:s.title,description:s.summary,href:`#/cheat-sheet?section=${s.id}`,text:`${s.title} ${s.summary} ${s.eyebrow}`});s.concepts.forEach(c=>out.push({type:'Chapter',title:c.title,description:c.body,href:`#/cheat-sheet?section=${s.id}&concept=${encodeURIComponent(slug(c.title))}`,text:`${c.title} ${c.body} ${c.interpretation||''} ${c.mistake||''} ${(c.tags||[]).join(' ')}`}));});
  demos.forEach(d=>out.push({type:'Demo',title:d.title,description:d.description,href:`#/demo/${d.id}`,text:`${d.title} ${d.description} ${d.topic}`}));
  caseNotes.forEach(study=>out.push({type:'Case study',title:study.title,description:study.summary,href:`#/case-study/${study.id}`,text:`${study.title} ${study.summary} ${stripHtml(study.body)} ${study.tags.join(' ')} ${caseStudySubjects(study).map(subject=>subject.label).join(' ')}`}));
  glossary.forEach(([term,def])=>out.push({type:'Glossary',title:term,description:def,href:'#/references',text:`${term} ${def}`}));
  return out.map(x=>({...x,normalized:x.text.toLowerCase()}));
})();
function search(q,type=activeSearchType){const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);const candidates=type==='All'?searchItems:searchItems.filter(item=>item.type===type);if(!terms.length)return candidates.slice(0,12);return candidates.map(item=>{let score=0;for(const term of terms){if(item.title.toLowerCase()===term)score+=20;if(item.title.toLowerCase().includes(term))score+=8;if(item.normalized.includes(term))score+=2;else score-=20;}return{item,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title)).slice(0,18).map(x=>x.item);}
function renderSearchResults(q){const el=document.querySelector('#search-results');if(!el)return;const items=search(q);const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);el.innerHTML=items.length?items.map(x=>`<a class="search-result" href="${x.href}"><span class="search-result-type">${esc(x.type)}</span><span><strong>${esc(x.title)}</strong><p>${esc(x.description).slice(0,180)}</p>${terms.length?`<small>Matched ${esc(terms.filter(term=>x.normalized.includes(term)).join(' · ')||'title relevance')}</small>`:''}</span></a>`).join(''):`<div class="search-empty">No matching subject, demo, tool, case study, chapter, or glossary term.</div>`;el.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.search-dialog')?.close()));}
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
  const anchor=route.params.get('anchor');if(anchor)setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({block:'start'}),40);
  if(navKey(route)==='tools'&&route.segments[0]==='tools')bindToolFilters();
  if(route.segments[0]==='tool'){
    const id=decodeURIComponent(route.segments[1]||'');
    if(workbenchRegistry[id]&&route.params.get('mode')!=='quick'){
      const cleanup=workbenchRegistry[id].bind(document),old=routeCleanup;
      routeCleanup=()=>{old();cleanup?.();};
    }else bindTool(route);
  }
  if(route.segments[0]==='demo'){const mount=document.querySelector('#demo-mount');if(mount)routeCleanup=mountDemo(mount,decodeURIComponent(route.segments[1]||''));}
  if(route.segments[0]==='demos')bindDemoFilters();
  if(route.segments[0]==='case-studies')bindCaseStudyFilters();
  if(route.segments[0]==='case-study'){bindEmbeddedDemos();bindCaseStudy(route);}
  if(route.segments[0]==='cheat-sheet'||route.segments[0]==='chapter')bindCheat(route);
  if(route.segments[0]==='references')bindReferenceFilters();
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

function bindCaseStudyFilters(){const cards=[...document.querySelectorAll('[data-case-search]')],input=document.querySelector('#case-study-search'),select=document.querySelector('#case-study-subject-filter'),count=document.querySelector('#case-study-count');const update=()=>{const q=(input?.value||'').trim().toLowerCase(),subject=select?.value||'All';let shown=0;cards.forEach(card=>{const subjects=(card.dataset.caseSubjects||'').split(' ');const visible=(subject==='All'||subjects.includes(subject))&&(!q||card.dataset.caseSearch.includes(q));card.hidden=!visible;if(visible)shown++;});if(count)count.textContent=`${shown} cases`;};input?.addEventListener('input',update);select?.addEventListener('change',update);update();}

function bindCaseStudy(route){const id=decodeURIComponent(route.segments[1]||''),study=caseNotes.find(item=>item.id===id);document.querySelector('[data-action="add-case-to-project"]')?.addEventListener('click',()=>{if(!study)return;addEngineeringArtifact({type:'Applied case study',title:study.title,route:location.hash,takeaway:study.summary,notes:`Tags: ${study.tags.join(', ')}`,provenance:`Case ${study.number} · Structural Acoustics, Understood`});showToast('Case study added to project');document.querySelector('.project-pill b').textContent=loadEngineeringProject().artifacts.length;});}

function bindReferenceFilters(){const input=document.querySelector('#reference-search'),select=document.querySelector('#reference-group-filter'),items=[...document.querySelectorAll('[data-reference-search]')],groups=[...document.querySelectorAll('[data-reference-group]')],count=document.querySelector('#reference-count');const update=()=>{const q=(input?.value||'').trim().toLowerCase(),group=select?.value||'All';let shown=0;items.forEach(item=>{const inGroup=group==='All'||item.closest('[data-reference-group]')?.dataset.referenceGroup===group;const visible=inGroup&&(!q||item.dataset.referenceSearch.includes(q));item.hidden=!visible;if(visible)shown++;});groups.forEach(section=>section.hidden=![...section.querySelectorAll('[data-reference-search]')].some(item=>!item.hidden));if(count)count.textContent=`${shown} sources`;};input?.addEventListener('input',update);select?.addEventListener('change',update);}

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
function legacyRouteTarget(route){
  const first=route.segments[0]||'',id=decodeURIComponent(route.segments[1]||'');
  if(first.startsWith('concept-')){
    const concept=first.slice('concept-'.length),section=sections.find(item=>(item.concepts||[]).some(entry=>slug(entry.title)===concept));
    if(section)return `/cheat-sheet?section=${encodeURIComponent(section.id)}&concept=${encodeURIComponent(concept)}`;
  }
  if(first.startsWith('section-')){
    const sectionId=first.slice('section-'.length);
    if(sectionById.has(sectionId))return `/cheat-sheet?section=${encodeURIComponent(sectionId)}`;
  }
  if(first.startsWith('reference-'))return `/references?anchor=${encodeURIComponent(first)}`;
  if(first==='tool'&&id==='modal-density-atlas')return `/tool/modal-density${route.params.size?`?${route.params}`:''}`;
  if(first==='tool'&&id==='modal-density'){
    const params=new URLSearchParams(route.params);let changed=false;
    if(params.has('structure')&&!params.has('type')){params.set('type',params.get('structure')==='beam'?'beam-bending':'plate-bending');params.delete('structure');changed=true;}
    for(const [legacy,current] of [['E_gpa','modulus'],['rho','density'],['nu','poisson'],['thickness_mm','thickness']])if(params.has(legacy)&&!params.has(current)){params.set(current,params.get(legacy));params.delete(legacy);changed=true;}
    if(changed)return `/tool/modal-density${params.size?`?${params}`:''}`;
  }
  if(first==='case-notes')return `/case-studies${route.params.size?`?${route.params}`:''}`;
  if(first==='case-note')return `/case-study/${encodeURIComponent(id)}`;
  if(first==='hardware'){
    const subjects={fairing:'structural-acoustics',tank:'structures-waves',interstage:'structures-waves',avionics:'random-vibration','feed-system':'acoustics',propulsion:'distributed-loads','payload-deck':'measurement-test'};
    return id?`/subject/${subjects[id]||'structural-acoustics'}`:'/';
  }
  if(first==='pathways')return '/';
  if(first==='pathway'){
    const subjects={'new-analyst':'structural-acoustics','sea-analyst':'sea','structural-dynamicist':'dynamics','test-engineer':'measurement-test','launch-integrator':'distributed-loads','noise-control':'acoustics'};
    return `/subject/${subjects[id]||'structural-acoustics'}`;
  }
  return '';
}
function render(){
  routeCleanup();routeCleanup=()=>{};const route=routeInfo();let main;
  const [first]=route.segments;
  const redirect=legacyRouteTarget(route);if(redirect){history.replaceState(null,'',`${location.pathname}${location.search}#${redirect}`);return render();}
  if(!first)main=renderHomepage({sections,tools:toolCatalog,demos,caseStudies:caseNotes});
  else if(first==='subject')main=renderSubjectPage(decodeURIComponent(route.segments[1]||''),{sections,tools:toolCatalog,demos,caseStudies:caseNotes});
  else if(first==='cheat-sheet'||first==='chapter')main=renderCheat(route);
  else if(first==='tools')main=renderTools(route);
  else if(first==='tool')main=renderTool(route);
  else if(first==='demos')main=renderDemos();
  else if(first==='demo')main=renderDemo(route);
  else if(first==='case-studies')main=renderCaseStudies(route);
  else if(first==='case-study')main=renderCaseStudy(route);
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
  document.body.classList.toggle('site-system-article',first==='case-study'||first==='case-studies');
  document.body.classList.toggle('site-system-reference',first==='references');
  document.body.classList.toggle('site-system-hardware',false);
  document.body.classList.toggle('site-system-pathway',false);
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
document.querySelectorAll('[data-scroll-target]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const target=document.getElementById(link.dataset.scrollTarget);if(!target)return;target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}));
window.addEventListener('keydown',e=>{
  const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
  else if(e.key==='/'&&!typing){e.preventDefault();openSearch();}
  else if(e.key==='Escape')document.querySelector('.search-dialog[open]')?.close();
});
window.addEventListener('sau:add-artifact',event=>{addEngineeringArtifact(event.detail||{});showToast('Workbench evidence added to engineering project');const badge=document.querySelector('.project-pill b');if(badge)badge.textContent=loadEngineeringProject().artifacts.length;});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
