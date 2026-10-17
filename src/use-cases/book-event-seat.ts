import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

/**
 * Lifecycle 4B-b: an account books seats on an announced event for riders it
 * manages, and only riders of the event's own chapter. Which riders those are
 * is the passengers' rule; the seats are counted under the ride's lock.
 */
export async function bookEventSeats(
  rideId: string,
  passengerIds: string[],
  actorUserId: string,
) {
  const [ride, managed] = await Promise.all([
    rides.getRideScope(rideId),
    passengers.listPassengersManagedBy(actorUserId),
  ]);
  if (!ride) throw new DomainError("unknownRide");
  const chapterOf = new Map(
    managed.map((rider) => [rider.id, rider.chapterId]),
  );
  if (passengerIds.some((id) => !chapterOf.has(id)))
    throw new DomainError("unknownPassenger");
  if (passengerIds.some((id) => chapterOf.get(id) !== ride.chapterId))
    throw new DomainError("riderNotInChapter");
  return rides.bookSeats(rideId, passengerIds, actorUserId);
}
