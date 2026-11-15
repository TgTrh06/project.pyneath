import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import type { AssistanceContextSnapshot, AssistanceOutput } from '@pyneath/contracts';
import { AssistanceContext } from '../src/modules/assistance/infrastructure/assistance-context';
import { AssistanceService } from '../src/modules/assistance/application/assistance.service';
import { AssistanceController } from '../src/modules/assistance/presentation/assistance.controller';
import { AssistanceToolsController } from '../src/modules/assistance/presentation/assistance-tools.controller';
import { IdentityGuard } from '../src/modules/identity/presentation/identity.guard';
import { IdentityHttpAdapter } from '../src/modules/identity/presentation/identity-http.adapter';
import { API_CONFIG, readApiConfig } from '../src/platform/config/api-config';
import type { SeedAccess } from '../src/modules/seed/public-api';
import type { Analytics } from '../src/modules/analytics/public-api';
import { OpenAiAssistanceProvider } from '../src/modules/assistance/infrastructure/openai-assistance.provider';
import { LocalAssistanceProvider } from '../src/modules/assistance/infrastructure/local-assistance.provider';

const input = { capability: 'assisted_start', description: 'Đọc tài liệu giả' } as const;
const output: AssistanceOutput = { capability: 'assisted_start', version: '1', needsHumanSupport: false,
  fallback: 'manual_step', activationStep: 'Mở tài liệu giả.', estimatedMinutes: 3 };
const empty: AssistanceContextSnapshot = { get_current_focus_context: null, get_my_open_seed: null };
function fixture(load: (id: string) => Promise<AssistanceContextSnapshot>) {
  let reservations = 0; const received: unknown[] = [], events: unknown[] = [];
  const analytics = { reserveAssistanceRequest: async () => { reservations++; return '11111111-1111-4111-8111-111111111111'; },
    record: async (...args: unknown[]) => { events.push(args); } } as unknown as Analytics;
  const service = new AssistanceService({ enabled: true, processing: 'external', capabilities: ['assisted_start'] }, {
    generate: async (_input, tools) => {
      assert.deepEqual(tools?.names, ['get_current_focus_context', 'get_my_open_seed']);
      received.push({ focus: await tools!.read('get_current_focus_context'), seed: await tools!.read('get_my_open_seed') });
      return { kind: 'validated', output };
    }
  }, analytics, { load }, { provider: 'fixture', model: 'fixture', diagnostics: true });
  return { service, received, events, reservations: () => reservations };
}

test('context reads only the authenticated account and projects no seed identifiers', async () => {
  const reads: string[] = [];
  const context = new AssistanceContext({ readOwnContext: async id => { reads.push(`focus:${id}`); return null; } },
    { get: async (id: string) => { reads.push(`seed:${id}`); return id === 'alice' ? { id: 'private-id', accountId: id, text: 'Điểm của Alice' } : null; } } as unknown as SeedAccess);
  assert.deepEqual(await context.load('alice'), { ...empty, get_my_open_seed: { text: 'Điểm của Alice' } });
  assert.deepEqual(await context.load('bob'), empty);
  assert.deepEqual(reads, ['focus:alice', 'seed:alice', 'focus:bob', 'seed:bob']);
});

test('every request refreshes both sources, including valid absent data, without leaking content in logs', async () => {
  let text: string | null = null; const accounts: string[] = [];
  const f = fixture(async id => { accounts.push(id); return { ...empty, get_my_open_seed: text ? { text } : null }; });
  assert.equal((await f.service.suggest('alice', input)).status, 'suggestion');
  text = 'PRIVATE_NEW_SEED'; assert.equal((await f.service.suggest('alice', input)).status, 'suggestion');
  assert.deepEqual(accounts, ['alice', 'alice']);
  assert.deepEqual(f.received, [{ focus: null, seed: null }, { focus: null, seed: { text } }]);
  assert.equal(f.reservations(), 2); assert.ok(!JSON.stringify(f.events).includes(text));
});

test('a failed or incomplete context stops before quota reservation and inference', async () => {
  for (const load of [async () => { throw new Error('PRIVATE_DATABASE_ERROR'); }, async () => ({ get_my_open_seed: null } as AssistanceContextSnapshot)]) {
    const f = fixture(load), result = await f.service.suggest('alice', input);
    assert.equal(result.reason, 'context_unavailable'); assert.equal(f.reservations(), 0); assert.deepEqual(f.received, []);
    assert.ok(!JSON.stringify([result, f.events]).includes('PRIVATE_DATABASE_ERROR'));
  }
});

