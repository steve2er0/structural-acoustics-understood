import { lineChartSvg, heatmapSvg } from './charts.js';

const deepClone = value => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const workbenchEsc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function workbenchFmt(value, digits = 3) {
  if (typeof value === 'string') return value;
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number === 0) return '0';
  if (Math.abs(number) >= 10000 || Math.abs(number) < 0.001) return number.toExponential(2);
  return number.toFixed(digits).replace(/\.?0+$/, '');
}

export function resultValue(result, label, fallback = 0) {
  const item = result?.values?.find(value => value.label === label);
  return item ? finite(item.value, fallback) : fallback;
}

function calculatorDefaults(calculator) {
  return Object.fromEntries((calculator?.inputs ?? []).map(field => [field.key, field.default ?? '']));
}

function defaultProject(definition, calculators) {
  const toolIds = [...new Set(definition.steps.map(step => step.toolId))];
  return {
    schema: 'sau-engineering-workbench',
    version: 1,
    workbenchId: definition.id,
    name: definition.projectName,
    activeStep: definition.steps[0].id,
    inputs: Object.fromEntries(toolIds.map(toolId => [toolId, calculatorDefaults(calculators[toolId])])),
    baseline: null
  };
}

function normalizeProject(definition, calculators, input = {}) {
  const base = defaultProject(definition, calculators);
  const source = input && typeof input === 'object' ? deepClone(input) : {};
  const project = { ...base, ...source, inputs: { ...base.inputs } };
  for (const [toolId, defaults] of Object.entries(base.inputs)) project.inputs[toolId] = { ...defaults, ...(source.inputs?.[toolId] ?? {}) };
  if (!definition.steps.some(step => step.id === project.activeStep)) project.activeStep = definition.steps[0].id;
  project.workbenchId = definition.id;
  return project;
}

function currentContext(definition, calculators, project) {
  const step = definition.steps.find(item => item.id === project.activeStep) ?? definition.steps[0];
  const calculator = calculators[step.toolId];
  const inputs = project.inputs[step.toolId] ?? calculatorDefaults(calculator);
  let result;
  let error = '';
  try { result = calculator.compute(inputs); }
  catch (caught) { error = caught?.message ?? String(caught); result = null; }
  return { definition, project, step, calculator, inputs, result, error, calculators };
}

function renderField(field, value, toolId) {
  const path = `${toolId}.${field.key}`;
  const label = `<span>${workbenchEsc(field.label)}${field.unit ? `<small>${workbenchEsc(field.unit)}</small>` : ''}</span>`;
  let control;
  if (field.type === 'select') {
    control = `<select data-wb-field="${workbenchEsc(path)}">${(field.options ?? []).map(optionInput => {
      const option = Array.isArray(optionInput) ? { value: optionInput[0], label: optionInput[1] } : optionInput;
      return `<option value="${workbenchEsc(option.value)}"${String(option.value) === String(value) ? ' selected' : ''}>${workbenchEsc(option.label)}</option>`;
    }).join('')}</select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea data-wb-field="${workbenchEsc(path)}" spellcheck="false">${workbenchEsc(value)}</textarea>`;
  } else {
    const type = field.type === 'text' ? 'text' : field.type === 'range' ? 'range' : 'number';
    control = `<input data-wb-field="${workbenchEsc(path)}" type="${type}" value="${workbenchEsc(value)}"${field.min != null ? ` min="${field.min}"` : ''}${field.max != null ? ` max="${field.max}"` : ''}${field.step != null ? ` step="${field.step}"` : type === 'number' ? ' step="any"' : ''}/>`;
  }
  return `<label class="capstone-field workbench-field">${label}${control}${field.help ? `<em>${workbenchEsc(field.help)}</em>` : ''}</label>`;
}

function workflowHtml(definition, activeStep) {
  return definition.steps.map((step, index) => `<button type="button" class="capstone-step${step.id === activeStep ? ' is-active' : ''}" data-wb-step="${workbenchEsc(step.id)}" aria-current="${step.id === activeStep ? 'step' : 'false'}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${workbenchEsc(step.title)}</strong></button>`).join('');
}

function statusMetrics(context) {
  const { definition, result, project } = context;
  const defined = definition.metrics?.(context) ?? [];
  if (defined.length) return defined.slice(0, 3);
  return [
    { value: definition.steps.length, label: 'workflow steps' },
    { value: result?.values?.length ?? 0, label: 'live outputs' },
    { value: project.baseline ? 'Saved' : 'Open', label: 'comparison' }
  ];
}

