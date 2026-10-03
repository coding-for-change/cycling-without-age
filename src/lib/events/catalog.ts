import { z } from "zod";

import { chapterRole } from "@/lib/access";

const rideScope = {
  rideId: z.string().min(1),
  chapterId: z.string().min(1),
  actorUserId: z.string().min(1).nullable(),
};

const rideReasons = z.enum([
  "weather",
  "rider",
  "facility",
  "volunteers",
  "equipment",
  "noRiders",
  "other",
]);

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
    actorUserId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal("user.onboarded"),
    userId: z.string().min(1),
    chapterId: z.string().min(1).nullable(),
    role: z.enum(["pilot", "passenger"]),
  }),
  z.object({
    type: z.literal("chat.messageSent"),
    conversationId: z.string().min(1),
    messageId: z.string().min(1),
    seq: z.number().int().min(1),
    actorUserId: z.string().min(1),
    chapterId: z.string().min(1).nullable(),
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
  z.object({
    type: z.literal("trishaw.damageReported"),
    damageId: z.string().min(1),
    trishawId: z.string().min(1),
    poolCountryId: z.string().min(1).nullable(),
    reachingChapterIds: z.array(z.string().min(1)),
    chapterId: z.string().min(1).nullable(),
    actorUserId: z.string().min(1),
    grounding: z.boolean(),
    affectedRideIds: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal("pool.accessRequested"),
    membershipId: z.string().min(1),
    poolId: z.string().min(1),
    countryId: z.string().min(1),
    chapterId: z.string().min(1),
    actorUserId: z.string().min(1),
  }),
  z.object({
    type: z.literal("pool.accessDecided"),
    membershipId: z.string().min(1),
    poolId: z.string().min(1),
    chapterId: z.string().min(1),
    actorUserId: z.string().min(1),
    approved: z.boolean(),
    note: z.string().nullable(),
  }),
  z.object({
    type: z.literal("ride.scheduled"),
    ...rideScope,
    returnLegId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal("ride.rescheduled"),
    ...rideScope,
    changes: z.array(z.enum(["time", "location", "destination"])).min(1),
  }),
  z.object({
    type: z.literal("ride.cancelled"),
    ...rideScope,
    reasonCode: rideReasons,
  }),
  z.object({
    type: z.literal("ride.deleted"),
    ...rideScope,
  }),
  z.object({
    type: z.literal("ride.pilotAssigned"),
    ...rideScope,
    userId: z.string().min(1),
    self: z.boolean(),
  }),
  z.object({
    type: z.literal("ride.pilotUnassigned"),
    ...rideScope,
    userId: z.string().min(1),
    self: z.boolean(),
  }),
  z.object({
    type: z.literal("ride.riderBooked"),
    ...rideScope,
    passengerId: z.string().min(1),
  }),
  z.object({
    type: z.literal("ride.riderRemoved"),
    ...rideScope,
    passengerId: z.string().min(1),
  }),
]);

export type DomainEvent = z.infer<typeof eventSchema>;
export type EventType = DomainEvent["type"];

export const eventTypes: EventType[] = eventSchema.options.map(
  (option) => option.shape.type.value,
);
export type EventOf<K extends EventType> = Extract<DomainEvent, { type: K }>;

export type Envelope<K extends EventType = EventType> = {
  id: string;
  event: EventOf<K>;
};
