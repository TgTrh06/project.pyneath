const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchUsage, probeScenario, fixedScenario } = require('./beeknoee-run.cjs');
test('usage reconciles catalog display names or IDs, never assumes missing/error cost is free', () => {
  const row = { model: 'bee/gpt-6-luna', modelName: 'GPT-6 Luna', started: '2026-11-13T00:00:00Z' };
  const entry = { id: 'new', model: row.modelName, date: '2026-11-13T00:00:01Z', costVND: 1.11 };
  assert.equal(matchUsage([entry], row, []).costVND, 1.11);
  assert.equal(matchUsage([{ ...entry, model: row.model }], row, []).costVND, 1.11);
  assert.equal(matchUsage([entry], row, ['new']), null);
  assert.throws(() => matchUsage([entry, { ...entry, id: 'another' }], row, []), /Concurrent/);
  assert.throws(() => matchUsage([{ ...entry, model: 'another model' }], row, []), /Concurrent/);
  assert.throws(() => matchUsage([{ ...entry, costVND: null }], row, []), /Unrecognized/);
  assert.throws(() => matchUsage([{ ...entry, costVND: -1 }], row, []), /Unrecognized/);
  assert.throws(() => matchUsage([{ ...entry, date: '2020-01-01' }], row, []), /Unrecognized/);
  assert.equal(matchUsage([{ ...entry, costVND: 0 }], row, []).costVND, 0);
});
test('latency probes select fixed synthetic cases and omit suggestion text from probe records', () => {
  const start = probeScenario('json_schema', 'latency-start');
  assert.equal(start.id, 'probe-json_schema-latency-start');
  assert.equal(start.request.capability, 'assisted_start');
  assert.match(start.request.description, /Python/);
  const recovery = probeScenario('json_schema', 'latency-recovery');
  assert.equal(recovery.request.capability, 'stuck_recovery');
  const seed = probeScenario('json_schema', 'latency-seed');
  assert.equal(seed.request.capability, 'open_seed_draft');
  assert.equal(fixedScenario('latency-seed').id, 'latency-seed');
  assert.equal(fixedScenario('start-report').id, 'start-report', 'existing evaluation cases remain available');
  assert.throws(() => probeScenario('json_schema', 'unknown'), /Unknown latency case/);
});