function resultSummaryHtml(context) {
  const { result, error, definition } = context;
  if (error) return `<div class="calc-error"><strong>Calculation could not be completed.</strong><br>${workbenchEsc(error)}</div>`;
  const values = (result?.values ?? []).map(item => `<article class="workbench-result-tile"><span>${workbenchEsc(item.label)}</span><strong>${workbenchEsc(workbenchFmt(item.value))}${item.unit ? ` <small>${workbenchEsc(item.unit)}</small>` : ''}</strong>${item.note ? `<p>${workbenchEsc(item.note)}</p>` : ''}</article>`).join('');
  const takeaway = result?.interpretation?.summary ?? definition.defaultTakeaway;
  return `<div class="workbench-result-grid">${values}</div><p class="capstone-panel-takeaway workbench-evidence-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(takeaway)}</p>`;
}

function compareHtml(context) {
  const { project, result } = context;
  if (!project.baseline || !result) return '';
  const rows = (result.values ?? []).map(item => {
    const prior = project.baseline.values?.find(value => value.label === item.label);
    if (!prior || typeof item.value !== 'number' || typeof prior.value !== 'number') return '';
    const delta = item.value - prior.value;
    return `<tr><td>${workbenchEsc(item.label)}</td><td>${workbenchEsc(workbenchFmt(prior.value))}</td><td>${workbenchEsc(workbenchFmt(item.value))}</td><td>${delta >= 0 ? '+' : ''}${workbenchEsc(workbenchFmt(delta))}</td></tr>`;
  }).filter(Boolean).join('');
  return rows ? `<section class="workbench-comparison"><header><h3>Baseline comparison</h3><button type="button" class="button-quiet" data-wb-action="clear-baseline">Clear baseline</button></header><div class="table-wrap"><table><thead><tr><th>Output</th><th>Baseline</th><th>Current</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>Compare changes by physical quantity and sign; an improved primary metric can still move a secondary constraint in the wrong direction.</p></section>` : '';
}

