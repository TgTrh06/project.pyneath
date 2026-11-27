import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from '../../identity/infrastructure/identity.schema';

export const plannerItems = pgTable('planner_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  scheduledDate: text('scheduled_date').notNull(),
  startTime: text('start_time'),
  durationMinutes: integer('duration_minutes').notNull().default(25),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('todo'),
  linkedSessionId: uuid('linked_session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlannerItemRow = InferSelectModel<typeof plannerItems>;
export type PlannerItemInsert = InferInsertModel<typeof plannerItems>;
