import { z } from 'zod';
import { dateTimeSchema, idSchema } from './shared';

export const ragSourceTypeSchema = z.enum(['note', 'file', 'focus', 'study_step', 'planner', 'habit', 'seed']);
export type RagSourceType = z.infer<typeof ragSourceTypeSchema>;

export const createRagNoteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(50000),
}).strict();
export type CreateRagNote = z.infer<typeof createRagNoteSchema>;

export const ragDocumentSchema = z.object({
  id: idSchema,
  sourceType: ragSourceTypeSchema,
  title: z.string(),
  mimeType: z.string(),
  chunkCount: z.number().int(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).strict();
export type RagDocument = z.infer<typeof ragDocumentSchema>;

export const ragCitationSchema = z.object({
  documentId: idSchema,
  title: z.string(),
  sourceType: ragSourceTypeSchema,
  excerpt: z.string(),
  score: z.number(),
}).strict();
export type RagCitation = z.infer<typeof ragCitationSchema>;

export const chatSuggestedActionSchema = z.object({
  kind: z.enum(['add_to_planner', 'start_focus']),
  title: z.string(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
}).strict();
export type ChatSuggestedAction = z.infer<typeof chatSuggestedActionSchema>;

export const chatMessageSchema = z.object({
  id: idSchema,
  threadId: idSchema,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(ragCitationSchema),
  suggestedActions: z.array(chatSuggestedActionSchema),
  createdAt: dateTimeSchema,
}).strict();
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatThreadSchema = z.object({
  id: idSchema,
  title: z.string(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).strict();
export type ChatThread = z.infer<typeof chatThreadSchema>;

export const sendChatMessageSchema = z.object({
  threadId: idSchema.optional(),
  message: z.string().trim().min(1).max(4000),
}).strict();
export type SendChatMessage = z.infer<typeof sendChatMessageSchema>;
