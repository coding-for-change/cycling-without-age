import { z } from "zod";

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
]);

export type DomainEvent = z.infer<typeof eventSchema>;
export type EventType = DomainEvent["type"];
export type EventOf<K extends EventType> = Extract<DomainEvent, { type: K }>;

export type Envelope<K extends EventType = EventType> = {
  id: string;
  event: EventOf<K>;
};
