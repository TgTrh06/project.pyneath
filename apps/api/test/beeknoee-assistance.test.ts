import { emptyAssistanceContext } from './helpers/assistance-context';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Logger } from '@nestjs/common';
import { type AssistanceRequest } from '@pyneath/contracts';
import { readApiConfig } from '../src/platform/config/api-config';
import { BeeknoeeAssistanceProvider } from '../src/modules/assistance/infrastructure/beeknoee-assistance.provider';
import { BeeknoeeHttpTransport } from '../src/modules/assistance/infrastructure/beeknoee-http';
import { assistanceConfiguration } from '../src/modules/assistance/infrastructure/assistance-configuration';
import { AssistanceService } from '../src/modules/assistance/application/assistance.service';
import type { Analytics } from '../src/modules/analytics/public-api';
import { isGenericAssistanceSuggestion } from '../src/modules/assistance/domain/assistance-policy';

const config = () => readApiConfig({ API_ASSISTANCE_PROVIDER: 'beeknoee', BEEKNOEE_API_KEY: 'fixture-not-a-key', API_LOG_LEVEL: 'silent' });
const input: AssistanceRequest = { capability: 'stuck_recovery', currentStep: 'Viết đoạn mô tả dự án', stuckMode: 'too_large' };
const step = { capability: 'stuck_recovery', version: '1', needsHumanSupport: false, fallback: 'manual_step', recoveryAction: 'smaller_step', recoveryStep: 'Viết một câu mô tả ý chính.' };
const completion = (output: unknown) => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }], usage: { prompt_tokens: 300, completion_tokens: 90, cost: 0.00004 } });
const provider = () => new BeeknoeeAssistanceProvider(config(), new BeeknoeeHttpTransport());

test('configured JSON modes are fixed per request, validated locally, and never negotiated by retries', async t => {
  for (const format of ['json_schema', 'json_object', 'prompt'] as const) {
    const cfg = readApiConfig({ API_ASSISTANCE_PROVIDER: 'beeknoee', BEEKNOEE_API_KEY: 'fixture', BEEKNOEE_RESPONSE_FORMAT: format, API_LOG_LEVEL: 'silent' });
    let calls = 0;
    t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async (options: RequestInit) => {
      calls++; const body = JSON.parse(String(options.body));
      assert.equal(body.response_format?.type, format === 'prompt' ? undefined : format);
      assert.match(body.messages[0].content, /JSON object/);
      assert.match(body.messages[0].content, /additionalProperties/);
      assert.match(body.messages[0].content, /Công nghệ thông tin và kỹ thuật phần mềm/);
      return Response.json(completion(step));
    });
    const candidate = new BeeknoeeAssistanceProvider(cfg, new BeeknoeeHttpTransport());
    assert.equal((await candidate.generate(input)).kind, 'validated'); assert.equal(calls, 1);
    t.mock.restoreAll(); calls = 0;
    t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async () => { calls++; return new Response('response_format not supported', { status: 400 }); });
    await assert.rejects(candidate.generate(input)); assert.equal(calls, 1); t.mock.restoreAll();
  }
});

test('Beeknoee needs its own key, allows only the two approved models, and exposes all three capabilities', () => {
  assert.equal(readApiConfig({}).API_ASSISTANCE_PROVIDER, 'disabled');
  assert.throws(() => readApiConfig({ API_ASSISTANCE_PROVIDER: 'beeknoee', OPENAI_API_KEY: 'private-fixture' }), error => error instanceof Error && !error.message.includes('private-fixture'));
  assert.throws(() => readApiConfig({ BEEKNOEE_MODEL: 'another/model' }));
  assert.equal(readApiConfig({ BEEKNOEE_MODEL: 'bee/gpt-6-luna' }).BEEKNOEE_MODEL, 'bee/gpt-6-luna');
  assert.throws(() => readApiConfig({ BEEKNOEE_RESPONSE_FORMAT: 'auto' }));
  assert.equal(config().BEEKNOEE_MODEL, 'bee/gpt-6-luna');
  assert.equal(config().API_ASSISTANCE_QUALITY_V2, 'false');
  assert.throws(() => readApiConfig({ API_ASSISTANCE_QUALITY_V2: 'true' }), /API_ASSISTANCE_QUALITY_V2/);
  assert.deepEqual(assistanceConfiguration(config()), { enabled: true, processing: 'external', capabilities: ['assisted_start', 'open_seed_draft', 'stuck_recovery'] });
});

