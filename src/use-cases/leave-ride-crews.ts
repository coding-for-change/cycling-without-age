import { chat } from "@/features/chat";
import { rides } from "@/features/rides";
import type { EventOf } from "@/lib/events/catalog";
import { syncRideChat } from "./ride-chat";

/**
 * Someone demoted or removed in a chapter keeps their rows on its rides, but
 * no longer belongs on them: a pilot's seats are empty again, so those rides
 * are checked for pilots once more (`rides`), and every ride chat of the
 * chapter they are in is brought back in step with its ride (`chat`), which
 * drops a former pilot or admin and keeps whoever still belongs.
 */
export async function leaveRideCrews({
  chapterId,
  userId,
  change,
  roles,
}: EventOf<"member.roleChanged">) {
  if (change === "promote") return;
  if (!roles.includes("pilot"))
    await rides.reopenStaffingChecksOf(userId, chapterId);
  for (const rideId of await chat.listRideChatsOf(userId, chapterId))
    await syncRideChat(rideId);
}
