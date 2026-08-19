import { lineChartSvg, heatmapSvg } from './charts.js';
import { displayEngineeringResult, fromDisplayNumber, toDisplayNumber, toDisplayStep, toDisplayUnit } from './unit-system.js';

const deepClone = value => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const statuses = new Set(['pass', 'review', 'incomplete', 'running', 'error', 'informational']);

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

const profileOf = definition => definition.profile === 'analysis' ? 'analysis' : 'workbench';
const definitionSteps = definition => definition.steps?.length ? definition.steps : [{
  id: definition.initialView ?? 'analysis',
  title: definition.analysisTitle ?? definition.title,
  toolId: definition.toolId ?? definition.id,
  instruction: definition.instruction ?? definition.summary,
  fieldKeys: definition.fieldKeys ?? null,
  visualTitle: definition.visualTitle ?? ''
}];

function calculatorDefaults(calculator) {
  return Object.fromEntries((calculator?.inputs ?? []).map(field => [field.key, field.default ?? '']));
}

export function createEngineeringToolProject(definition, calculators) {
  const steps = definitionSteps(definition);
  const toolIds = [...new Set(steps.map(step => step.toolId))];
  const profile = profileOf(definition);
  return {
    schema: 'sau-engineering-tool',
    version: 1,
    toolId: definition.id,
    workbenchId: definition.id,
    profile,
    name: definition.projectName ?? `${definition.title} study`,
    activeView: steps[0].id,
    activeStep: steps[0].id,
    unitSystem: 'SI',
    inputs: Object.fromEntries(toolIds.map(toolId => [toolId, calculatorDefaults(calculators[toolId])])),
    selections: { traces: {} },
    baseline: null,
    provenance: []
  };
}

export function normalizeEngineeringToolProject(definition, calculators, input = {}) {
  const base = createEngineeringToolProject(definition, calculators);
  const source = input && typeof input === 'object' ? deepClone(input) : {};
  const acceptedSchemas = new Set(['sau-engineering-tool', 'sau-engineering-workbench']);
  if (source.schema && !acceptedSchemas.has(source.schema)) throw new Error(`Unsupported engineering-tool schema: ${source.schema}`);
  if (source.version != null && Number(source.version) !== 1) throw new Error(`Unsupported engineering-tool state version: ${source.version}`);
  const sourceId = source.toolId ?? source.workbenchId;
  if (sourceId && sourceId !== definition.id) throw new Error(`State for ${sourceId} cannot be imported into ${definition.id}.`);
  const steps = definitionSteps(definition);
  const active = source.activeView ?? source.activeStep ?? base.activeStep;
  const project = {
    ...base,
    ...source,
    schema: base.schema,
    version: base.version,
    toolId: definition.id,
    workbenchId: definition.id,
    profile: base.profile,
    inputs: { ...base.inputs },
    selections: { ...base.selections, ...(source.selections ?? {}), traces: { ...base.selections.traces, ...(source.selections?.traces ?? {}) } },
    activeView: active,
    activeStep: active
  };
  for (const [toolId, defaults] of Object.entries(base.inputs)) project.inputs[toolId] = { ...defaults, ...(source.inputs?.[toolId] ?? {}) };
  if (!steps.some(step => step.id === project.activeStep)) project.activeStep = project.activeView = steps[0].id;
  if (!['SI', 'English'].includes(project.unitSystem)) project.unitSystem = 'SI';
  return project;
}

