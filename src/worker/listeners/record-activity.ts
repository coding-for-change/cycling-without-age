import { activity } from "@/lib/activity";
import type { ActivityType, RecordEventInput } from "@/lib/activity";
import type { Envelope, EventOf, EventType } from "@/lib/events/catalog";

type Builder<K extends EventType> = (event: EventOf<K>) => RecordEventInput;

const ROLE_EVENT: Record<"promote" | "demote" | "remove", ActivityType> = {
  promote: "roleGranted",
  demote: "roleRevoked",
  remove: "memberRemoved",
};

/**
 * The history feed, rebuilt from the same facts the notifications are built
 * from. An event with no builder here writes no line — and saying so out loud
 * beats a listener that silently does nothing.
 */
const builders: { [K in EventType]?: Builder<K> } = {
  "pilotApplication.decided": (event) => ({
    userId: event.userId,
    actorUserId: event.actorUserId,
    chapterId: event.chapterId,
    type: event.approved ? "applicationApproved" : "applicationRejected",
    ...(event.note ? { payload: { note: event.note } } : {}),
  }),
  "pilotApplication.submitted": (event) => ({
    userId: event.userId,
    actorUserId: event.actorUserId,
    chapterId: event.chapterId,
    type: "applicationSubmitted",
  }),
  "member.invited": (event) => ({
    userId: event.userId,
    actorUserId: event.actorUserId,
    chapterId: event.chapterId,
    type: "invited",
    payload: { roles: event.roles.join(",") },
  }),
  "member.roleChanged": (event) => ({
    userId: event.userId,
    actorUserId: event.actorUserId,
    chapterId: event.chapterId,
    type: ROLE_EVENT[event.change],
  }),
  "countryAdmin.appointed": (event) => ({
    userId: event.userId,
    actorUserId: event.actorUserId,
    type: "countryAdminAppointed",
  }),
  "countryAdmin.removed": (event) => ({
    userId: event.userId,
    actorUserId: event.actorUserId,
    type: "countryAdminRemoved",
  }),
};

export async function recordActivity({ event }: Envelope) {
  const build = builders[event.type] as Builder<EventType> | undefined;
  if (!build) throw new Error(`[activity] no builder for ${event.type}`);
  await activity.record(build(event));
}
