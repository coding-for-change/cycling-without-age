import { activity } from "@/lib/activity";
import type { Envelope } from "@/lib/events/catalog";

export async function recordActivity({
  event,
}: Envelope<"pilotApplication.decided">) {
  await activity.record({
    userId: event.userId,
    actorUserId: event.actorUserId,
    chapterId: event.chapterId,
    type: event.approved ? "applicationApproved" : "applicationRejected",
    ...(event.note ? { payload: { note: event.note } } : {}),
  });
}
