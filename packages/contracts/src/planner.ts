import { z } from 'zod';
import { dateTimeSchema, idSchema } from './shared';

export const plannerPrioritySchema = z.enum(['low', 'medium', 'high']);
export type PlannerPriority = z.infer<typeof plannerPrioritySchema>;

export const plannerStatusSchema = z.enum(['todo', 'in_progress', 'done']);
export type PlannerStatus = z.infer<typeof plannerStatusSchema>;

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const createPlannerItemSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  scheduledDate: dateKeySchema,
  startTime: timeOfDaySchema.nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).default(25),
  priority: plannerPrioritySchema.default('medium'),
}).strict();
export type CreatePlannerItem = z.infer<typeof createPlannerItemSchema>;

export const updatePlannerItemSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  scheduledDate: dateKeySchema.optional(),
  startTime: timeOfDaySchema.nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  priority: plannerPrioritySchema.optional(),
  status: plannerStatusSchema.optional(),
  linkedSessionId: idSchema.nullable().optional(),
}).strict();
export type UpdatePlannerItem = z.infer<typeof updatePlannerItemSchema>;

export const plannerItemSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  scheduledDate: dateKeySchema,
  startTime: timeOfDaySchema.nullable(),
  durationMinutes: z.number().int(),
  priority: plannerPrioritySchema,
  status: plannerStatusSchema,
  linkedSessionId: idSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).strict();
export type PlannerItem = z.infer<typeof plannerItemSchema>;
