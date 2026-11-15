import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Subject } from 'rxjs';
import { accounts } from '../src/modules/identity/infrastructure/identity.schema';
import { studySteps } from '../src/modules/focus/infrastructure/focus.schema';
import { FocusService } from '../src/modules/focus/application/focus.service';
import { DrizzleFocusRepository } from '../src/modules/focus/infrastructure/focus.repository';
import type { DatabaseService } from '../src/platform/database/database.service';
import { createCamps, createPacts, createPrivacy, createSeeds, transactionsFor } from './helpers/module-fixtures';
import { SharedMemoryService } from '../src/modules/memory/application/shared-memory.service';
import { DrizzleSharedMemoryRepository } from '../src/modules/memory/infrastructure/shared-memory.repository';
import type { Analytics } from '../src/modules/analytics/public-api';

test('study steps use private atomic records, retain original date on edit, count beyond 100 and cascade on deletion',
  { skip: !process.env.PYNEATH_TEST_DATABASE_URL }, async () => {
  const schema = `study_${randomBytes(8).toString('hex')}`;
  const pool = new Pool({ connectionString: process.env.PYNEATH_TEST_DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const migrations = resolve(__dirname, '../../drizzle');
    for (const name of readdirSync(migrations).filter(name => /^\d+.*\.sql$/.test(name)).sort())
      await client.query(readFileSync(resolve(migrations, name), 'utf8').replaceAll('"public"', `"${schema}"`));
    const db = drizzle(client), database = { db } as unknown as DatabaseService;
    const [owner, other] = await db.insert(accounts).values([{ email: 'owner@fixture.test', passwordHash: 'fixture' },
      { email: 'other@fixture.test', passwordHash: 'fixture' }]).returning();
    const analytics = { record: async () => {}, reserveAssistanceRequest: async () => null, ownsAssistanceRequest: async () => false } as unknown as Analytics;
    const transactions = transactionsFor(database), repo = new DrizzleFocusRepository(transactions);
    const camps = createCamps(database, analytics), pacts = createPacts(database, camps, analytics), seeds = createSeeds(database);
    const memory = new SharedMemoryService(new DrizzleSharedMemoryRepository(transactions));
    let now = new Date('2026-11-13T02:00:00Z');
    const service = new FocusService(repo, transactions, camps, pacts, seeds, memory, analytics, { now: () => now },
      { changes: new Subject<string>(), presenceChanges: new Subject() });
    const session = await service.startSolo(owner.id, { intention: 'Ôn khóa chính', durationMinutes: 5 }, 'study-first');
    await assert.rejects(service.recordStudyStep(session.id, other.id, { stepText: 'Khác', stepStatus: 'partial' }));
    await assert.rejects(service.recordStudyStep(session.id, owner.id, { stepText: 'Ôn', stepStatus: 'partial' }));
    const original = seeds.upsert.bind(seeds);
    seeds.upsert = async (...args) => { await original(...args); throw new Error('fixture rollback'); };
    await assert.rejects(service.checkout(session.id, owner.id, { outcome: 'progress',
      studyStep: { stepText: 'Ôn khóa chính', stepStatus: 'partial' }, openSeed: 'Làm bài tập' }));
    assert.equal((await db.select().from(studySteps)).length, 0);
    seeds.upsert = original;
    await service.checkout(session.id, owner.id, { outcome: 'progress', studyStep: { stepText: 'Ôn khóa chính', stepStatus: 'partial' }, openSeed: 'Làm bài tập' });
    const before = (await repo.exportStudySteps(owner.id))[0];
    now = new Date('2026-11-13T03:00:00Z');
    await service.recordStudyStep(session.id, owner.id, { stepText: 'Ôn khóa ngoại', stepStatus: 'completed' });
    const after = (await repo.exportStudySteps(owner.id))[0];
    assert.equal(after.recordedAt.toISOString(), before.recordedAt.toISOString());
    assert.equal((await seeds.get(owner.id))?.text, 'Làm bài tập');
    const exported = await createPrivacy(database, {} as never).export(owner.id);
    assert.equal(exported.studySteps.length, 1);
    assert.equal(exported.studySteps[0].stepText, 'Ôn khóa ngoại');
    assert.equal((await createPrivacy(database, {} as never).export(other.id)).studySteps.length, 0);
    const expiredSession = await service.startSolo(owner.id, { intention: 'Ôn chương ba', durationMinutes: 5 }, 'study-expired');
    now = new Date('2026-11-13T03:06:00Z');
    await service.recordStudyStep(expiredSession.id, owner.id, { stepText: 'Ôn chương ba', stepStatus: 'not_started' });
    assert.equal((await repo.exportStudySteps(owner.id)).find(step => step.sessionId === expiredSession.id)?.stepStatus, 'not_started');
    const rows = await client.query(`INSERT INTO focus_sessions (kind, started_by_account_id, duration_minutes, status, started_at, ends_at, request_key)
      SELECT 'solo', $1, 5, 'completed', $2, $2, 'bulk-' || i FROM generate_series(1, 101) i RETURNING id`, [owner.id, now]);
    for (const row of rows.rows) await client.query(`INSERT INTO study_steps (session_id, account_id, step_text, step_status, recorded_at, updated_at)
      VALUES ($1, $2, 'Bước giả', 'completed', $3, $3)`, [row.id, owner.id, now]);
    const boundaries = await client.query(`INSERT INTO focus_sessions (kind, started_by_account_id, duration_minutes, status, started_at, ends_at, request_key)
      VALUES ('solo', $1, 5, 'completed', $2, $2, 'boundary-before'), ('solo', $1, 5, 'completed', $2, $2, 'boundary-after') RETURNING id`, [owner.id, now]);
    for (const [index, time] of ['2026-11-06T16:59:59Z', '2026-11-06T17:00:00Z'].entries())
      await client.query(`INSERT INTO study_steps (session_id, account_id, step_text, step_status, recorded_at, updated_at)
        VALUES ($1, $2, 'Ranh giới giả', 'completed', $3, $3)`, [boundaries.rows[index].id, owner.id, time]);
    assert.equal((await repo.studyCounts(owner.id, 'Asia/Ho_Chi_Minh', now)).completedSteps, 103);
    assert.equal((await repo.studyCounts(owner.id, 'Asia/Ho_Chi_Minh', now)).recordedSessions, 104);
    assert.equal((await repo.studyCounts(other.id, 'Asia/Ho_Chi_Minh', now)).recordedSessions, 0);
    const timeline = await repo.studyTimeline(owner.id, 'Asia/Ho_Chi_Minh', now, 14);
    assert.equal(timeline.find(day => day.date === '2026-11-06')?.completed, 1);
    assert.equal(timeline.find(day => day.date === '2026-11-07')?.completed, 1);
    assert.equal(timeline.find(day => day.date === '2026-11-13')?.completed, 102);
    assert.equal(timeline.find(day => day.date === '2026-11-13')?.soloSessions, 1);
    assert.deepEqual(await repo.studyTimeline(other.id, 'Asia/Ho_Chi_Minh', now, 14), []);
    const dashboard = await service.studyDashboard(owner.id, 'Asia/Ho_Chi_Minh', 0, 7);
    assert.equal(dashboard.progress.days.length, 14);
    assert.equal(dashboard.progress.today, '2026-11-13');
    assert.equal(dashboard.progress.days.at(-1)?.notStarted, 1);
    assert.equal((await service.studyDashboard(owner.id, 'Asia/Ho_Chi_Minh', 0, 30)).progress.days.length, 60);
    const privateDashboard = await service.studyDashboard(other.id, 'Asia/Ho_Chi_Minh', 0, 7);
    assert.equal(privateDashboard.progress.days.reduce((total, day) => total + day.completed + day.soloSessions + day.campSessions, 0), 0);
    assert.equal((await repo.studySteps(owner.id, 0)).length, 11);
    await client.query('DELETE FROM identity_accounts WHERE id = $1', [owner.id]);
    assert.equal((await db.select().from(studySteps)).length, 0);
  } finally {
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release(); await pool.end();
  }
});
