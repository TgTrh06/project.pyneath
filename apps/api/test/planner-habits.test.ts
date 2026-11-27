import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateHabitStreaks } from '../src/modules/habits/domain/habit-streak';
import { HabitNotFoundError, HabitsService } from '../src/modules/habits/application/habits.service';
import { PlannerNotFoundError, PlannerService } from '../src/modules/planner/application/planner.service';

test('calculateHabitStreaks computes current, best streak, and today completion', () => {
  assert.deepEqual(calculateHabitStreaks([], '2026-11-27'), {
    currentStreak: 0,
    bestStreak: 0,
    completedToday: false,
  });

  assert.deepEqual(
    calculateHabitStreaks(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-25', '2026-11-26'], '2026-11-27'),
    { currentStreak: 2, bestStreak: 3, completedToday: false },
  );

  assert.deepEqual(
    calculateHabitStreaks(['2026-11-25', '2026-11-26', '2026-11-27'], '2026-11-27'),
    { currentStreak: 3, bestStreak: 3, completedToday: true },
  );
});

test('PlannerService enforces not-found errors on missing update or delete', async () => {
  const service = new PlannerService({
    list: async () => [],
    create: async (_accountId, input) => ({
      id: '00000000-0000-4000-8000-000000000001',
      title: input.title,
      description: input.description ?? null,
      scheduledDate: input.scheduledDate,
      startTime: input.startTime ?? null,
      durationMinutes: input.durationMinutes ?? 25,
      priority: input.priority ?? 'medium',
      status: 'todo',
      linkedSessionId: null,
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    }),
    update: async () => null,
    remove: async () => false,
  });

  const created = await service.create('owner', {
    title: 'Ôn tập hệ điều hành',
    scheduledDate: '2026-11-27',
    durationMinutes: 50,
    priority: 'high',
  });
  assert.equal(created.title, 'Ôn tập hệ điều hành');
  await assert.rejects(() => service.update('owner', '00000000-0000-4000-8000-000000000002', { status: 'done' }), PlannerNotFoundError);
  await assert.rejects(() => service.remove('owner', '00000000-0000-4000-8000-000000000002'), PlannerNotFoundError);
});

test('HabitsService enforces not-found errors on missing update, toggle, or delete', async () => {
  const service = new HabitsService({
    list: async () => [],
    create: async (_accountId, input) => ({
      id: '00000000-0000-4000-8000-000000000010',
      title: input.title,
      description: input.description ?? null,
      frequency: input.frequency ?? 'daily',
      targetPerWeek: input.targetPerWeek ?? 7,
      reminderTime: input.reminderTime ?? null,
      archived: false,
      currentStreak: 0,
      bestStreak: 0,
      completedToday: false,
      recentDates: [],
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    }),
    update: async () => null,
    toggleLog: async () => null,
    remove: async () => false,
  });

  const created = await service.create('owner', { title: 'Đọc 20 phút', frequency: 'daily', targetPerWeek: 7 }, '2026-11-27');
  assert.equal(created.title, 'Đọc 20 phút');
  await assert.rejects(() => service.update('owner', '00000000-0000-4000-8000-000000000011', { archived: true }, '2026-11-27'), HabitNotFoundError);
  await assert.rejects(() => service.toggleLog('owner', '00000000-0000-4000-8000-000000000011', { logDate: '2026-11-27', completed: true }), HabitNotFoundError);
  await assert.rejects(() => service.remove('owner', '00000000-0000-4000-8000-000000000011'), HabitNotFoundError);
});
