import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOOL_HISTORY_STORAGE_KEY,
  TOOL_PIN_STORAGE_KEY,
  createToolDiscoveryRecord,
  rankToolDiscoveryRecords,
  validStoredToolIds
} from '../js/tool-discovery.js';

const quick = { task: 'Response & loads', input: 'Spectrum or bands', level: 'Quick screen', workbench: false };
const records = [
  createToolDiscoveryRecord(
    { id: 'elastic-panel-tl', title: 'Elastic panel transmission loss', description: 'Predict panel transmission through mass law and coincidence.', category: 'Structural Acoustics' },
    { id: 'structural-acoustics', label: 'Structural–Acoustic Coupling', accent: '#6f8cff' },
    { ...quick, task: 'Transmission & control', input: 'Geometry & properties' }
  ),
  createToolDiscoveryRecord(
    { id: 'psd-combination', title: 'PSD combination', description: 'Combine random-vibration spectra with explicit correlation.', category: 'Random & Shock' },
    { id: 'random-vibration', label: 'Random Vibration', accent: '#58d59b' },
    quick
  ),
  createToolDiscoveryRecord(
    { id: 'sea-validity-confidence', title: 'SEA validity confidence', description: 'Screen modal population and statistical energy assumptions.', category: 'SEA & Energy' },
    { id: 'sea', label: 'SEA & Energy Flow', accent: '#63d59e' },
    { ...quick, task: 'SEA & energy', input: 'System network', level: 'Guided workbench', workbench: true }
  ),
  createToolDiscoveryRecord(
    { id: 'custom-response', title: 'Custom response', description: 'A generic response calculator.', category: 'Dynamics' },
    { id: 'dynamics', label: 'Dynamics, Damping & Modes', accent: '#7da0ff' },
    quick
  )
];

test('tool launcher search understands engineering abbreviations and natural task phrases', () => {
  assert.equal(rankToolDiscoveryRecords(records, 'panel TL')[0].id, 'elastic-panel-tl');
  assert.equal(rankToolDiscoveryRecords(records, 'combine PSDs')[0].id, 'psd-combination');
  assert.equal(rankToolDiscoveryRecords(records, 'SEA validity')[0].id, 'sea-validity-confidence');
  assert.equal(rankToolDiscoveryRecords(records, 'statistical energy')[0].id, 'sea-validity-confidence');
});

test('tool launcher browsing filters by the shared subject and task metadata', () => {
  assert.deepEqual(
    rankToolDiscoveryRecords(records, '', { subjectId: 'random-vibration' }).map(record => record.id),
    ['psd-combination']
  );
  assert.deepEqual(
    rankToolDiscoveryRecords(records, '', { task: 'Transmission & control' }).map(record => record.id),
    ['elastic-panel-tl']
  );
});

test('tool launcher gives pinned and recent tools deterministic default priority', () => {
  const ranked = rankToolDiscoveryRecords(records, '', {
    pinnedIds: ['custom-response'],
    recentIds: ['sea-validity-confidence']
  });
  assert.equal(ranked[0].id, 'custom-response');
  assert.ok(ranked.findIndex(record => record.id === 'sea-validity-confidence') < ranked.findIndex(record => record.id === 'elastic-panel-tl'));
});

test('stored tool lists reject stale ids, duplicates, and non-string values', () => {
  assert.equal(TOOL_HISTORY_STORAGE_KEY, 'sau-recent-tools-v1');
  assert.equal(TOOL_PIN_STORAGE_KEY, 'sau-pinned-tools-v1');
  assert.deepEqual(
    validStoredToolIds(['psd-combination', 'missing', 'psd-combination', 42, 'elastic-panel-tl'], new Set(records.map(record => record.id))),
    ['psd-combination', 'elastic-panel-tl']
  );
});