function evidenceHtml(context) {
  const { result, error } = context;
  if (error || !result) return '';
  const physical = result.interpretation?.physicalMeaning ?? result.interpretation?.summary ?? 'Interpret the plotted trend within the stated model limits.';
  const consideration = result.interpretation?.engineeringConsiderations?.[0] ?? physical;
  const plots = (result.plots ?? []).map(plot => `<section class="workbench-evidence-panel"><header><h3>${workbenchEsc(plot.title ?? 'Analysis plot')}</h3><span>live project state</span></header><div class="chart-shell site-chart-container">${lineChartSvg(plot)}</div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(physical)}</p></section>`).join('');
  const heatmaps = (result.heatmaps ?? []).map(heatmap => `<section class="workbench-evidence-panel"><header><h3>${workbenchEsc(heatmap.title ?? 'Analysis map')}</h3><span>live project state</span></header><div class="chart-shell site-chart-container">${heatmapSvg(heatmap)}</div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(physical)}</p></section>`).join('');
  const tables = (result.tables ?? []).map(table => `<section class="workbench-evidence-panel"><header><h3>${workbenchEsc(table.title ?? 'Analysis table')}</h3><span>traceable values</span></header><div class="table-wrap"><table><thead><tr>${(table.columns ?? []).map(column => `<th>${workbenchEsc(column)}</th>`).join('')}</tr></thead><tbody>${(table.rows ?? []).map(row => `<tr>${row.map(cell => `<td>${workbenchEsc(typeof cell === 'number' ? workbenchFmt(cell) : cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(consideration)}</p></section>`).join('');
  return `${plots}${heatmaps}${tables}`;
}

function checksHtml(context) {
  const { result, error } = context;
  const warnings = [];
  if (error) warnings.push(error);
  warnings.push(...(result?.assumptions?.warnings ?? []));
  if (!warnings.length) warnings.push('No active numerical warnings. Confirm the stated assumptions against the real hardware and test definition.');
  const satisfied = result?.assumptions?.satisfied?.slice(0, 3) ?? [];
  return `<aside class="capstone-engineering-note workbench-checks"><div><strong>Engineering interpretation</strong><p>${workbenchEsc(result?.interpretation?.summary ?? 'Resolve the active input issue before using the result.')}</p></div><div><strong>Active checks</strong><ul>${warnings.map(item => `<li>${workbenchEsc(item)}</li>`).join('')}</ul>${satisfied.length ? `<details><summary>Model assumptions</summary><ul>${satisfied.map(item => `<li>${workbenchEsc(item)}</li>`).join('')}</ul></details>` : ''}</div></aside>`;
}

export function renderEngineeringWorkbench(definition, calculators, projectInput = null) {
  const project = normalizeProject(definition, calculators, projectInput ?? defaultProject(definition, calculators));
  const context = currentContext(definition, calculators, project);
  const { step, calculator, result } = context;
  const metrics = statusMetrics(context);
  const diagram = definition.renderDiagram(context);
  const diagramTakeaway = definition.diagramTakeaway?.(context) ?? result?.interpretation?.physicalMeaning ?? definition.defaultTakeaway;
  const related = definition.steps.map(item => `<a href="#/tool/${encodeURIComponent(item.toolId)}?mode=quick" class="workbench-related-link"><span>${workbenchEsc(item.title)}</span><small>${workbenchEsc(item.toolId)}</small></a>`).join('');
  const inspectorFields = step.fieldKeys?.length ? (calculator?.inputs ?? []).filter(field => step.fieldKeys.includes(field.key)) : (calculator?.inputs ?? []);
  return `<div class="page-shell site-page-shell site-page-shell-capstone site-page-shell-workbench" data-workbench-id="${workbenchEsc(definition.id)}">
    <nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>${workbenchEsc(definition.category)}</span><span aria-hidden="true">›</span><span aria-current="page">${workbenchEsc(definition.title)}</span></nav>
    <section class="capstone-hero site-page-header workbench-hero"><div><p class="eyebrow">${workbenchEsc(definition.eyebrow)}</p><h1>${workbenchEsc(definition.title)}</h1><p>${workbenchEsc(definition.summary)}</p><div class="button-row"><a class="button-secondary" href="#/tool/${encodeURIComponent(definition.id)}?mode=quick">Open original quick screen</a><a class="button-secondary" href="#/tools">All engineering tools</a></div></div><aside class="capstone-hero-status site-status-panel"><dl><div><dt>Project</dt><dd>${workbenchEsc(project.name)}</dd></div><div><dt>Workflow</dt><dd>${definition.steps.length} linked analyses</dd></div><div><dt>Current model</dt><dd>${workbenchEsc(step.title)}</dd></div><div><dt>Comparison</dt><dd>${project.baseline ? 'Baseline saved' : 'No baseline'}</dd></div></dl></aside></section>
    <section class="capstone-workbench engineering-workbench" id="engineering-workbench-${workbenchEsc(definition.id)}">
      <nav class="capstone-workflow" aria-label="${workbenchEsc(definition.title)} workflow"><p class="capstone-kicker">Engineering workflow</p>${workflowHtml(definition, project.activeStep)}</nav>
      <div class="capstone-main workbench-main">
        <div class="capstone-commandbar workbench-commandbar"><label><span>Project name</span><input type="text" value="${workbenchEsc(project.name)}" data-wb-project-name/></label><label><span>Current analysis</span><select data-wb-step-select>${definition.steps.map(item => `<option value="${workbenchEsc(item.id)}"${item.id === step.id ? ' selected' : ''}>${workbenchEsc(item.title)}</option>`).join('')}</select></label><div class="capstone-command-actions"><button type="button" class="button-quiet" data-wb-action="project">Add to project</button><button type="button" class="button-quiet" data-wb-action="baseline">Save baseline</button><button type="button" class="button-quiet" data-wb-action="import">Import</button><input type="file" accept="application/json,.json" data-wb-import hidden/><button type="button" class="button-quiet" data-wb-action="export">Export</button><button type="button" class="button-quiet" data-wb-action="reset">Reset</button></div></div>
        <header class="capstone-stage-header"><div><p class="eyebrow">${String(definition.steps.indexOf(step) + 1).padStart(2, '0')} · Current task</p><h2>${workbenchEsc(step.title)}</h2><p>${workbenchEsc(step.instruction)}</p></div><div class="capstone-stage-metrics">${metrics.map(metric => `<span><strong>${workbenchEsc(metric.value)}</strong>${workbenchEsc(metric.label)}</span>`).join('')}</div></header>
        <section class="workbench-domain-panel"><header><div><p class="eyebrow">${workbenchEsc(definition.visualLabel)}</p><h3>${workbenchEsc(step.visualTitle ?? definition.visualTitle)}</h3></div><span>${workbenchEsc(definition.visualLegend)}</span></header>${diagram}<p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(diagramTakeaway)}</p></section>
      </div>
      <aside class="capstone-inspector workbench-inspector" aria-label="Current analysis inputs"><div class="capstone-inspector-heading"><p class="eyebrow">Input inspector</p><h2>${workbenchEsc(step.title)}</h2><p>${workbenchEsc(step.instruction)}</p><a href="#/tool/${encodeURIComponent(step.toolId)}?mode=quick">Open this quick screen →</a></div><div class="capstone-inspector-fields">${inspectorFields.map(field => renderField(field, project.inputs[step.toolId]?.[field.key], step.toolId)).join('')}</div></aside>
      <section class="capstone-analytics workbench-analytics"><header><div><p class="eyebrow">Live engineering evidence</p><h2>${workbenchEsc(step.title)} results</h2></div><p>Every value, plot, and table uses the same persisted project state.</p></header>${resultSummaryHtml(context)}${compareHtml(context)}<div class="workbench-evidence-grid">${evidenceHtml(context)}</div>${checksHtml(context)}<section class="workbench-related"><header><p class="eyebrow">Linked quick screens</p><h3>Inspect the component models</h3></header><div>${related}</div></section></section>
    </section>
  </div>`;
}

function propagate(definition, project, toolId, key, value) {
  for (const group of definition.syncGroups ?? []) {
    if (!group.some(item => item.toolId === toolId && item.key === key)) continue;
    for (const item of group) if (project.inputs[item.toolId]) project.inputs[item.toolId][item.key] = value;
  }
}

function downloadProject(definition, project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${definition.id}-project.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

export function bindEngineeringWorkbench(definition, calculators, root = document, initialProject = null) {
  const storageKey = `sau-workbench-${definition.id}-v1`;
  let project;
  try { project = normalizeProject(definition, calculators, initialProject ?? JSON.parse(localStorage.getItem(storageKey) || 'null') ?? defaultProject(definition, calculators)); }
  catch { project = defaultProject(definition, calculators); }
  const host = root.querySelector ? root : document;
  const render = () => {
    const shell = host.querySelector(`[data-workbench-id="${definition.id}"]`);
    if (!shell) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderEngineeringWorkbench(definition, calculators, project);
    shell.replaceWith(wrapper.firstElementChild);
    try { localStorage.setItem(storageKey, JSON.stringify(project)); } catch {}
  };
  const change = event => {
    const field = event.target.closest('[data-wb-field]');
    if (field) {
      const separator = field.dataset.wbField.indexOf('.');
      const toolId = field.dataset.wbField.slice(0, separator);
      const key = field.dataset.wbField.slice(separator + 1);
      const value = field.value !== '' && Number.isFinite(Number(field.value)) ? Number(field.value) : field.value;
      project.inputs[toolId][key] = value;
      propagate(definition, project, toolId, key, value);
      render();
      return;
    }
    if (event.target.matches('[data-wb-step-select]')) { project.activeStep = event.target.value; render(); return; }
    if (event.target.matches('[data-wb-project-name]')) { project.name = event.target.value || definition.projectName; render(); return; }
    if (event.target.matches('[data-wb-import]')) {
      const file = event.target.files?.[0];
      if (!file) return;
      file.text().then(text => { project = normalizeProject(definition, calculators, JSON.parse(text)); render(); }).catch(() => alert('The selected file is not a valid project for this workbench.'));
    }
  };
  const click = event => {
    const step = event.target.closest('[data-wb-step]');
    if (step) { project.activeStep = step.dataset.wbStep; render(); return; }
    const action = event.target.closest('[data-wb-action]')?.dataset.wbAction;
    if (!action) return;
    if (action === 'project') {
      const context = currentContext(definition, calculators, project);
      if (context.result) window.dispatchEvent(new CustomEvent('sau:add-artifact', { detail: {
        type: 'Workbench evidence',
        title: `${definition.title} · ${context.step.title}`,
        route: location.hash,
        takeaway: context.result.interpretation?.summary ?? definition.defaultTakeaway,
        validity: `${context.result.validity?.regime ?? ''} ${context.result.validity?.confidence ?? ''}`.trim(),
        assumptions: context.result.assumptions?.satisfied ?? [],
        warnings: context.result.assumptions?.warnings ?? [],
        values: context.result.values ?? [],
        notes: `Workbench project: ${project.name}`,
        provenance: `${definition.id} · ${context.step.toolId}`
      } }));
    } else if (action === 'baseline') {
      const context = currentContext(definition, calculators, project);
      if (context.result) project.baseline = { stepId: context.step.id, toolId: context.step.toolId, values: deepClone(context.result.values), savedAt: new Date().toISOString() };
      render();
    } else if (action === 'clear-baseline') { project.baseline = null; render(); }
    else if (action === 'export') downloadProject(definition, project);
    else if (action === 'import') host.querySelector('[data-wb-import]')?.click();
    else if (action === 'reset' && confirm(`Reset ${definition.title} to its default project?`)) { project = defaultProject(definition, calculators); render(); }
  };
  document.addEventListener('change', change);
  document.addEventListener('click', click);
  render();
  return () => { document.removeEventListener('change', change); document.removeEventListener('click', click); };
}

export function createEngineeringWorkbenchRegistry(definitions, calculators) {
  return Object.fromEntries(definitions.map(definition => [definition.id, {
    definition,
    render: project => renderEngineeringWorkbench(definition, calculators, project),
    bind: (root, project) => bindEngineeringWorkbench(definition, calculators, root, project)
  }]));
}