function routeProject(definition, calculators) {
  const hash = globalThis.location?.hash ?? '';
  const queryAt = hash.indexOf('?');
  if (queryAt < 0 || typeof URLSearchParams === 'undefined') return null;
  const routePath = hash.slice(0, queryAt).replace(/^#/, '');
  if (decodeURIComponent(routePath) !== `/tool/${definition.id}`) return null;
  const parameters = new URLSearchParams(hash.slice(queryAt + 1));
  const project = createEngineeringToolProject(definition, calculators);
  const step = definitionSteps(definition)[0];
  const calculator = calculators[step.toolId];
  let changed = false;
  project.unitSystem = parameters.get('units') === 'English' ? 'English' : 'SI';
  if (parameters.has('units')) changed = true;
  for (const field of calculator?.inputs ?? []) {
    if (!parameters.has(field.key)) continue;
    const raw = parameters.get(field.key);
    project.inputs[step.toolId][field.key] = ['number', 'range'].includes(field.type)
      ? fromDisplayNumber(raw, field.unit, project.unitSystem)
      : raw;
    changed = true;
  }
  return changed ? project : null;
}

function currentContext(definition, calculators, project) {
  const steps = definitionSteps(definition);
  const step = steps.find(item => item.id === project.activeStep) ?? steps[0];
  const calculator = calculators[step.toolId];
  const inputs = project.inputs[step.toolId] ?? calculatorDefaults(calculator);
  let nativeResult;
  let result;
  let error = '';
  try {
    nativeResult = calculator.compute(inputs);
    result = displayEngineeringResult(nativeResult, project.unitSystem);
  } catch (caught) {
    error = caught?.message ?? String(caught);
    nativeResult = null;
    result = null;
  }
  return { definition, project, profile: profileOf(definition), steps, step, calculator, inputs, nativeResult, result, error, calculators };
}

function renderField(field, value, toolId, unitSystem) {
  const path = `${toolId}.${field.key}`;
  const displayUnit = toDisplayUnit(field.unit, unitSystem);
  const displayValue = ['number', 'range'].includes(field.type) ? toDisplayNumber(value, field.unit, unitSystem) : value;
  const label = `<span>${workbenchEsc(field.label)}${displayUnit ? `<small>${workbenchEsc(displayUnit)}</small>` : ''}</span>`;
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
    const min = field.min != null ? toDisplayNumber(field.min, field.unit, unitSystem) : null;
    const max = field.max != null ? toDisplayNumber(field.max, field.unit, unitSystem) : null;
    const step = field.step != null ? toDisplayStep(field.step, field.unit, unitSystem) : null;
    control = `<input data-wb-field="${workbenchEsc(path)}"${field.unit ? ` data-wb-native-unit="${workbenchEsc(field.unit)}"` : ''} type="${type}" value="${workbenchEsc(displayValue)}"${min != null ? ` min="${min}"` : ''}${max != null ? ` max="${max}"` : ''}${step != null ? ` step="${step}"` : type === 'number' ? ' step="any"' : ''}/>`;
  }
  return `<label class="capstone-field workbench-field">${label}${control}${field.help ? `<em>${workbenchEsc(field.help)}</em>` : ''}</label>`;
}

function inputGroupsHtml(context, fields) {
  const { definition, project, step } = context;
  if (!definition.inputGroups?.length) return fields.map(field => renderField(field, project.inputs[step.toolId]?.[field.key], step.toolId, project.unitSystem)).join('');
  const rendered = new Set();
  const groups = definition.inputGroups.map((group, index) => {
    const groupFields = fields.filter(field => group.fieldKeys.includes(field.key));
    groupFields.forEach(field => rendered.add(field.key));
    if (!groupFields.length) return '';
    return `<details class="engineering-input-group"${group.open ?? index < 2 ? ' open' : ''}><summary><span>${workbenchEsc(group.title)}</span><small>${groupFields.length} controls</small></summary><div>${groupFields.map(field => renderField(field, project.inputs[step.toolId]?.[field.key], step.toolId, project.unitSystem)).join('')}</div></details>`;
  }).join('');
  const remaining = fields.filter(field => !rendered.has(field.key));
  return `${groups}${remaining.length ? `<details class="engineering-input-group"><summary><span>Additional model inputs</span><small>${remaining.length} controls</small></summary><div>${remaining.map(field => renderField(field, project.inputs[step.toolId]?.[field.key], step.toolId, project.unitSystem)).join('')}</div></details>` : ''}`;
}

function workflowHtml(context) {
  const { steps, project } = context;
  return steps.map((step, index) => `<button type="button" class="capstone-step${step.id === project.activeStep ? ' is-active' : ''}" data-wb-step="${workbenchEsc(step.id)}" aria-current="${step.id === project.activeStep ? 'step' : 'false'}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${workbenchEsc(step.title)}</strong></button>`).join('');
}

function statusMetrics(context) {
  const { definition, result, project, steps } = context;
  const defined = definition.metrics?.(context) ?? [];
  if (defined.length) return defined.slice(0, 3);
  return [
    { value: steps.length, label: 'workflow steps' },
    { value: result?.values?.length ?? 0, label: 'live outputs' },
    { value: project.baseline ? 'Saved' : 'Open', label: 'comparison' }
  ];
}

const resolveDecisionValue = (value, context) => typeof value === 'function' ? value(context) : value;

