import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from '../../identity/infrastructure/identity.schema';

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  frequency: text('frequency').notNull().default('daily'),
  targetPerWeek: integer('target_per_week').notNull().default(7),
  reminderTime: text('reminder_time'),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const habitLogs = pgTable('habit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  logDate: text('log_date').notNull(),
  completed: boolean('completed').notNull().default(true),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type HabitRow = InferSelectModel<typeof habits>;
export type HabitInsert = InferInsertModel<typeof habits>;
export type HabitLogRow = InferSelectModel<typeof habitLogs>;