test('each capability uses a single bounded JSON request, without OpenRouter-specific routing', async t => {
  for (const capability of ['assisted_start', 'open_seed_draft', 'stuck_recovery'] as const) {
    const request: AssistanceRequest = capability === 'assisted_start' ? { capability, description: 'Soạn mục tiêu báo cáo' } : capability === 'open_seed_draft' ? { capability, context: 'Đã viết mục tiêu, lần sau thêm phương pháp' } : input;
    const output = capability === 'assisted_start' ? { ...step, capability, recoveryAction: undefined, recoveryStep: undefined, activationStep: 'Mở tài liệu và viết một mục tiêu.', estimatedMinutes: 3 }
      : capability === 'open_seed_draft' ? { ...step, capability, recoveryAction: undefined, recoveryStep: undefined, openSeedDraft: 'Lần sau viết một câu về phương pháp.' } : step;
    let calls = 0;
    t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async (options: RequestInit) => {
      calls++; const body = JSON.parse(String(options.body));
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer fixture-not-a-key');
      assert.equal(body.model, 'bee/gpt-6-luna'); assert.equal(body.max_tokens, 512);
      assert.equal(body.reasoning, undefined);
      assert.equal(new Headers(options.headers).get('User-Agent'), 'Pyneath/0.1');
      assert.equal(body.provider, undefined);
      assert.equal(body.response_format.type, 'json_schema'); assert.equal(body.tools, undefined);
      const branches = body.response_format.json_schema.schema.anyOf;
      assert.ok(branches.every((branch: any) => branch.additionalProperties === false && branch.properties.capability.const === capability));
      assert.ok(branches.filter((branch: any) => branch.properties.message).every((branch: any) => !branch.properties.activationStep && !branch.properties.recoveryStep && !branch.properties.openSeedDraft));
      assert.equal(body.messages.length, 2); assert.equal(JSON.parse(body.messages[1].content).authorizedContext, undefined);
      return Response.json(completion(output));
    });
    assert.equal((await provider().generate(request)).kind, 'validated'); assert.equal(calls, 1); t.mock.restoreAll();
  }
});

test('Beeknoee timing diagnostics separate authorized-context, transport phases, body parsing and schema validation', async t => {
  const logs: unknown[] = [];
  t.mock.method(Logger.prototype, 'log', (message: unknown) => { logs.push(message); });
  t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async (options: RequestInit) => {
    const timed = options as RequestInit & { onTiming?: (timing: Record<string, number | boolean>) => void };
    timed.onTiming?.({ dnsMs: 2, tcpMs: 3, tlsMs: 4, responseHeadersMs: 8, socketReused: false });
    return Response.json(completion(step));
  });
  const candidate = new BeeknoeeAssistanceProvider(readApiConfig({ API_ASSISTANCE_PROVIDER: 'beeknoee', BEEKNOEE_API_KEY: 'fixture', API_LOG_LEVEL: 'info' }), new BeeknoeeHttpTransport());
  await candidate.generate(input, { names: ['get_my_open_seed'], read: async () => ({ text: 'Fictional seed' }) });
  const message = logs[0] as Record<string, unknown>;
  for (const field of ['elapsedMs', 'calls', 'contextReadMs', 'dnsMs', 'tcpMs', 'tlsMs', 'responseHeadersMs', 'requestToHeadersMs', 'bodyJsonMs', 'schemaValidationMs']) {
    assert.equal(typeof message[field], 'number', `missing numeric timing field ${field}`);
  }
  assert.equal(message.outcome, 'suggestion'); assert.equal(message.socketReused, false); assert.equal(message.modelVersion, 'bee/gpt-6-luna');
  assert.equal(Object.hasOwn(message, 'prompt'), false); assert.equal(Object.hasOwn(message, 'response'), false);
  t.mock.restoreAll();
});

test('Luna quality guard falls back on self-delegating steps without retrying or blocking grounded steps', async t => {
  assert.equal(isGenericAssistanceSuggestion('Viết ra một việc nhỏ nhất có thể làm ngay.'), true);
  assert.equal(isGenericAssistanceSuggestion('Chọn một bước tiếp theo.'), true);
  assert.equal(isGenericAssistanceSuggestion('Viết một câu mô tả người dùng chính của ứng dụng.'), false);
  let calls = 0;
  t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async (options: RequestInit) => {
    calls++;
    const body = JSON.parse(String(options.body));
    if (calls <= 2) {
      assert.match(body.messages[0].content, /không tự tạo ghi chú/i);
      assert.match(body.messages[0].content, /giống lời gợi ý của một người hướng dẫn học CNTT kiên nhẫn/i);
    } else assert.doesNotMatch(body.messages[0].content, /không tự tạo ghi chú/i);
    return Response.json(completion({ ...step, recoveryStep: calls !== 2
      ? 'Viết ra một việc nhỏ nhất có thể làm ngay.' : 'Viết một câu mô tả mục tiêu của báo cáo.' }));
  });
  const candidate = new BeeknoeeAssistanceProvider(readApiConfig({ API_ASSISTANCE_PROVIDER: 'beeknoee', BEEKNOEE_API_KEY: 'fixture',
    API_ASSISTANCE_QUALITY_V2: 'true', API_LOG_LEVEL: 'silent' }), new BeeknoeeHttpTransport());
  assert.equal((await candidate.generate(input)).kind, 'fallback');
  assert.equal((await candidate.generate(input)).kind, 'validated');
  assert.equal((await provider().generate(input)).kind, 'validated', 'v1 demo behavior remains selected by default');
  assert.equal(calls, 3, 'one provider call per user request');
});

