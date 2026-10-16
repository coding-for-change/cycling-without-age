import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { rides } from "@/features/rides";

/**
 * A ride's chat opens once a pilot is on it, and from then on holds its
 * pilots, the accounts behind its riders and the chapter's admins — kept in
 * step with the roster after every change, never edited by hand. Riders never
 * learn of each other, so the riders' side joins only when it is one
 * household: a single rider, or one account booking for every rider on it.
 * Anything else — and every event, whose families booked on their own — is
 * the crew's and the admins' chat only. A family that gave its seat up still
 * counts, so its leaving never opens the chat's history to the other one.
 */
export const syncRideChat = (rideId: string) =>
  chat.syncRideConversation({
    rideId,
    load: (open) => rideChatOf(rideId, open),
  });

const oneHousehold = (
  facts: { model: string },
  { household }: { household: { riders: number; accountUserIds: string[] } },
) =>
  facts.model !== "event" &&
  (household.riders <= 1 || household.accountUserIds.length <= 1);

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
      ...(oneHousehold(facts, participants)
        ? participants.riderAccountUserIds
        : []),
      ...admins.map((admin) => admin.userId),
    ],
  };
}
