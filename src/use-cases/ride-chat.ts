import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { rides } from "@/features/rides";

/**
 * An event's chat opens with the event and holds everyone who signs up for
 * it: families who book the same event deliberately see each other's names
 * there, and a line marks each one joining or leaving. Its admins own it, so
 * they still write once it grows into announcements. A personal ride's chat opens once a pilot is on it, and its riders'
 * side joins only when it is one household — a single rider, or one account
 * booking for every rider — counting a family that gave its seat up, so its
 * leaving never opens what was said about it to the other one.
 */
export const syncRideChat = (rideId: string) =>
  chat.syncRideConversation({
    rideId,
    load: (open) => rideChatOf(rideId, open),
    namesOf: async (userIds) =>
      new Map(
        (await profile.getProfiles(userIds)).map((person) => [
          person.id,
          person.name,
        ]),
      ),
  });

/** The event behind a chat, when the chat is an event's. */
export async function eventOfChat(conversationId: string) {
  const rideId = await chat.rideIdOf(conversationId);
  const facts = rideId ? await rides.getRideFacts(rideId) : null;
  return facts?.model === "event"
    ? { cancelled: facts.status === "cancelled" }
    : null;
}

/** Only the chapter's admins open a cancelled event's chat again. */
export async function continueChat(conversationId: string, userId: string) {
  const event = await eventOfChat(conversationId);
  await chat.continueConversation({
    conversationId,
    userId,
    ownersOnly: event?.cancelled ?? false,
  });
}

/** A cancelled event's chat stays readable but takes no more messages. */
export async function freezeCancelledEventChat(rideId: string) {
  const facts = await rides.getRideFacts(rideId);
  if (facts?.model !== "event") return;
  await chat.freezeRideConversation(rideId);
}

/**
 * Whoever books for a rider sits in the chats of the rider's rides, so a
 * rider handed over to someone else moves chats with them: the old manager
 * leaves every chat of a ride still ahead, the new one joins it.
 */
export async function syncRiderChats(passengerId: string) {
  for (const rideId of await rides.upcomingRideIdsOf([passengerId]))
    await syncRideChat(rideId);
}

const oneHousehold = ({
  household,
}: {
  household: { riders: number; accountUserIds: string[] };
}) => household.riders <= 1 || household.accountUserIds.length <= 1;

async function rideChatOf(rideId: string, open: boolean) {
  const [participants, facts] = await Promise.all([
    rides.listRideParticipants(rideId),
    rides.getRideFacts(rideId),
  ]);
  if (!participants || !facts) return null;
  const event = facts.model === "event";
  if (!open && !event && !participants.pilotUserIds.length) return null;

  const admins = (
    await membership.listChapterAdmins(participants.chapterId)
  ).map((admin) => admin.userId);
  return {
    chapterId: participants.chapterId,
    title: facts.title ?? facts.locationName ?? null,
    ownerUserIds: event ? admins : [],
    marksComingsAndGoings: event,
    memberUserIds: [
      ...participants.pilotUserIds,
      ...admins,
      ...(event || oneHousehold(participants)
        ? participants.riderAccountUserIds
        : []),
    ],
  };
}
