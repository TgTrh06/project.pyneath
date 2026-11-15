import { z } from "zod";
import { focusSessionSchema, participantPresenceSchema } from "./focus";
import { idSchema } from "./shared";

export const subscribeSessionSchema = z.object({
    sessionId: idSchema
}).strict();

export const setPresenceSchema = z.object({
    sessionId: idSchema,
    presence: z.enum(["active", "break"])
}).strict();

export const heartbeatSchema = z.object({
    sessionId: idSchema
}).strict();

export const realtimeErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

export const sessionSnapshotEventSchema = focusSessionSchema;

export const presenceUpdatedEventSchema = z.object({
    sessionId: idSchema,
    accountId: idSchema,
    presence: participantPresenceSchema
});

export const pactChangedEventSchema = z.discriminatedUnion('change', [
    z.object({ pactId: idSchema, change: z.literal('invited') }).strict(),
    z.object({ pactId: idSchema, change: z.literal('response_changed') }).strict(),
    z.object({ pactId: idSchema, change: z.literal('cancelled') }).strict(),
    z.object({ pactId: idSchema, change: z.literal('started'), sessionId: idSchema }).strict()
]);

export const realtimeEvents = {
    subscribe: "session.subscribe",
    heartbeat: "presence.heartbeat",
    setPresence: "presence.set",
    snapshot: "session.snapshot",
    sessionUpdated: "session.updated",
    presenceUpdated: "presence.updated",
    pactChanged: "pact.changed",
    ended: "session.ended",
    error: "realtime.error"
} as const;

export type PactChangedEvent = z.infer<typeof pactChangedEventSchema>;
