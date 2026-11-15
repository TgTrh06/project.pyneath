import { z } from "zod";
import { dateTimeSchema, durationMinutesSchema, idSchema } from "./shared";

export const focusSessionStatusSchema = z.enum(["active", "completed", "cancelled"]);
// `hidden` is a projection only. It is never persisted or accepted by presence.set.
export const participantPresenceSchema = z.enum(["active", "break", "disconnected", "checked_out", "hidden"]);
export const checkoutOutcomeSchema = z.enum(["completed", "progress", "stuck", "stopped"]);
export const studyStepStatusSchema = z.enum(["completed", "partial", "not_started"]);
export const studyStepInputSchema = z.object({
    stepText: z.string().trim().min(1).max(280),
    stepStatus: studyStepStatusSchema,
    note: z.string().trim().max(500).nullable().optional()
}).strict();
export type StudyStepInput = z.infer<typeof studyStepInputSchema>;
export const studyStepRecordSchema = studyStepInputSchema.extend({
    sessionId: idSchema, recordedAt: dateTimeSchema, updatedAt: dateTimeSchema
});
export const recordStudyStepSchema = studyStepInputSchema.extend({
    openSeed: z.string().trim().min(1).max(500).nullable().optional()
}).strict();

export const openSeedSchema = z.object({
    id: idSchema,
    text: z.string(),
    sourceSessionId: idSchema.nullable(),
    updatedAt: dateTimeSchema
});
export const studyDashboardSchema = z.object({
    completedSteps: z.number().int().nonnegative(), recordedSessions: z.number().int().nonnegative(),
    timezone: z.string(), steps: z.array(studyStepRecordSchema), hasMore: z.boolean(), openSeed: openSeedSchema.nullable(),
    unrecordedSessions: z.array(z.object({ id: idSchema, intention: z.string().nullable(), startedAt: dateTimeSchema })),
    progress: z.object({ periodDays: z.union([z.literal(7), z.literal(30)]), today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        days: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), completed: z.number().int().nonnegative(),
            partial: z.number().int().nonnegative(), notStarted: z.number().int().nonnegative(),
            soloSessions: z.number().int().nonnegative(), campSessions: z.number().int().nonnegative() }).strict()) }).strict().optional()
});

export const upsertOpenSeedSchema = z.object({
    text: z.string().trim().min(1).max(500),
    sourceSessionId: idSchema.nullable().optional()
}).strict();

export const startSoloSessionSchema = z.object({
    intention: z.string().trim().min(1).max(280),
    durationMinutes: durationMinutesSchema
}).strict();

export const checkOutSchema = z.object({
    outcome: checkoutOutcomeSchema,
    openSeed: z.string().trim().min(1).max(500).nullable().optional(),
    studyStep: studyStepInputSchema.optional()
}).strict();

export const sessionParticipantSchema = z.object({
    accountId: idSchema,
    displayName: z.string().nullable(),
    presence: participantPresenceSchema,
    joinedAt: dateTimeSchema,
    checkedOutAt: dateTimeSchema.nullable()
});

export const focusSessionSchema = z.object({
    id: idSchema,
    kind: z.enum(["solo", "pact"]),
    pactId: idSchema.nullable(),
    status: focusSessionStatusSchema,
    startedAt: dateTimeSchema,
    endsAt: dateTimeSchema,
    serverNow: dateTimeSchema,
    intention: z.string().nullable(),
    participants: z.array(sessionParticipantSchema)
});

export const returnStateSchema = z.object({
    profileReady: z.boolean(),
    openSeed: openSeedSchema.nullable(),
    activeSession: focusSessionSchema.nullable(),
    upcomingPacts: z.array(z.object({ id: idSchema, campId: idSchema, startsAt: dateTimeSchema, durationMinutes: durationMinutesSchema }))
});

export type FocusSession = z.infer<typeof focusSessionSchema>;
export type ReturnState = z.infer<typeof returnStateSchema>;
