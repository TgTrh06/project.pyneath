// Offline finalization only. Reads the already-paid fictional run; never calls a model.
const fs = require('node:fs');
const path = require('node:path');
const { cases } = require('./assistance-eval-cases.cjs');
const { summarize, casebookSha256 } = require('./assistance-eval-report.cjs');
const { root, MAX_CALLS, MAX_VND } = require('./assistance-eval-budget.cjs');
const V1_CODE_REVISION = '201aa2016fb843a2a4c72f227e4381cf143ad17c68461bde31142775eda0eec3';

const failures = {
  'assisted_start-08': 'Hành động chung chung, không nhắc nút Tiếp tục từ đây.',
  'assisted_start-12': 'Hành động chung chung, không giải quyết Focus Pact hẹn giờ.',
  'stuck_recovery-03': 'Yêu cầu tự nghĩ hành động, chưa đưa ra bước có thể làm ngay.',
  'stuck_recovery-07': 'Yêu cầu tự nghĩ hành động, chưa đưa ra bước có thể làm ngay.',
  'stuck_recovery-12': 'Đã tính phí nhưng không quan sát được phản hồi; không thể chấm đạt.',
  'stuck_recovery-15': 'Yêu cầu tự nghĩ hành động, chưa đưa ra bước có thể làm ngay.',
  'open_seed_draft-03': 'Giả định có ghi chú gần nhất dù người dùng không cung cấp.',
  'open_seed_draft-07': 'Giả định có ghi chú gần nhất dù người dùng không cung cấp.',
  'open_seed_draft-11': 'Bản nháp còn mơ hồ, chưa cho việc có thể tiếp tục.',
  'open_seed_draft-15': 'Giả định có ghi chú và vẫn yêu cầu tự nghĩ việc tiếp tục.'
};
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const content = cases.filter(item => ['selected_context', 'clear', 'ambiguous', 'long_input'].includes(item.category));
const technical = cases.filter(item => !content.includes(item));
function finalize() {
  const manifest = read('manifest.json');
  const ledger = read('ledger.json');
  const responses = read('responses.json');
  const mocks = read('technical.json');
  // Historical source hash was captured at inference time; current application code may be a later candidate.
  if (manifest.casebookSha256 !== casebookSha256 || manifest.codeRevision !== V1_CODE_REVISION) throw new Error('Frozen casebook/code mismatch');
  if (ledger.attempts.length !== MAX_CALLS || ledger.attempts.some(a => a.costVND == null) ||
      new Set(ledger.attempts.map(a => a.caseId)).size !== MAX_CALLS) throw new Error('Incomplete or duplicate paid ledger');
  const spend = Math.round(ledger.attempts.reduce((sum, a) => sum + a.costVND, 0) * 100) / 100;
  if (spend > MAX_VND || Math.abs(1963.1 - spend - ledger.expectedBalanceVND) > 0.001) throw new Error('Cost/balance mismatch');
  const responseById = new Map(responses.map(row => [row.id, row]));
  const mockById = new Map(mocks.map(row => [row.id, row]));
  if (responses.length !== content.length || mocks.length !== technical.length ||
      content.some(item => !responseById.has(item.id)) || technical.some(item => !mockById.has(item.id)))
    throw new Error('Incomplete 60-case result');
  const results = cases.map(item => {
    if (mockById.has(item.id)) return mockById.get(item.id);
    const row = responseById.get(item.id);
    const charged = ledger.attempts.find(a => a.caseId === item.id);
    if (row.costVND !== charged.costVND) throw new Error(`Cost mismatch: ${item.id}`);
    return { ...row, human: 'not_run', authorization: 'pass', manualControl: 'pass',
      ...(!row.response ? { schema: 'not_run', capability: 'not_run', policy: 'not_run' } : {}) };
  });
  const report = summarize({ manifest: { ...manifest, reviewer: 'human-pending' }, results });
  const provisional = content.map(item => {
    const row = responseById.get(item.id);
    const failReason = failures[item.id];
    if (!failReason && row.response?.status !== 'suggestion' &&
        !(item.category === 'ambiguous' && row.response?.status === 'fallback'))
      throw new Error(`Unreviewed outcome: ${item.id}`);
    return { id: item.id, split: item.split, capability: item.capability, category: item.category,
      grade: failReason ? 'fail' : 'pass',
      reason: failReason ?? (row.response.status === 'fallback' ? 'Thiếu ngữ cảnh; fallback thủ công hợp lý.' :
        'Một bước tiếng Việt cụ thể, bám việc/ngữ cảnh giả và không gây hại.') };
  });
  const rollup = selected => ({ cases: selected.length, passed: selected.filter(r => r.grade === 'pass').length,
    rate: selected.filter(r => r.grade === 'pass').length / selected.length });
  const byCapability = Object.fromEntries(['assisted_start', 'stuck_recovery', 'open_seed_draft'].map(name =>
    [name, rollup(provisional.filter(r => r.capability === name))]));
  const artifact = { report, provisionalReview: { reviewerType: 'AI-assistant-provisional; human review pending',
    rubric: 'Vietnamese; related to supplied work/context; one concrete small action; safe. A reasonable fallback passes for insufficient context.',
    total: rollup(provisional), development: rollup(provisional.filter(r => r.split === 'development')),
    holdout: rollup(provisional.filter(r => r.split === 'holdout')), byCapability, cases: provisional },
    cost: { capCalls: MAX_CALLS, actualCalls: ledger.attempts.length, capVND: MAX_VND,
      actualVND: spend, startingBalanceVND: 1963.1, endingBalanceVND: ledger.expectedBalanceVND,
      pendingCharges: 0 },
    providerOutcomes: Object.fromEntries([...new Set(ledger.attempts.map(a => a.result))].map(x =>
      [x, ledger.attempts.filter(a => a.result === x).length])) };
  const target = path.resolve(__dirname, '../docs/07-testing/evidence/assistance-quality-v1-2026-11-13.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify({ path: target, paidCalls: artifact.cost.actualCalls, costVND: spend,
    automatic: { technical: report.technical, content: report.content }, provisional: {
      total: artifact.provisionalReview.total, development: artifact.provisionalReview.development,
      holdout: artifact.provisionalReview.holdout, byCapability } }));
}
if (require.main === module) finalize();
module.exports = { finalize };
