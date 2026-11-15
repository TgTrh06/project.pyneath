import { z } from 'zod';

export const assistanceToolNameSchema = z.enum(['get_current_focus_context', 'get_my_open_seed']);
export type AssistanceToolName = z.infer<typeof assistanceToolNameSchema>;
export const focusContextSchema = z.object({
  kind: z.enum(['solo', 'pact']), status: z.literal('active'),
  intention: z.string().max(280).nullable(), durationMinutes: z.number().int().positive(),
  endsAt: z.iso.datetime(), presence: z.enum(['active', 'break', 'disconnected'])
}).strict().nullable();
export type OwnFocusContext = z.infer<typeof focusContextSchema>;
export const seedContextSchema = z.object({ text: z.string().max(500) }).strict().nullable();
// Both keys are required; null explicitly means no current data.
export const assistanceContextSchema = z.object({
  get_current_focus_context: focusContextSchema,
  get_my_open_seed: seedContextSchema
}).strict();
export type AssistanceContextSnapshot = z.infer<typeof assistanceContextSchema>;
export const assistanceToolsConfigSchema = z.object({ enabled: z.boolean(), provider: z.enum(['gemini', 'openrouter', 'beeknoee', 'openai', 'local', 'disabled']),
  tools: z.array(assistanceToolNameSchema).max(2) }).strict();
export type AssistanceToolsConfig = z.infer<typeof assistanceToolsConfigSchema>;
