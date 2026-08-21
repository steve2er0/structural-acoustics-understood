export const TOOL_HISTORY_STORAGE_KEY = 'sau-recent-tools-v1';
export const TOOL_PIN_STORAGE_KEY = 'sau-pinned-tools-v1';

export const DEFAULT_TOOL_IDS = [
  'psd-combination',
  'bending-wave',
  'critical-frequency',
  'miles',
  'srs',
  'elastic-panel-tl',
  'modal-density',
  'two-subsystem-sea',
  'accelerometer',
  'sorbothane-isolation'
];

const aliasGroups = [
  ['combine', 'combination', 'combiner', 'sum spectra'],
  ['tl', 'transmission loss', 'panel transmission loss'],
  ['psd', 'power spectral density', 'random vibration spectrum'],
  ['grms', 'g rms', 'rms acceleration'],
  ['srs', 'shock response spectrum'],
  ['vrs', 'vibration response spectrum'],
  ['fds', 'fatigue damage spectrum'],
  ['sea', 'statistical energy analysis'],
  ['clf', 'coupling loss factor'],
  ['dlf', 'damping loss factor'],
  ['frf', 'frequency response function', 'transfer function'],
  ['sdof', 'single degree of freedom', 'one degree of freedom'],
  ['mimo', 'multi input multi output', 'multiple input multiple output'],
  ['tbl', 'turbulent boundary layer'],
  ['spl', 'sound pressure level'],
  ['swl', 'sound power level'],
  ['fc', 'critical frequency', 'coincidence frequency'],
  ['daq', 'data acquisition'],
  ['pcb', 'printed circuit board', 'electronics board'],
  ['octave', 'one third octave', 'third octave']
];

const defaultOrder = new Map(DEFAULT_TOOL_IDS.map((id, index) => [id, index]));

export function normalizeToolSearch(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function aliasesFor(text) {
  return aliasGroups
    .filter(group => group.some(term => text.includes(normalizeToolSearch(term))))
    .flat();
}

function queryGroups(query) {
  return normalizeToolSearch(query).split(' ').filter(Boolean).map(term => {
    const singular = term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term;
    const matched = aliasGroups.find(group => group.some(alias => [term, singular].includes(normalizeToolSearch(alias))));
    return matched ? [...new Set([term, singular, ...matched.map(normalizeToolSearch)])] : [...new Set([term, singular])];
  });
}

export function createToolDiscoveryRecord(tool, subject, profile) {
  const base = normalizeToolSearch([
    tool.id,
    tool.title,
    tool.description,
    tool.category,
    ...(tool.keywords || []),
    subject.id,
    subject.label,
    profile.task,
    profile.input,
    profile.level
  ].join(' '));
  const aliasText = aliasesFor(base).join(' ');
  return {
    id: tool.id,
    title: tool.title,
    description: tool.description,
    href: `#/tool/${encodeURIComponent(tool.id)}`,
    category: tool.category,
    subjectId: subject.id,
    subjectLabel: subject.label,
    subjectAccent: subject.accent,
    task: profile.task,
    input: profile.input,
    level: profile.level,
    workbench: Boolean(profile.workbench),
    normalizedTitle: normalizeToolSearch(tool.title),
    searchText: normalizeToolSearch(`${base} ${aliasText}`)
  };
}

function matchScore(record, query) {
  const normalizedQuery = normalizeToolSearch(query);
  if (!normalizedQuery) return 0;
  let score = 0;
  if (record.normalizedTitle === normalizedQuery) score += 80;
  else if (record.normalizedTitle.startsWith(normalizedQuery)) score += 38;
  else if (record.normalizedTitle.includes(normalizedQuery)) score += 24;

  for (const alternatives of queryGroups(query)) {
    const titleMatch = alternatives.some(term => record.normalizedTitle.includes(term));
    const textMatch = alternatives.some(term => record.searchText.includes(term));
    if (!titleMatch && !textMatch) return -Infinity;
    score += titleMatch ? 16 : 5;
  }
  return score;
}

export function rankToolDiscoveryRecords(records, query = '', options = {}) {
  const {
    subjectId = 'All',
    task = 'All',
    pinnedIds = [],
    recentIds = [],
    limit = 12
  } = options;
  const pinnedOrder = new Map(pinnedIds.map((id, index) => [id, index]));
  const recentOrder = new Map(recentIds.map((id, index) => [id, index]));

  return records
    .filter(record => subjectId === 'All' || record.subjectId === subjectId)
    .filter(record => task === 'All' || record.task === task)
    .map((record, catalogIndex) => {
      const queryScore = matchScore(record, query);
      const preferred = defaultOrder.has(record.id) ? 18 - defaultOrder.get(record.id) : 0;
      const pinned = pinnedOrder.has(record.id) ? 36 - pinnedOrder.get(record.id) : 0;
      const recent = recentOrder.has(record.id) ? 24 - recentOrder.get(record.id) : 0;
      return { record, catalogIndex, score: queryScore + preferred + pinned + recent };
    })
    .filter(item => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex || a.record.title.localeCompare(b.record.title))
    .slice(0, Math.max(1, limit))
    .map(item => item.record);
}

export function validStoredToolIds(value, availableIds, limit = 12) {
  const ids = Array.isArray(value) ? value : [];
  const allowed = availableIds instanceof Set ? availableIds : new Set(availableIds);
  return [...new Set(ids.filter(id => typeof id === 'string' && allowed.has(id)))].slice(0, limit);
}