export function engineeringDecisionState(context) {
  const { definition, result, error } = context;
  const configured = typeof definition.decision === 'function' ? definition.decision(context) : definition.decision ?? {};
  const rawStatus = resolveDecisionValue(configured.status, context);
  const activeAlerts = result?.assumptions?.alerts ?? result?.assumptions?.warnings ?? [];
  let status = typeof rawStatus === 'object' ? rawStatus.status : rawStatus;
  if (error) status = 'error';
  else if (!statuses.has(status)) status = activeAlerts.length ? 'review' : 'informational';
  const fallbackMetric = result?.values?.[0] ?? { label: 'Current result', value: error ? 'Unavailable' : '—', unit: '' };
  const configuredMetric = resolveDecisionValue(configured.metric, context);
  const metric = configuredMetric && typeof configuredMetric === 'object'
    ? configuredMetric
    : { label: resolveDecisionValue(configured.metricLabel, context) ?? fallbackMetric.label, value: configuredMetric ?? resolveDecisionValue(configured.metricValue, context) ?? fallbackMetric.value, unit: resolveDecisionValue(configured.metricUnit, context) ?? fallbackMetric.unit };
  const defaultLabels = { pass: 'Screen passes', review: 'Engineering review required', incomplete: 'Decision inputs incomplete', running: 'Analysis running', error: 'Calculation error', informational: 'Screening result' };
  return {
    question: resolveDecisionValue(configured.question, context) ?? definition.title,
    scope: resolveDecisionValue(configured.scope, context) ?? definition.summary,
    metric: { label: metric.label ?? 'Current result', value: metric.value ?? '—', unit: metric.unit ?? '' },
    status,
    statusLabel: typeof rawStatus === 'object' && rawStatus.label ? rawStatus.label : resolveDecisionValue(configured.statusLabel, context) ?? defaultLabels[status],
    keyLimitation: resolveDecisionValue(configured.keyLimitation, context) ?? result?.assumptions?.limitations?.[0] ?? definition.defaultTakeaway ?? 'Confirm the model assumptions against the installed hardware before using this result.'
  };
}

function decisionHeroHtml(context) {
  const { definition, project, profile, step, steps } = context;
  const decision = engineeringDecisionState(context);
  const workflowLabel = profile === 'analysis' ? 'Interactive analysis' : `${steps.length} linked analyses`;
  return `<section class="capstone-hero site-page-header workbench-hero engineering-decision-hero"><div><p class="eyebrow">${workbenchEsc(definition.eyebrow)}</p><h1>${workbenchEsc(decision.question)}</h1><p class="engineering-tool-name">${workbenchEsc(definition.title)}</p><p>${workbenchEsc(decision.scope)}</p><div class="button-row"><a class="button-secondary" href="#/tool/${encodeURIComponent(definition.id)}?mode=quick">Open original quick screen</a><a class="button-secondary" href="#/tools">All engineering tools</a></div></div><aside class="engineering-decision-card is-${workbenchEsc(decision.status)}" aria-label="Current engineering decision"><p>${workbenchEsc(decision.metric.label)}</p><strong>${workbenchEsc(workbenchFmt(decision.metric.value))}${decision.metric.unit ? ` <small>${workbenchEsc(decision.metric.unit)}</small>` : ''}</strong><span class="engineering-status-pill">${workbenchEsc(decision.statusLabel)}</span><div class="engineering-decision-limit"><b>Key limitation</b><p>${workbenchEsc(decision.keyLimitation)}</p></div><dl><div><dt>Study</dt><dd>${workbenchEsc(project.name)}</dd></div><div><dt>Profile</dt><dd>${workbenchEsc(workflowLabel)}</dd></div><div><dt>Current model</dt><dd>${workbenchEsc(step.title)}</dd></div></dl></aside></section>`;
}

function resultSummaryHtml(context) {
  const { result, error, definition } = context;
  if (error) return `<div class="calc-error"><strong>Calculation could not be completed.</strong><br>${workbenchEsc(error)}</div>`;
  const renderValue = item => `<article class="workbench-result-tile"><span>${workbenchEsc(item.label)}</span><strong>${workbenchEsc(workbenchFmt(item.value))}${item.unit ? ` <small>${workbenchEsc(item.unit)}</small>` : ''}</strong>${item.note ? `<p>${workbenchEsc(item.note)}</p>` : ''}</article>`;
  const primaryCount = Math.max(1, result?.presentation?.primaryValueCount ?? result?.values?.length ?? 0);
  const primary = (result?.values ?? []).slice(0, primaryCount).map(renderValue).join('');
  const supporting = (result?.values ?? []).slice(primaryCount).map(renderValue).join('');
  const takeaway = result?.interpretation?.summary ?? definition.defaultTakeaway;
  return `<div class="workbench-result-grid">${primary}</div>${supporting ? `<details class="workbench-supporting-results"><summary>Supporting results</summary><div class="workbench-result-grid">${supporting}</div></details>` : ''}<p class="capstone-panel-takeaway workbench-evidence-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(takeaway)}</p>`;
}

