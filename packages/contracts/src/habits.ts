import { z } from 'zod';
import { dateTimeSchema, idSchema } from './shared';
import { dateKeySchema, timeOfDaySchema } from './planner';

export const habitFrequencySchema = z.enum(['daily', 'weekly']);
export type HabitFrequency = z.infer<typeof habitFrequencySchema>;

export const createHabitSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).nullable().optional(),
  frequency: habitFrequencySchema.default('daily'),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
  reminderTime: timeOfDaySchema.nullable().optional(),
}).strict();
export type CreateHabit = z.infer<typeof createHabitSchema>;

export const updateHabitSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  frequency: habitFrequencySchema.optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  reminderTime: timeOfDaySchema.nullable().optional(),
  archived: z.boolean().optional(),
}).strict();
export type UpdateHabit = z.infer<typeof updateHabitSchema>;

export const toggleHabitLogSchema = z.object({
  logDate: dateKeySchema,
  completed: z.boolean(),
  note: z.string().trim().max(300).nullable().optional(),
}).strict();
export type ToggleHabitLog = z.infer<typeof toggleHabitLogSchema>;

export const habitLogSchema = z.object({
  id: idSchema,
  habitId: idSchema,
  logDate: dateKeySchema,
  completed: z.boolean(),
  note: z.string().nullable(),
  createdAt: dateTimeSchema,
}).strict();
export type HabitLog = z.infer<typeof habitLogSchema>;

export const habitWithStatsSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  frequency: habitFrequencySchema,
  targetPerWeek: z.number().int(),
  reminderTime: timeOfDaySchema.nullable(),
  archived: z.boolean(),
  currentStreak: z.number().int(),
  bestStreak: z.number().int(),
  completedToday: z.boolean(),
  recentDates: z.array(dateKeySchema),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).strict();
export type HabitWithStats = z.infer<typeof habitWithStatsSchema>;
