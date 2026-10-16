import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides, type PassengerRidePageInput } from "@/features/rides";

/**
 * Whoever is signed in sees the rides of the riders they look after and their
 * own — which a caretaker may manage for them — in the chapters they still
 * belong to. Leaving a chapter keeps the rider row and its bookings, so
 * membership, not the row, decides. The set is always read from the account,
 * so no request can widen it.
 */
export async function passengerRiderIds(userId: string) {
  const [memberships, managed, own] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    passengers.listPassengersManagedBy(userId),
    passengers.getOwnPassenger(userId),
  ]);
  const chapters = new Set(memberships.map(({ chapterId }) => chapterId));
  return [
    ...new Set(
      [...managed, ...(own ? [own] : [])]
        .filter(({ chapterId }) => chapters.has(chapterId))
        .map(({ id }) => id),
    ),
  ];
}

export async function passengerRidesPage(
  userId: string,
  input: PassengerRidePageInput,
) {
  return rides.listPassengerRidesPage(await passengerRiderIds(userId), input);
}

export async function passengerRidesOverview(userId: string) {
  const riderIds = await passengerRiderIds(userId);
  const [upcoming, past] = await Promise.all([
    rides.listPassengerRidesPage(riderIds, { direction: "upcoming" }),
    rides.listPassengerRidesPage(riderIds, { direction: "past" }),
  ]);
  return { upcoming, past, riderCount: riderIds.length };
}

export async function passengerRideView(userId: string, rideId: string) {
  const riderIds = await passengerRiderIds(userId);
  const view = await rides.getRideWithStoryForPassengers(
    rideId,
    riderIds,
    userId,
  );
  return view ? { ...view, riderCount: riderIds.length } : null;
}