function compareHtml(context) {
  const { project, result } = context;
  if (!project.baseline || !result) return '';
  const rows = (result.values ?? []).map(item => {
    const prior = project.baseline.values?.find(value => value.label === item.label);
    if (!prior || typeof item.value !== 'number' || typeof prior.value !== 'number') return '';
    const priorValue = toDisplayNumber(prior.value, prior.unit, project.unitSystem);
    const delta = item.value - priorValue;
    return `<tr><td>${workbenchEsc(item.label)}</td><td>${workbenchEsc(workbenchFmt(priorValue))}</td><td>${workbenchEsc(workbenchFmt(item.value))}</td><td>${delta >= 0 ? '+' : ''}${workbenchEsc(workbenchFmt(delta))}</td></tr>`;
  }).filter(Boolean).join('');
  return rows ? `<section class="workbench-comparison"><header><h3>Baseline comparison</h3><button type="button" class="button-quiet" data-wb-action="clear-baseline">Clear baseline</button></header><div class="table-wrap"><table><thead><tr><th>Output</th><th>Baseline</th><th>Current</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>Compare changes by physical quantity and sign; an improved primary metric can still move a secondary constraint in the wrong direction.</p></section>` : '';
}

function initialTraceIndices(plot) {
  const traces = plot.traces ?? [];
  if (plot.traceSelector?.initial === 'emphasis') {
    const emphasized = traces.map((trace, index) => trace.emphasis ? index : -1).filter(index => index >= 0);
    if (emphasized.length) return emphasized;
  }
  return traces.map((_, index) => index);
}

function selectedTraceIndices(context, plot, plotIndex) {
  const stored = context.project.selections?.traces?.[context.step.toolId]?.[plotIndex];
  const valid = Array.isArray(stored) ? stored.filter(index => Number.isInteger(index) && index >= 0 && index < (plot.traces?.length ?? 0)) : [];
  return valid.length ? valid : initialTraceIndices(plot);
}

function plotForIndices(plot, indices) {
  const active = new Set(indices);
  return { ...plot, traces: (plot.traces ?? []).map((trace, index) => ({ ...trace, sourceIndex: index })).filter(trace => active.has(trace.sourceIndex)) };
}

function traceSelectorHtml(context, plot, plotIndex) {
  if (!plot.traceSelector || (plot.traces?.length ?? 0) < 2) return '';
  const selected = selectedTraceIndices(context, plot, plotIndex);
  const key = `${context.step.toolId}:${plotIndex}`;
  return `<fieldset class="chart-trace-selector workbench-trace-selector" data-wb-trace-selector="${workbenchEsc(key)}"><legend>${workbenchEsc(plot.traceSelector.label ?? 'Curves to display')}</legend><div class="chart-trace-options">${plot.traces.map((trace, index) => `<label><input type="checkbox" data-wb-trace-option="${index}"${selected.includes(index) ? ' checked' : ''}/><span>${workbenchEsc(trace.name ?? `Trace ${index + 1}`)}</span></label>`).join('')}</div><div class="chart-trace-actions"><button type="button" class="button-quiet" data-wb-trace-action="all" data-wb-trace-key="${workbenchEsc(key)}">Show all</button><button type="button" class="button-quiet" data-wb-trace-action="current" data-wb-trace-key="${workbenchEsc(key)}">Current only</button></div><small>Choose one or more curves. Axes rescale to the visible evidence.</small></fieldset>`;
}

function evidenceTakeaway(context, type, index, item) {
  const configured = context.definition.evidenceTakeaway?.(context, { type, index, item });
  if (configured) return configured;
  if (index === 0) return context.result?.interpretation?.physicalMeaning ?? context.result?.interpretation?.summary ?? 'Interpret the evidence within the stated model limits.';
  return context.result?.interpretation?.engineeringConsiderations?.[0] ?? context.result?.interpretation?.physicalMeaning ?? 'Use this supporting evidence to challenge the controlling result.';
}

