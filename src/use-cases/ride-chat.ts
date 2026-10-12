import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";

/**
 * A ride's chat opens once a pilot is on it, and from then on holds its
 * pilots, the accounts behind its riders and the chapter's admins — kept in
 * step with the roster after every change, never edited by hand.
 */
export async function syncRideChat(rideId: string) {
  const [participants, facts] = await Promise.all([
    rides.listRideParticipants(rideId),
    rides.getRideFacts(rideId),
  ]);
  if (!participants || !facts) return null;
  if (
    !participants.pilotUserIds.length &&
    !(await chat.hasRideConversation(rideId))
  )
    return null;

  const admins = await membership.listChapterAdmins(participants.chapterId);
  return chat.syncRideConversation({
    rideId,
    chapterId: participants.chapterId,
    title: facts.title ?? facts.locationName ?? null,
    memberUserIds: [
      ...participants.pilotUserIds,
      ...participants.riderAccountUserIds,
      ...admins.map((admin) => admin.userId),
    ],
  });
}
