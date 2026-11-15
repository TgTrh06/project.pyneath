// Local-only operator script. Explicit stage argument is required for paid inference.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { cases, version } = require('./assistance-eval-cases.cjs');
const { casebookSha256 } = require('./assistance-eval-report.cjs');
const { root, file: ledgerFile, MAX_CALLS, MAX_VND, MODEL, FORMAT } = require('./assistance-eval-v2-budget.cjs');
const { credentials, preflight } = require('./beeknoee-trial.cjs');
const { render: originalReviewTemplate } = require('./assistance-eval-review-template.cjs');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { assistanceResponseSchema } = apiRequire('@pyneath/contracts');
const base = 'http://127.0.0.1:18087/api/v1';
const origin = 'http://127.0.0.1:15177';
const content = cases.filter(item => ['selected_context', 'clear', 'ambiguous', 'long_input'].includes(item.category));
const probeIds = new Set(['assisted_start-02', 'assisted_start-04', 'assisted_start-08', 'assisted_start-12',
  'stuck_recovery-02', 'stuck_recovery-03', 'stuck_recovery-07', 'stuck_recovery-12',
  'open_seed_draft-02', 'open_seed_draft-03', 'open_seed_draft-07', 'open_seed_draft-11']);
const markerFile = path.join(root, 'current-case.json');
const resultFile = path.join(root, 'responses.json');
const manifestFile = path.join(root, 'manifest.json');
const reviewFile = path.resolve(__dirname, '../docs/07-testing/evidence/assistance-quality-v1-human-review.md');