function evidenceHtml(context) {
  const { result, error } = context;
  if (error || !result) return '';
  const plots = (result.plots ?? []).map((plot, index) => {
    const selected = selectedTraceIndices(context, plot, index);
    return `<section class="workbench-evidence-panel"><header><h3>${workbenchEsc(plot.title ?? 'Analysis plot')}</h3><span>live project state</span></header>${traceSelectorHtml(context, plot, index)}<div class="chart-shell site-chart-container" data-wb-chart="${index}">${lineChartSvg(plotForIndices(plot, selected))}</div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(evidenceTakeaway(context, 'plot', index, plot))}</p></section>`;
  }).join('');
  const heatmaps = (result.heatmaps ?? []).map((heatmap, index) => `<section class="workbench-evidence-panel"><header><h3>${workbenchEsc(heatmap.title ?? 'Analysis map')}</h3><span>live project state</span></header><div class="chart-shell site-chart-container">${heatmapSvg(heatmap)}</div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(evidenceTakeaway(context, 'heatmap', index, heatmap))}</p></section>`).join('');
  const tables = (result.tables ?? []).map((table, index) => `<section class="workbench-evidence-panel"><header><h3>${workbenchEsc(table.title ?? 'Analysis table')}</h3><span>traceable values</span></header><div class="table-wrap"><table><thead><tr>${(table.columns ?? []).map(column => `<th>${workbenchEsc(column)}</th>`).join('')}</tr></thead><tbody>${(table.rows ?? []).map(row => `<tr>${row.map(cell => `<td>${workbenchEsc(typeof cell === 'number' ? workbenchFmt(cell) : cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(evidenceTakeaway(context, 'table', index, table))}</p></section>`).join('');
  return `${plots}${heatmaps}${tables}`;
}

function checksHtml(context) {
  const { result, error } = context;
  const alerts = error ? [error] : result?.assumptions?.alerts ?? result?.assumptions?.warnings ?? [];
  const limitations = result?.assumptions?.limitations ?? [];
  const satisfied = result?.assumptions?.satisfied ?? [];
  const active = alerts.length ? alerts : ['No result-specific numerical alerts are active. This is not a statement of hardware qualification or model validation.'];
  return `<aside class="capstone-engineering-note workbench-checks"><div><strong>Engineering interpretation</strong><p>${workbenchEsc(result?.interpretation?.summary ?? 'Resolve the active input issue before using the result.')}</p><p class="workbench-validity">${workbenchEsc(result?.validity?.confidence ?? '')}</p></div><div><strong>${alerts.length ? 'Active alerts' : 'Active checks'}</strong><ul>${active.map(item => `<li>${workbenchEsc(item)}</li>`).join('')}</ul>${limitations.length ? `<details open><summary>Model limitations</summary><ul>${limitations.map(item => `<li>${workbenchEsc(item)}</li>`).join('')}</ul></details>` : ''}${satisfied.length ? `<details><summary>Model assumptions</summary><ul>${satisfied.map(item => `<li>${workbenchEsc(item)}</li>`).join('')}</ul></details>` : ''}</div></aside>`;
}

function sourceHtml(context) {
  const { definition, calculator, result } = context;
  const sources = definition.sources ?? calculator?.references ?? [];
  return `<section class="workbench-source-panel"><header><div><p class="eyebrow">Sources & validity</p><h3>Trust the model only inside its evidence boundary</h3></div><span>${workbenchEsc(calculator?.confidence ?? 'Engineering screening model')}</span></header><dl><div><dt>Implemented basis</dt><dd>${workbenchEsc(calculator?.basis ?? result?.validity?.regime ?? 'Documented engineering relation')}</dd></div><div><dt>Validity statement</dt><dd>${workbenchEsc(result?.validity?.regime ?? 'Confirm the governing assumptions.')}</dd></div></dl>${sources.length ? `<ul>${sources.map(source => `<li><strong>${workbenchEsc(source.title)}</strong>${source.note ? `<span>${workbenchEsc(source.note)}</span>` : ''}</li>`).join('')}</ul>` : ''}</section>`;
}

function relatedHtml(context) {
  const { definition, calculator, result, steps, profile } = context;
  const links = profile === 'workbench'
    ? steps.map(item => ({ title: item.title, description: item.toolId, href: `#/tool/${encodeURIComponent(item.toolId)}?mode=quick` }))
    : definition.relatedLinks ?? calculator?.relatedLinks ?? result?.relatedConcepts ?? [];
  if (!links.length) return '';
  return `<section class="workbench-related"><header><p class="eyebrow">Linked engineering context</p><h3>Continue the decision chain</h3></header><div>${links.map(item => `<a href="${workbenchEsc(item.href)}" class="workbench-related-link"><span>${workbenchEsc(item.title)}</span><small>${workbenchEsc(item.description ?? '')}</small></a>`).join('')}</div></section>`;
}

function commandBarHtml(context, includeStep = false) {
  const { definition, project, steps, step } = context;
  return `<div class="capstone-commandbar workbench-commandbar"><label><span>${context.profile === 'analysis' ? 'Study name' : 'Project name'}</span><input type="text" value="${workbenchEsc(project.name)}" data-wb-project-name/></label>${includeStep ? `<label><span>Current analysis</span><select data-wb-step-select>${steps.map(item => `<option value="${workbenchEsc(item.id)}"${item.id === step.id ? ' selected' : ''}>${workbenchEsc(item.title)}</option>`).join('')}</select></label>` : ''}<label class="workbench-unit-control"><span>Display units</span><select data-wb-unit-system><option value="SI"${project.unitSystem === 'SI' ? ' selected' : ''}>SI</option><option value="English"${project.unitSystem === 'English' ? ' selected' : ''}>English</option></select></label><div class="capstone-command-actions"><button type="button" class="button-quiet" data-wb-action="project">Add to project</button><button type="button" class="button-quiet" data-wb-action="baseline">Save baseline</button><button type="button" class="button-quiet" data-wb-action="import">Import</button><input type="file" accept="application/json,.json" data-wb-import hidden/><button type="button" class="button-quiet" data-wb-action="export">Export</button><button type="button" class="button-quiet" data-wb-action="reset">Reset</button></div></div>`;
}

function renderGuidedWorkbench(definition, calculators, projectInput = null) {
  const project = normalizeEngineeringToolProject(definition, calculators, projectInput ?? createEngineeringToolProject(definition, calculators));
  const context = currentContext(definition, calculators, project);
  const { step, calculator, result, steps } = context;
  const metrics = statusMetrics(context);
  const diagram = definition.renderDiagram?.(context) ?? '';
  const diagramTakeaway = definition.diagramTakeaway?.(context) ?? result?.interpretation?.physicalMeaning ?? definition.defaultTakeaway;
  const inspectorFields = step.fieldKeys?.length ? (calculator?.inputs ?? []).filter(field => step.fieldKeys.includes(field.key)) : (calculator?.inputs ?? []);
  return `<div class="page-shell site-page-shell site-page-shell-capstone site-page-shell-workbench" data-workbench-id="${workbenchEsc(definition.id)}" data-engineering-profile="workbench">
    <nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>${workbenchEsc(definition.category)}</span><span aria-hidden="true">›</span><span aria-current="page">${workbenchEsc(definition.title)}</span></nav>
    ${decisionHeroHtml(context)}
    <section class="capstone-workbench engineering-workbench" id="engineering-workbench-${workbenchEsc(definition.id)}">
      <nav class="capstone-workflow" aria-label="${workbenchEsc(definition.title)} workflow"><p class="capstone-kicker">Engineering workflow</p>${workflowHtml(context)}</nav>
      <div class="capstone-main workbench-main">
        ${commandBarHtml(context, true)}
        <header class="capstone-stage-header"><div><p class="eyebrow">${String(steps.indexOf(step) + 1).padStart(2, '0')} · Current task</p><h2>${workbenchEsc(step.title)}</h2><p>${workbenchEsc(step.instruction)}</p></div><div class="capstone-stage-metrics">${metrics.map(metric => `<span><strong>${workbenchEsc(metric.value)}</strong>${workbenchEsc(metric.label)}</span>`).join('')}</div></header>
        <section class="workbench-domain-panel"><header><div><p class="eyebrow">${workbenchEsc(definition.visualLabel)}</p><h3>${workbenchEsc(step.visualTitle || definition.visualTitle)}</h3></div><span>${workbenchEsc(definition.visualLegend)}</span></header>${diagram}<p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(diagramTakeaway)}</p></section>
      </div>
      <aside class="capstone-inspector workbench-inspector" aria-label="Current analysis inputs"><div class="capstone-inspector-heading"><p class="eyebrow">Input inspector</p><h2>${workbenchEsc(step.title)}</h2><p>${workbenchEsc(step.instruction)}</p><a href="#/tool/${encodeURIComponent(step.toolId)}?mode=quick">Open this quick screen →</a></div><div class="capstone-inspector-fields">${inspectorFields.map(field => renderField(field, project.inputs[step.toolId]?.[field.key], step.toolId, project.unitSystem)).join('')}</div></aside>
      <section class="capstone-analytics workbench-analytics"><header><div><p class="eyebrow">Live engineering evidence</p><h2>${workbenchEsc(step.title)} results</h2></div><p>Every value, plot, and table uses the same persisted project state.</p></header>${resultSummaryHtml(context)}${compareHtml(context)}<div class="workbench-evidence-grid">${evidenceHtml(context)}</div>${checksHtml(context)}${sourceHtml(context)}${relatedHtml(context)}</section>
    </section>
  </div>`;
}

export function renderEngineeringAnalysis(definition, calculators, projectInput = null) {
  const project = normalizeEngineeringToolProject(definition, calculators, projectInput ?? createEngineeringToolProject(definition, calculators));
  const context = currentContext(definition, calculators, project);
  const { step, calculator, result } = context;
  const inspectorFields = step.fieldKeys?.length ? (calculator?.inputs ?? []).filter(field => step.fieldKeys.includes(field.key)) : calculator?.inputs ?? [];
  const diagram = definition.renderDiagram?.(context) ?? '';
  const diagramTakeaway = definition.diagramTakeaway?.(context) ?? result?.interpretation?.physicalMeaning ?? definition.defaultTakeaway;
  return `<div class="page-shell site-page-shell site-page-shell-capstone site-page-shell-workbench site-page-shell-analysis" data-workbench-id="${workbenchEsc(definition.id)}" data-engineering-profile="analysis">
    <nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>${workbenchEsc(definition.category)}</span><span aria-hidden="true">›</span><span aria-current="page">${workbenchEsc(definition.title)}</span></nav>
    ${decisionHeroHtml(context)}
    <section class="engineering-analysis" id="engineering-analysis-${workbenchEsc(definition.id)}">
      ${commandBarHtml(context)}
      <aside class="capstone-inspector workbench-inspector engineering-analysis-inspector" aria-label="Analysis inputs"><div class="capstone-inspector-heading"><p class="eyebrow">Input inspector</p><h2>${workbenchEsc(definition.inputTitle ?? 'Define the physical case')}</h2><p>${workbenchEsc(definition.instruction ?? definition.summary)}</p><a href="#/tool/${encodeURIComponent(step.toolId)}?mode=quick">Open the focused quick screen →</a></div><div class="capstone-inspector-fields">${inputGroupsHtml(context, inspectorFields)}</div></aside>
      <main class="engineering-analysis-main">
        <section class="workbench-domain-panel"><header><div><p class="eyebrow">${workbenchEsc(definition.visualLabel)}</p><h3>${workbenchEsc(definition.visualTitle)}</h3></div><span>${workbenchEsc(definition.visualLegend)}</span></header>${diagram}<p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${workbenchEsc(diagramTakeaway)}</p></section>
        <section class="capstone-analytics workbench-analytics engineering-analysis-evidence"><header><div><p class="eyebrow">Live engineering evidence</p><h2>${workbenchEsc(definition.evidenceTitle ?? `${definition.title} results`)}</h2></div><p>The physical view, metrics, curves, and source record share one persisted state.</p></header>${resultSummaryHtml(context)}${compareHtml(context)}<div class="workbench-evidence-grid">${evidenceHtml(context)}</div>${checksHtml(context)}${sourceHtml(context)}${relatedHtml(context)}</section>
      </main>
    </section>
  </div>`;
}

export function renderEngineeringWorkbench(definition, calculators, projectInput = null) {
  return profileOf(definition) === 'analysis'
    ? renderEngineeringAnalysis(definition, calculators, projectInput)
    : renderGuidedWorkbench(definition, calculators, projectInput);
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

function traceSelectionTarget(context, key) {
  const separator = key.lastIndexOf(':');
  const toolId = key.slice(0, separator);
  const plotIndex = Number(key.slice(separator + 1));
  const plot = context.nativeResult?.plots?.[plotIndex] ?? context.result?.plots?.[plotIndex];
  return { toolId, plotIndex, plot };
}

export function bindEngineeringWorkbench(definition, calculators, root = document, initialProject = null) {
  const storageKey = definition.state?.storageKey ?? `sau-engineering-tool-${definition.id}-v1`;
  const legacyStorageKey = `sau-workbench-${definition.id}-v1`;
  let project;
  try {
    const routed = routeProject(definition, calculators);
    const stored = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey) || 'null');
    project = normalizeEngineeringToolProject(definition, calculators, initialProject ?? routed ?? stored ?? createEngineeringToolProject(definition, calculators));
  } catch {
    project = createEngineeringToolProject(definition, calculators);
  }
  const host = root.querySelector ? root : document;
  let inputTimer = 0;
  const render = () => {
    const shell = host.querySelector(`[data-workbench-id="${definition.id}"]`);
    if (!shell) return;
    const active = document.activeElement;
    const activeField = active?.dataset?.wbField ?? '';
    const restoreProjectName = active?.matches?.('[data-wb-project-name]') ?? false;
    const selectionStart = typeof active?.selectionStart === 'number' ? active.selectionStart : null;
    const selectionEnd = typeof active?.selectionEnd === 'number' ? active.selectionEnd : null;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderEngineeringWorkbench(definition, calculators, project);
    shell.replaceWith(wrapper.firstElementChild);
    const restored = activeField
      ? host.querySelector(`[data-wb-field="${activeField}"]`)
      : restoreProjectName ? host.querySelector('[data-wb-project-name]') : null;
    if (restored) {
      restored.focus({ preventScroll: true });
      if (selectionStart != null && typeof restored.setSelectionRange === 'function') restored.setSelectionRange(selectionStart, selectionEnd);
    }
    try { localStorage.setItem(storageKey, JSON.stringify(project)); } catch {}
  };
  const change = event => {
    clearTimeout(inputTimer);
    const traceOption = event.target.closest('[data-wb-trace-option]');
    if (traceOption) {
      const selector = traceOption.closest('[data-wb-trace-selector]');
      const selected = [...selector.querySelectorAll('[data-wb-trace-option]:checked')].map(input => Number(input.dataset.wbTraceOption));
      if (!selected.length) { traceOption.checked = true; return; }
      const context = currentContext(definition, calculators, project);
      const { toolId, plotIndex } = traceSelectionTarget(context, selector.dataset.wbTraceSelector);
      project.selections.traces[toolId] = { ...(project.selections.traces[toolId] ?? {}), [plotIndex]: selected };
      render();
      return;
    }
    const field = event.target.closest('[data-wb-field]');
    if (field) {
      const separator = field.dataset.wbField.indexOf('.');
      const toolId = field.dataset.wbField.slice(0, separator);
      const key = field.dataset.wbField.slice(separator + 1);
      const definitionField = calculators[toolId]?.inputs?.find(item => item.key === key);
      const value = ['number', 'range'].includes(definitionField?.type) && field.value !== ''
        ? fromDisplayNumber(field.value, definitionField.unit, project.unitSystem)
        : field.value;
      project.inputs[toolId][key] = value;
      propagate(definition, project, toolId, key, value);
      if (key === 'material' && typeof calculators[toolId]?.syncPreset === 'function') {
        const prior = project.inputs[toolId];
        const synced = calculators[toolId].syncPreset(prior);
        project.inputs[toolId] = { ...prior, ...synced };
        for (const [syncedKey, syncedValue] of Object.entries(synced)) if (!Object.is(prior[syncedKey], syncedValue)) propagate(definition, project, toolId, syncedKey, syncedValue);
      }
      render();
      return;
    }
    if (event.target.matches('[data-wb-step-select]')) { project.activeStep = project.activeView = event.target.value; render(); return; }
    if (event.target.matches('[data-wb-unit-system]')) { project.unitSystem = event.target.value === 'English' ? 'English' : 'SI'; render(); return; }
    if (event.target.matches('[data-wb-project-name]')) { project.name = event.target.value || definition.projectName || `${definition.title} study`; render(); return; }
    if (event.target.matches('[data-wb-import]')) {
      const file = event.target.files?.[0];
      if (!file) return;
      file.text().then(text => { project = normalizeEngineeringToolProject(definition, calculators, JSON.parse(text)); render(); }).catch(caught => alert(caught?.message ?? 'The selected file is not valid for this engineering tool.'));
    }
  };
  const input = event => {
    if (!event.target.matches('[data-wb-project-name], [data-wb-field]:not(select)')) return;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => change(event), 220);
  };
  const click = event => {
    const traceAction = event.target.closest('[data-wb-trace-action]');
    if (traceAction) {
      const context = currentContext(definition, calculators, project);
      const { toolId, plotIndex, plot } = traceSelectionTarget(context, traceAction.dataset.wbTraceKey);
      if (!plot) return;
      const selected = traceAction.dataset.wbTraceAction === 'all' ? (plot.traces ?? []).map((_, index) => index) : initialTraceIndices(plot);
      project.selections.traces[toolId] = { ...(project.selections.traces[toolId] ?? {}), [plotIndex]: selected };
      render();
      return;
    }
    const step = event.target.closest('[data-wb-step]');
    if (step) { project.activeStep = project.activeView = step.dataset.wbStep; render(); return; }
    const action = event.target.closest('[data-wb-action]')?.dataset.wbAction;
    if (!action) return;
    if (action === 'project') {
      const context = currentContext(definition, calculators, project);
      if (context.result) window.dispatchEvent(new CustomEvent('sau:add-artifact', { detail: {
        type: context.profile === 'analysis' ? 'Interactive analysis evidence' : 'Workbench evidence',
        title: `${definition.title} · ${context.step.title}`,
        route: location.hash,
        takeaway: context.result.interpretation?.summary ?? definition.defaultTakeaway,
        validity: `${context.result.validity?.regime ?? ''} ${context.result.validity?.confidence ?? ''}`.trim(),
        assumptions: context.result.assumptions?.satisfied ?? [],
        warnings: context.result.assumptions?.alerts ?? context.result.assumptions?.warnings ?? [],
        values: context.result.values ?? [],
        notes: `${context.profile === 'analysis' ? 'Analysis study' : 'Workbench project'}: ${project.name}`,
        provenance: `${definition.id} · ${context.step.toolId}`
      } }));
    } else if (action === 'baseline') {
      const context = currentContext(definition, calculators, project);
      if (context.nativeResult) project.baseline = { stepId: context.step.id, toolId: context.step.toolId, values: deepClone(context.nativeResult.values), unitSystem: 'SI', savedAt: new Date().toISOString() };
      render();
    } else if (action === 'clear-baseline') { project.baseline = null; render(); }
    else if (action === 'export') downloadProject(definition, project);
    else if (action === 'import') host.querySelector('[data-wb-import]')?.click();
    else if (action === 'reset' && confirm(`Reset ${definition.title} to its documented baseline?`)) { project = createEngineeringToolProject(definition, calculators); render(); }
  };
  document.addEventListener('input', input);
  document.addEventListener('change', change);
  document.addEventListener('click', click);
  render();
  return () => { clearTimeout(inputTimer); document.removeEventListener('input', input); document.removeEventListener('change', change); document.removeEventListener('click', click); };
}

export function createEngineeringWorkbenchRegistry(definitions, calculators) {
  return Object.fromEntries(definitions.map(definition => [definition.id, {
    definition,
    render: project => renderEngineeringWorkbench(definition, calculators, project),
    bind: (root, project) => bindEngineeringWorkbench(definition, calculators, root, project)
  }]));
}
