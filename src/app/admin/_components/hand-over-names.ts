import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { FeedEvent } from "./activity-feed";
import { payloadStrings } from "./timeline";

/**
 * A hand-over writes a line into each manager's history. A history that is
 * not one person's — the rider's, the chapter's — tells it once.
 */
export const oncePerHandOver = <E extends FeedEvent>(events: E[]) =>
  events.filter(
    (event) =>
      event.type !== "riderHandedOver" ||
      payloadStrings(event.payload).direction !== "in",
  );

/**
 * A hand-over line keeps ids, never names, so deleting a rider or an account
 * takes their name out of every history. The names are looked up as the
 * history is read; someone who is gone reads as `gone`.
 */
export async function withHandOverNames<
  E extends FeedEvent & { passengerId: string | null },
>(events: E[], gone: string): Promise<E[]> {
  const handOvers = events.filter((event) => event.type === "riderHandedOver");
  if (!handOvers.length) return events;
  const userIds = handOvers.flatMap((event) => {
    const { fromUserId, toUserId } = payloadStrings(event.payload);
    return [fromUserId, toUserId].filter(Boolean);
  });
  const [riders, people] = await Promise.all([
    passengers.passengerNames(
      handOvers.flatMap((event) => event.passengerId ?? []),
    ),
    profile.getProfiles(userIds),
  ]);
  const nameOf = (id: string | undefined) =>
    people.find((person) => person.id === id)?.name || gone;
  return events.map((event) => {
    if (event.type !== "riderHandedOver") return event;
    const payload = payloadStrings(event.payload);
    return {
      ...event,
      payload: {
        ...payload,
        rider: (event.passengerId && riders[event.passengerId]) || gone,
        previous: nameOf(payload.fromUserId),
        next: nameOf(payload.toUserId),
      },
    };
  });
}