function parseBaselineReview(value) {
  const body = value.replace(/\r\n/g, '\n');
  const ungraded = body.replace(/^- Người chấm: .+$/m, '- Người chấm: TBD')
    .replace(/^- Ngày chấm: .+$/m, '- Ngày chấm: TBD')
    .replace(/^- \*\*Điểm:\*\* .+$/gm, '- **Điểm:** TBD')
    .replace(/^- \*\*Lý do:\*\* .+$/gm, '- **Lý do:** TBD');
  if (ungraded !== originalReviewTemplate()) throw new Error('Human review changed frozen case input or response');
  const reviewer = body.match(/^- Người chấm: (.+)$/m)?.[1]?.trim();
  const reviewedAt = body.match(/^- Ngày chấm: (.+)$/m)?.[1]?.trim();
  if (!reviewer || !reviewedAt || reviewer === 'TBD' || reviewedAt === 'TBD' || !Number.isFinite(Date.parse(reviewedAt)))
    throw new Error('Human baseline reviewer and date are required before inference');
  const sections = body.split(/^## /m).slice(1);
  const grades = sections.map(section => {
    const id = section.match(/^([\w-]+)$/m)?.[1];
    const grade = section.match(/^- \*\*Điểm:\*\* (pass|fail)$/m)?.[1];
    const reason = section.match(/^- \*\*Lý do:\*\* (.+)$/m)?.[1]?.trim();
    if (!id || !grade || !reason || reason === 'TBD') throw new Error(`Incomplete human grade: ${id ?? 'unknown'}`);
    return { id, grade, reason };
  });
  if (grades.length !== content.length || new Set(grades.map(row => row.id)).size !== content.length ||
      content.some(item => !grades.some(row => row.id === item.id)) ||
      grades.find(row => row.id === 'stuck_recovery-12')?.grade !== 'fail')
    throw new Error('Human baseline must cover all 48 cases and count the unobserved response as failure');
  return { reviewer, reviewedAt, grades, sha256: createHash('sha256').update(body).digest('hex') };
}
function baselineReview() { return parseBaselineReview(fs.readFileSync(reviewFile, 'utf8')); }

function revision() {
  const files = [
    'scripts/assistance-eval-cases.cjs', 'scripts/assistance-eval-review-template.cjs',
    'scripts/assistance-eval-v2-budget.cjs', 'scripts/assistance-eval-v2-inference.cjs',
    'scripts/assistance-eval-v2-server.cjs', 'scripts/assistance-eval-v2-run.cjs', 'scripts/assistance-eval-v2-reconcile.cjs',
    'apps/api/src/modules/assistance/infrastructure/beeknoee-assistance.provider.ts',
    'apps/api/src/modules/assistance/assistance.module.ts',
    'apps/api/src/platform/config/api-config.ts',
    'apps/api/src/modules/assistance/application/assistance.service.ts',
    'apps/api/src/modules/assistance/domain/assistance-policy.ts',
    'apps/api/src/modules/assistance/infrastructure/assistance-output-schema.ts',
    'packages/contracts/src/assistance.ts', 'packages/contracts/src/assistance-prompt.ts'
  ];
  const hash = createHash('sha256');
  for (const name of files) { hash.update(name); hash.update(fs.readFileSync(path.resolve(__dirname, '..', name))); }
  return hash.digest('hex');
}
function manifest(review) {
  fs.mkdirSync(root, { recursive: true });
  const expected = { datasetVersion: version, evaluationVersion: 'assistance-quality-v2', baselineReviewSha256: review.sha256,
    casebookSha256, provider: 'beeknoee', model: MODEL,
    promptRevision: 'pyneath-assistance-v2.4-beeknoee-v3', policyRevision: 'assistance-policy-v1.1',
    codeRevision: revision(), configuration: { responseFormat: FORMAT, maxTokens: 512, deadlineMs: 12000 },
    runAt: new Date().toISOString(), reviewer: review.reviewer };
  if (!fs.existsSync(manifestFile)) fs.writeFileSync(manifestFile, JSON.stringify(expected, null, 2) + '\n');
  const saved = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (!isDeepStrictEqual({ ...saved, runAt: expected.runAt }, expected)) throw new Error('Code, casebook or configuration changed during evaluation');
  return saved;
}
function stored() { return fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : []; }
function saveResults(rows) {
  const temporary = resultFile + '.tmp'; fs.writeFileSync(temporary, JSON.stringify(rows, null, 2) + '\n'); fs.renameSync(temporary, resultFile);
}
function ledger() { return fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : { attempts: [] }; }

class Client {
  constructor() { this.cookie = ''; this.csrf = ''; this.password = randomBytes(20).toString('hex'); }
  async request(route, method = 'GET', data, expected = 200) {
    const response = await fetch(base + route, { method, signal: AbortSignal.timeout(30000), headers: {
      Origin: origin, cookie: this.cookie, 'Content-Type': 'application/json',
      ...(method === 'GET' ? {} : { 'X-XSRF-TOKEN': this.csrf })
    }, body: data === undefined ? undefined : JSON.stringify(data) });
    for (const value of response.headers.getSetCookie()) if (value.startsWith('PYNEATH_SESSION=')) this.cookie = value.split(';')[0];
    const body = response.status === 204 ? {} : await response.json();
    if (body.csrfToken) this.csrf = body.csrfToken;
    if (response.status !== expected) throw new Error(`Local API ${route} returned ${response.status}; stop`);
    return body;
  }
  async register() {
    await this.request('/auth/session');
    await this.request('/auth/register', 'POST', { email: `assistance-eval-${randomUUID()}@example.test`, password: this.password }, 201);
  }
}

async function one(client, scenario, phase, rows) {
  if (fs.existsSync(markerFile)) throw new Error('Unresolved current-case marker; inspect before continuing');
  const old = ledger();
  if (old.attempts.some(item => item.costVND === null)) throw new Error('Unreconciled charge; stop');
  const attemptId = `${phase}:${scenario.id}`;
  if (old.attempts.length >= MAX_CALLS || old.attempts.some(item => item.caseId === attemptId)) throw new Error('Call limit or duplicate case');
  const route = '/me/assistance', body = scenario.request;
  if (scenario.selectedContext) {
    const text = scenario.selectedContext.get_my_open_seed.text;
    await client.request('/me/open-seed', 'PUT', { text });
  } else {
    // Each case owns its context; do not carry the preceding case's Seed forward.
    await client.request('/me/open-seed', 'DELETE', undefined, 204);
  }
  fs.writeFileSync(markerFile, JSON.stringify({ caseId: scenario.id, phase }), { flag: 'wx' });
  const started = performance.now();
  const response = await client.request(route, 'POST', body, 201);
  const elapsedMs = Math.round(performance.now() - started);
  const parsed = assistanceResponseSchema.safeParse(response);
  const after = ledger(), charged = after.attempts.find(item => item.caseId === attemptId);
  if (!charged || charged.costVND === null) throw new Error('Provider attempt missing or charge unresolved; stop');
  const record = { id: scenario.id, phase, response, latencyMs: elapsedMs, costVND: charged.costVND,
    promptTokens: charged.inputTokens, completionTokens: charged.outputTokens };
  rows.push(record); saveResults(rows); fs.unlinkSync(markerFile);
  console.log(JSON.stringify({ id: scenario.id, phase, status: response.status, costVND: charged.costVND, calls: after.attempts.length,
    totalVND: after.attempts.reduce((sum, item) => sum + item.costVND, 0) }));
  if (!parsed.success || response.output.capability !== scenario.capability || response.status === 'boundary')
    throw new Error('Invalid or unexpected boundary; stop for review');
}

async function main() {
  const stage = process.argv[2];
  if (!['preflight', 'probe', 'final'].includes(stage)) throw new Error('Usage: node scripts/assistance-eval-v2-run.cjs preflight|probe|final');
  const { snapshot } = await preflight(credentials());
  const model = snapshot.models.find(item => item.id === MODEL);
  if (!model || !Number.isFinite(snapshot.balanceVND)) throw new Error('Luna balance/price unavailable');
  if (stage === 'preflight') { console.log(JSON.stringify({ balanceVND: snapshot.balanceVND, model: MODEL, pricing: model.pricing,
    callCap: MAX_CALLS, costCapVND: MAX_VND })); return; }
  const review = baselineReview();
  manifest(review);
  const rows = stored(), past = ledger();
  if (rows.some(item => !past.attempts.some(row => row.caseId === `${item.phase}:${item.id}` && row.costVND !== null)) ||
      past.attempts.some(item => item.costVND !== null && !rows.some(row => `${row.phase}:${row.id}` === item.caseId)))
    throw new Error('Ledger and responses disagree; inspect before continuing');
  if (past.attempts.some(item => item.costVND === null) || fs.existsSync(markerFile)) throw new Error('Unresolved attempt; inspect before continuing');
  const probes = content.filter(item => probeIds.has(item.id));
  if (probes.length !== 12 || probes.some(item => item.split !== 'development')) throw new Error('Invalid probe selection');
  if (stage === 'final' && probes.some(item => !rows.some(row => row.phase === 'probe' && row.id === item.id)))
    throw new Error('Probe gate incomplete');
  const batch = stage === 'probe' ? probes : content;
  const pending = batch.filter(item => !rows.some(row => row.phase === stage && row.id === item.id));
  if (!pending.length) { console.log(JSON.stringify({ stage, pending: 0, calls: past.attempts.length })); return; }
  const clients = Array.from({ length: 5 }, () => new Client());
  for (const client of clients) await client.register();
  for (let i = 0; i < pending.length; i++) await one(clients[i % clients.length], pending[i], stage, rows);
}
module.exports = { revision, manifest, baselineReview, parseBaselineReview, Client, probeIds };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
