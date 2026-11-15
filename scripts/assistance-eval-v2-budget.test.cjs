const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EvalBudget, MAX_CALLS, MAX_VND } = require('./assistance-eval-v2-budget.cjs');
const { matchUsage } = require('./assistance-eval-v2-inference.cjs');

test('evaluation ledger is durable, single-writer, counted before sending, and fail-closed on unknown charge', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pyneath-eval-'));
  const file = path.join(folder, 'ledger.json');
  let ledger;
  try {
    assert.equal(MAX_CALLS, 60); assert.equal(MAX_VND, 100);
    ledger = new EvalBudget(file);
    const first = ledger.reserve({ caseId: 'probe:assisted_start-02', phase: 'probe', reservedVND: 39,
      balanceVND: 1963.1, baselineIds: ['old'], modelName: 'GPT-6 Luna' });
    assert.equal(first.costVND, null); assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).attempts.length, 1);
    assert.throws(() => ledger.reserve({ caseId: 'probe:stuck_recovery-02', phase: 'probe', reservedVND: 39, balanceVND: 1963.1 }));
    assert.throws(() => new EvalBudget(file), /EEXIST/);
    ledger.settle(first.attempt, { id: 'u1', costVND: 1.2, inputTokens: 200, outputTokens: 80 }, { result: 'validated' });
    assert.equal(ledger.total(), 1.2); ledger.close(); ledger = new EvalBudget(file);
    assert.throws(() => ledger.reserve({ caseId: 'probe:assisted_start-02', phase: 'probe', reservedVND: 39, balanceVND: 1961.9 }));
    assert.throws(() => ledger.reserve({ caseId: 'probe:stuck_recovery-02', phase: 'probe', reservedVND: 39, balanceVND: 1960 }));
    const next = ledger.reserve({ caseId: 'probe:stuck_recovery-02', phase: 'probe', reservedVND: 39,
      balanceVND: 1961.9, baselineIds: ['old', 'u1'], modelName: 'GPT-6 Luna' });
    assert.equal(next.attempt, 2);
    ledger.settle(next.attempt, { id: 'u2', costVND: 1.1, inputTokens: 200, outputTokens: 80 }, { result: 'validated' });
    assert.equal(ledger.reserve({ caseId: 'final:assisted_start-02', phase: 'final', reservedVND: 39,
      balanceVND: 1960.8, baselineIds: ['old', 'u1', 'u2'], modelName: 'GPT-6 Luna' }).attempt, 3);
  } finally {
    ledger?.close();
    if (path.dirname(folder) !== os.tmpdir()) throw new Error('Unexpected temporary path; cleanup denied');
    fs.rmSync(folder, { recursive: true });
  }
});

test('Usage reconciliation rejects concurrent or unrelated charges', () => {
  const row = { baselineIds: ['old'], modelName: 'GPT-6 Luna', started: '2026-11-13T00:00:00.000Z' };
  const valid = { id: 'new', model: 'GPT-6 Luna', costVND: 1.2, date: '2026-11-13T00:00:01.000Z' };
  assert.deepEqual(matchUsage([valid], row), valid);
  assert.equal(matchUsage([{ ...valid, id: 'old' }], row), null);
  assert.throws(() => matchUsage([valid, { ...valid, id: 'other' }], row));
  assert.throws(() => matchUsage([{ ...valid, model: 'another-model' }], row));
});

test('v2 ledger enforces the 100đ ceiling and separate 12/48 phase limits', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pyneath-eval-v2-'));
  const file = path.join(folder, 'ledger.json');
  let ledger;
  try {
    ledger = new EvalBudget(file);
    const first = ledger.reserve({ caseId: 'probe:assisted_start-01', phase: 'probe', reservedVND: 99,
      balanceVND: 100, baselineIds: [], modelName: 'GPT-6 Luna' });
    ledger.settle(first.attempt, { id: 'u1', costVND: 1, inputTokens: 1, outputTokens: 1 }, { result: 'validated' });
    assert.throws(() => ledger.reserve({ caseId: 'final:assisted_start-01', phase: 'final', reservedVND: 100,
      balanceVND: 99, baselineIds: ['u1'], modelName: 'GPT-6 Luna' }), /limit/);
    ledger.data.attempts = Array.from({ length: 12 }, (_, i) => ({ caseId: `probe:assisted_start-${String(i + 1).padStart(2, '0')}`,
      phase: 'probe', reservedVND: 1, costVND: 0 }));
    assert.throws(() => ledger.reserve({ caseId: 'probe:assisted_start-13', phase: 'probe', reservedVND: 1,
      balanceVND: 99, baselineIds: [], modelName: 'GPT-6 Luna' }), /phase limit/);
    ledger.data.attempts = Array.from({ length: 60 }, (_, i) => ({ caseId: `final:case-${String(i + 1).padStart(2, '0')}`,
      phase: 'final', reservedVND: 1, costVND: 0 }));
    assert.throws(() => ledger.reserve({ caseId: 'final:assisted_start-01', phase: 'final', reservedVND: 1,
      balanceVND: 99, baselineIds: [], modelName: 'GPT-6 Luna' }), /limit/);
  } finally {
    ledger?.close();
    if (path.dirname(folder) !== os.tmpdir()) throw new Error('Unexpected temporary path; cleanup denied');
    fs.rmSync(folder, { recursive: true });
  }
});