test('context timeout cannot initiate a late provider request or consume quota', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let release!: (value: AssistanceContextSnapshot) => void;
  const f = fixture(() => new Promise(resolve => { release = resolve; }));
  const pending = f.service.suggest('alice', input); t.mock.timers.tick(3001);
  assert.equal((await pending).reason, 'context_unavailable');
  release(empty); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.reservations(), 0); assert.deepEqual(f.received, []);
});

test('context safety boundary stops before quota and inference', async () => {
  const f = fixture(async () => ({ ...empty, get_my_open_seed: { text: 'Tôi muốn tự tử' } }));
  assert.equal((await f.service.suggest('alice', input)).status, 'boundary');
  assert.equal(f.reservations(), 0); assert.deepEqual(f.received, []);
});

test('HTTP requires authentication and CSRF, rejects client context/account injection, and removes grant routes', async t => {
  const accounts: string[] = []; const f = fixture(async id => { accounts.push(id); return empty; });
  const module = await Test.createTestingModule({ controllers: [AssistanceController, AssistanceToolsController], providers: [
    { provide: AssistanceService, useValue: f.service }, { provide: API_CONFIG, useValue: readApiConfig({}) },
    { provide: IdentityHttpAdapter, useValue: {
      session: async (req: { headers: Record<string, string> }) => req.headers.authorization === 'fixture' ? { account: { id: 'alice', email: 'alice@example.test' } } : null,
      csrf: async (req: { headers: Record<string, string> }) => { if (req.headers['x-xsrf-token'] !== 'fixture') throw new ForbiddenException(); }
    } }, { provide: APP_GUARD, useClass: IdentityGuard }
  ] }).compile();
  const app = module.createNestApplication({ logger: false }); await app.init(); t.after(() => app.close());
  const server = app.getHttpServer(), path = '/api/v1/me/assistance';
  await request(server).post(path).send(input).expect(401);
  await request(server).post(path).set('Authorization', 'fixture').send(input).expect(403);
  for (const extra of [{ accountId: 'bob' }, { authorizedContext: empty }, { grants: [] }]) {
    await request(server).post(path).set('Authorization', 'fixture').set('X-XSRF-TOKEN', 'fixture').send({ ...input, ...extra }).expect(400);
  }
  assert.deepEqual(accounts, []);
  await request(server).post(path).set('Authorization', 'fixture').set('X-XSRF-TOKEN', 'fixture').send(input).expect(201);
  assert.deepEqual(accounts, ['alice']);
  await request(server).get(`${path}/tools/context`).set('Authorization', 'fixture').expect(404);
  await request(server).post(`${path}/tools`).set('Authorization', 'fixture').set('X-XSRF-TOKEN', 'fixture').send({ request: input, grants: [] }).expect(404);
});

test('OpenAI and local adapters include both context sources in inference payloads', async t => {
  const context = { ...empty, get_my_open_seed: { text: 'PRIVATE_FIXTURE_SEED' } };
  const tools = { names: ['get_current_focus_context', 'get_my_open_seed'] as Array<keyof AssistanceContextSnapshot>, read: async (name: keyof AssistanceContextSnapshot) => context[name] };
  const payloads: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    if (String(url).endsWith('/moderations')) return Response.json({ results: [{ flagged: false }] });
    payloads.push(payload);
    return String(url).endsWith('/responses')
      ? Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ activationStep: output.activationStep, estimatedMinutes: 3 }) }] }] })
      : Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] });
  });
  const config = readApiConfig({ OPENAI_API_KEY: 'fixture', API_LOCAL_AI_URL: 'http://127.0.0.1:8011', API_LOCAL_AI_TOKEN: 'fixture-token-not-real-at-all', API_LOCAL_AI_MODEL: 'fixture', API_LOG_LEVEL: 'silent' });
  assert.equal((await new OpenAiAssistanceProvider(config).generate(input, tools)).kind, 'validated');
  assert.equal((await new LocalAssistanceProvider(config).generate(input, tools)).kind, 'validated');
  assert.deepEqual(JSON.parse(payloads[0].input[1].content).authorizedContext, context);
  assert.deepEqual(JSON.parse(payloads[1].messages[1].content).authorizedContext, context);
});
