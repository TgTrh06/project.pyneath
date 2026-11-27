import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { CreateHabit, HabitFrequency, HabitLog, HabitWithStats, ToggleHabitLog, UpdateHabit } from '@pyneath/contracts';
import { PostgresUnitOfWork } from '../../../platform/database/postgres-unit-of-work';
import type { HabitsRepositoryPort } from '../application/habits.service';
import { calculateHabitStreaks } from '../domain/habit-streak';
import { habitLogs, habits, type HabitRow } from './habits.schema';

function toStatsDto(row: HabitRow, completedDates: string[], today: string): HabitWithStats {
  const streaks = calculateHabitStreaks(completedDates, today);
  const recentDates = Array.from(new Set(completedDates)).sort().slice(-14);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    frequency: row.frequency as HabitFrequency,
    targetPerWeek: row.targetPerWeek,
    reminderTime: row.reminderTime,
    archived: row.archived,
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    completedToday: streaks.completedToday,
    recentDates,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class DrizzleHabitsRepository implements HabitsRepositoryPort {
  constructor(private readonly transactions: PostgresUnitOfWork) {}

  async list(accountId: string, today: string): Promise<HabitWithStats[]> {
    const habitRows = await this.transactions.reader()
      .select()
      .from(habits)
      .where(eq(habits.accountId, accountId))
      .orderBy(asc(habits.archived), asc(habits.createdAt));

    if (habitRows.length === 0) return [];

    const logs = await this.transactions.reader()
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.accountId, accountId), eq(habitLogs.completed, true)));

    const datesByHabit = new Map<string, string[]>();
    for (const log of logs) {
      const list = datesByHabit.get(log.habitId) ?? [];
      list.push(log.logDate);
      datesByHabit.set(log.habitId, list);
    }

    return habitRows.map(row => toStatsDto(row, datesByHabit.get(row.id) ?? [], today));
  }

  async create(accountId: string, input: CreateHabit, today: string): Promise<HabitWithStats> {
    const [row] = await this.transactions.reader()
      .insert(habits)
      .values({
        accountId,
        title: input.title,
        description: input.description ?? null,
        frequency: input.frequency ?? 'daily',
        targetPerWeek: input.targetPerWeek ?? 7,
        reminderTime: input.reminderTime ?? null,
      })
      .returning();
    return toStatsDto(row, [], today);
  }

  async update(accountId: string, id: string, input: UpdateHabit, today: string): Promise<HabitWithStats | null> {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.frequency !== undefined) patch.frequency = input.frequency;
    if (input.targetPerWeek !== undefined) patch.targetPerWeek = input.targetPerWeek;
    if (input.reminderTime !== undefined) patch.reminderTime = input.reminderTime;
    if (input.archived !== undefined) patch.archived = input.archived;

    const [row] = await this.transactions.reader()
      .update(habits)
      .set(patch)
      .where(and(eq(habits.id, id), eq(habits.accountId, accountId)))
      .returning();
    if (!row) return null;

    const logs = await this.transactions.reader()
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, id), eq(habitLogs.accountId, accountId), eq(habitLogs.completed, true)));
    return toStatsDto(row, logs.map(l => l.logDate), today);
  }

  async toggleLog(accountId: string, habitId: string, input: ToggleHabitLog): Promise<HabitLog | null> {
    const [owned] = await this.transactions.reader()
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.accountId, accountId)));
    if (!owned) return null;

    const [row] = await this.transactions.reader()
      .insert(habitLogs)
      .values({
        habitId,
        accountId,
        logDate: input.logDate,
        completed: input.completed,
        note: input.note ?? null,
      })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.logDate],
        set: { completed: input.completed, note: input.note ?? null },
      })
      .returning();

    return {
      id: row.id,
      habitId: row.habitId,
      logDate: row.logDate,
      completed: row.completed,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async remove(accountId: string, id: string): Promise<boolean> {
    const rows = await this.transactions.reader()
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.accountId, accountId)))
      .returning({ id: habits.id });
    return rows.length > 0;
  }
}
