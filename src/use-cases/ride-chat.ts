import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";

/**
 * A ride's chat opens once a pilot is on it, and from then on holds its
 * pilots, the accounts behind its riders and the chapter's admins — kept in
 * step with the roster after every change, never edited by hand.
 */
export const syncRideChat = (rideId: string) =>
  chat.syncRideConversation({
    rideId,
    load: (open) => rideChatOf(rideId, open),
  });

async function rideChatOf(rideId: string, open: boolean) {
  const [participants, facts] = await Promise.all([
    rides.listRideParticipants(rideId),
    rides.getRideFacts(rideId),
  ]);
  if (!participants || !facts) return null;
  if (!open && !participants.pilotUserIds.length) return null;

  const admins = await membership.listChapterAdmins(participants.chapterId);
  return {
    chapterId: participants.chapterId,
    title: facts.title ?? facts.locationName ?? null,
    memberUserIds: [
      ...participants.pilotUserIds,
      ...participants.riderAccountUserIds,
      ...admins.map((admin) => admin.userId),
    ],
  };
}