test('server-supplied context is read once, included as untrusted data, without extra model calls', async t => {
  const reads: string[] = []; let calls = 0;
  t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async (options: RequestInit) => {
    calls++; const body = JSON.parse(String(options.body));
    assert.deepEqual(JSON.parse(body.messages[1].content).authorizedContext, { get_my_open_seed: { text: 'Fictional approved seed' } });
    assert.equal(body.tools, undefined); return Response.json(completion(step));
  });
  assert.equal((await provider().generate(input, { names: ['get_my_open_seed'], read: async name => { reads.push(name); return { text: 'Fictional approved seed' }; } })).kind, 'validated');
  assert.deepEqual(reads, ['get_my_open_seed']); assert.equal(calls, 1);
});

test('context errors, oversized context, unknown and duplicate tools never reach the provider', async t => {
  let calls = 0; t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async () => { calls++; throw new Error('unexpected call'); });
  await assert.rejects(provider().generate(input, { names: ['get_my_open_seed'], read: async () => { throw new Error('stale consent'); } }));
  await assert.rejects(provider().generate(input, { names: ['get_my_open_seed'], read: async () => 'x'.repeat(8193) }));
  await assert.rejects(provider().generate(input, { names: ['delete_account' as any], read: async () => { throw new Error('must not read'); } }));
  await assert.rejects(provider().generate(input, { names: ['get_my_open_seed', 'get_my_open_seed'], read: async () => null }));
  assert.equal(calls, 0);
});

test('errors, invalid JSON, schema violations, truncation, tool calls and oversized bodies fail without retry', async t => {
  const responses = [new Response('unauthorized', { status: 401 }), new Response('quota', { status: 429 }), new Response('down', { status: 503 }),
    new Response('x'.repeat(32769)), new Response('not json'), Response.json(completion({ ...step, accountId: 'invented' })),
    Response.json(completion({ ...step, capability: 'assisted_start' })), Response.json(completion({ ...step, recoveryStep: '- item\n- item' })),
    Response.json({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }),
    Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] }),
    Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(step), tool_calls: [{}] } }] })];
  for (const response of responses) {
    let calls = 0; t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async () => { calls++; return response; });
    await assert.rejects(provider().generate(input)); assert.equal(calls, 1); t.mock.restoreAll();
  }
});

test('provider refusal and sensitive context produce boundary without exposing provider messages', async t => {
  t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async () => Response.json({ choices: [{ finish_reason: 'content_filter', message: { content: null, refusal: 'private provider detail' } }] }));
  assert.deepEqual(await provider().generate(input), { kind: 'boundary' }); t.mock.restoreAll();
  let calls = 0; t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async () => { calls++; throw new Error('must not call'); });
  assert.deepEqual(await provider().generate(input, { names: ['get_my_open_seed'], read: async () => ({ text: 'Yêu cầu chẩn đoán' }) }), { kind: 'boundary' });
  assert.equal(calls, 0);
});

test('deadline includes an unresponsive provider and context reads; no late model call after abort', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | null | undefined, calls = 0;
  t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async (options: RequestInit) => { calls++; signal = options.signal; return new Promise<Response>(() => {}); });
  const pending = provider().generate(input); t.mock.timers.tick(12001); await assert.rejects(pending, /deadline/); assert.equal(signal?.aborted, true);
  let release!: (value: unknown) => void;
  const waiting = provider().generate(input, { names: ['get_my_open_seed'], read: () => new Promise(resolve => { release = resolve; }) });
  t.mock.timers.tick(12001); await assert.rejects(waiting, /deadline/);
  release(null); await Promise.resolve(); await Promise.resolve(); assert.equal(calls, 1);
});

test('quota exhaustion and unavailable provider preserve the service fallback without raw errors', async t => {
  let calls = 0;
  t.mock.method(BeeknoeeHttpTransport.prototype, 'request', async () => { calls++; throw new Error('private provider detail'); });
  const analytics = { reserveAssistanceRequest: async () => null, record: async () => {} } as unknown as Analytics;
  const service = new AssistanceService(assistanceConfiguration(config()), provider(), analytics, emptyAssistanceContext);
  assert.equal((await service.suggest('owner', input)).status, 'fallback'); assert.equal(calls, 0);
  analytics.reserveAssistanceRequest = async () => 'a96f77d6-070b-4425-a095-c8e3009d39eb';
  const result = await service.suggest('owner', input); assert.equal(result.status, 'fallback');
  assert.equal(JSON.stringify(result).includes('private provider detail'), false); assert.equal(calls, 1);
});
