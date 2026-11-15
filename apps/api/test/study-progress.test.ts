import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Subject } from 'rxjs';
import { recordStudyStepSchema, studyDashboardSchema, studyStepInputSchema } from '@pyneath/contracts';
import { FocusService } from '../src/modules/focus/application/focus.service';

test('study record contract requires a user-confirmed status and rejects oversized private fields', () => {
  assert.equal(studyStepInputSchema.safeParse({ stepText: 'Ôn chương hai', stepStatus: 'partial' }).success, true);
  assert.equal(recordStudyStepSchema.safeParse({ stepText: 'Ôn', stepStatus: 'completed', openSeed: 'Làm bài tập' }).success, true);
  assert.equal(studyStepInputSchema.safeParse({ stepText: 'x'.repeat(281), stepStatus: 'completed' }).success, false);
  assert.equal(studyStepInputSchema.safeParse({ stepText: 'Ôn', stepStatus: 'inferred' }).success, false);
});

test('dashboard response contract accepts only the intended private step projection', () => {
  const item = { sessionId: 'a96f77d6-070b-4425-a095-c8e3009d39eb', stepText: 'Ôn khóa ngoại', stepStatus: 'partial',
    note: null, recordedAt: '2026-11-13T00:00:00.000Z', updatedAt: '2026-11-13T00:00:00.000Z' };
  const day = { date: '2026-11-13', completed: 0, partial: 1, notStarted: 0, soloSessions: 1, campSessions: 0 };
  const dashboard = { completedSteps: 0, recordedSessions: 1, timezone: 'Asia/Ho_Chi_Minh', steps: [item],
    hasMore: false, openSeed: null, unrecordedSessions: [], progress: { periodDays: 7, today: '2026-11-13', days: [day] } };
  assert.equal(studyDashboardSchema.safeParse(dashboard).success, true);
  assert.equal(studyDashboardSchema.safeParse({ ...dashboard, steps: [{ ...item, accountId: 'private' }] }).success, false);
  assert.equal(studyDashboardSchema.safeParse({ ...dashboard, progress: { ...dashboard.progress, days: [{ ...day, accountId: 'private' }] } }).success, false);
});

test('post-session recording checks ownership and lifecycle before writing, and updates seed in the same transaction', async () => {
  const now = new Date('2026-11-13T00:00:00Z'), context = {};
  let active = false, owner = true, writes = 0, seedWrites = 0;
  const repo = { find: async () => ({ kind: 'solo', status: active ? 'active' : 'completed', endsAt: new Date(now.getTime() + 10000) }),
    participant: async () => owner ? {} : undefined, hasStudyStep: async () => writes > 0,
    saveStudyStep: async (_session: string, _actor: string, input: unknown, _now: Date, tx: unknown) => { assert.equal(tx, context); writes++; return input; } };
  const transactions = { run: async (fn: (tx: unknown) => Promise<unknown>) => fn(context) };
  let seedText = 'Làm bài tập';
  const seeds = { get: async () => ({ text: seedText }), upsert: async (_actor: string, _seed: unknown, tx: unknown) => { assert.equal(tx, context); seedWrites++; }, remove: async () => {} };
  const service = new FocusService(repo as never, transactions as never, {} as never, {} as never, seeds as never,
    {} as never, {} as never, { now: () => now }, { changes: new Subject<string>(), presenceChanges: new Subject() });
  const input = { stepText: 'Ôn chương hai', stepStatus: 'partial' as const, openSeed: 'Làm bài tập' };
  owner = false; await assert.rejects(service.recordStudyStep('session', 'other', input)); assert.equal(writes, 0);
  owner = true; active = true; await assert.rejects(service.recordStudyStep('session', 'owner', input)); assert.equal(writes, 0);
  active = false; await service.recordStudyStep('session', 'owner', input);
  assert.equal(writes, 1); assert.equal(seedWrites, 1);
  await service.recordStudyStep('session', 'owner', input);
  assert.equal(writes, 2); assert.equal(seedWrites, 1, 'replay cannot overwrite a newer seed');
  seedText = 'Một điểm tiếp tục mới';
  await assert.rejects(service.recordStudyStep('session', 'owner', input));
  assert.equal(writes, 2, 'stale replay must not overwrite edited data or the newer seed');
});

test('an expired active session can be recorded without changing the session or guessing its outcome', async () => {
  const now = new Date('2026-11-13T00:00:00Z'), context = {};
  let saved = 0;
  const repo = { find: async () => ({ kind: 'solo', status: 'active', endsAt: new Date(now.getTime() - 1000) }),
    participant: async () => ({}), hasStudyStep: async () => false,
    saveStudyStep: async (_id: string, _actor: string, value: unknown) => { saved++; return value; } };
  const service = new FocusService(repo as never, { run: async (fn: (tx: unknown) => Promise<unknown>) => fn(context) } as never,
    {} as never, {} as never, {} as never, {} as never, {} as never, { now: () => now },
    { changes: new Subject<string>(), presenceChanges: new Subject() });
  const recorded = await service.recordStudyStep('session', 'owner', { stepText: 'Ôn khóa ngoại', stepStatus: 'not_started' });
  assert.deepEqual(recorded, { stepText: 'Ôn khóa ngoại', stepStatus: 'not_started' });
  assert.equal(saved, 1);
});

test('checkout records a user-selected study step and seed for both early and just-expired Solo sessions', async () => {
  const now = new Date('2026-11-13T00:00:00Z');
  for (const expired of [false, true]) {
    const context = {}, actions: string[] = [];
    const session = { id: 'session', kind: 'solo', campId: null, pactId: null, status: 'active',
      endsAt: new Date(now.getTime() + (expired ? -1000 : 1000)) };
    const repo = { find: async () => session, participant: async () => ({ id: 'participant', presence: 'active' }),
      complete: async () => { actions.push('complete'); return true; },
      stopParticipants: async () => { actions.push('stop'); },
      checkOutParticipant: async (_id: string, outcome: string, _now: Date, tx: unknown) => { assert.equal(tx, context); actions.push(`outcome:${outcome}`); },
      hasRemaining: async () => false,
      saveStudyStep: async (_id: string, _account: string, step: { stepStatus: string }, _now: Date, tx: unknown) => {
        assert.equal(tx, context); actions.push(`step:${step.stepStatus}`); return step;
      } };
    const seeds = { upsert: async (_account: string, _seed: unknown, tx: unknown) => { assert.equal(tx, context); actions.push('seed'); } };
    const service = new FocusService(repo as never, { run: async (fn: (tx: unknown) => Promise<unknown>) => fn(context) } as never,
      {} as never, {} as never, seeds as never, {} as never, { record: async () => {} } as never, { now: () => now },
      { changes: new Subject<string>(), presenceChanges: new Subject() });
    service.snapshot = async () => ({ id: 'session' }) as never;
    await service.checkout('session', 'owner', { outcome: 'progress', openSeed: 'Làm tiếp bài tập',
      studyStep: { stepText: 'Ôn khóa ngoại', stepStatus: 'partial' } });
    assert.ok(actions.includes('step:partial')); assert.ok(actions.includes('seed'));
    assert.equal(actions.includes('outcome:progress'), !expired);
    assert.equal(actions.includes('stop'), expired);
  }
});
