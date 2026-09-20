import { z } from "zod";

// Inlined rather than imported from `features/membership`: `lib/` sits under
// every feature and must not depend on one.
const chapterRole = z.enum(["admin", "pilot", "passenger"]);

export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pilotApplication.decided"),
    applicationId: z.string().min(1),
    chapterId: z.string().min(1),
    userId: z.string().min(1),
    actorUserId: z.string().min(1),
    approved: z.boolean(),
    note: z.string().nullable(),
  }),
  z.object({
    type: z.literal("pilotApplication.submitted"),
    applicationId: z.string().min(1),
    chapterId: z.string().min(1),
    userId: z.string().min(1),
    actorUserId: z.string().min(1),
  }),
  z.object({
    type: z.literal("member.invited"),
    chapterId: z.string().min(1),
    userId: z.string().min(1),
    actorUserId: z.string().min(1),
    roles: z.array(chapterRole).min(1),
  }),
  z.object({
    type: z.literal("member.roleChanged"),
    chapterId: z.string().min(1),
    userId: z.string().min(1),
    actorUserId: z.string().min(1),
    change: z.enum(["promote", "demote", "remove"]),
    roles: z.array(chapterRole),
  }),
  z.object({
    type: z.literal("chapter.memberJoined"),
    chapterId: z.string().min(1),
    userId: z.string().min(1),
    // Someone joining on their own has no actor, and an admin who adds a
    // passenger must not be told about their own click.
    actorUserId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal("user.onboarded"),
    userId: z.string().min(1),
    chapterId: z.string().min(1).nullable(),
    role: z.enum(["pilot", "passenger"]),
  }),
  z.object({
    type: z.literal("countryAdmin.appointed"),
    countryId: z.string().min(1),
    userId: z.string().min(1),
    actorUserId: z.string().min(1),
  }),
  z.object({
    type: z.literal("countryAdmin.removed"),
    countryId: z.string().min(1),
    userId: z.string().min(1),
    actorUserId: z.string().min(1),
  }),
]);

export type DomainEvent = z.infer<typeof eventSchema>;
export type EventType = DomainEvent["type"];
export type EventOf<K extends EventType> = Extract<DomainEvent, { type: K }>;

export type Envelope<K extends EventType = EventType> = {
  id: string;
  event: EventOf<K>;
};
