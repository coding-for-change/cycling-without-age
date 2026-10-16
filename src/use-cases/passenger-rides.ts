import { passengers } from "@/features/passengers";
import { rides, type PassengerRidePageInput } from "@/features/rides";

/**
 * Whoever is signed in sees the rides of the riders they look after — themselves
 * included, since an own rider is managed by its own account. The set is always
 * read from the account, so no request can widen it.
 */
const ridersOf = async (userId: string) =>
  (await passengers.listPassengersManagedBy(userId)).map(({ id }) => id);

export async function passengerRidesPage(
  userId: string,
  input: PassengerRidePageInput,
) {
  return rides.listPassengerRidesPage(await ridersOf(userId), input);
}

export async function passengerRidesOverview(userId: string) {
  const riderIds = await ridersOf(userId);
  const [upcoming, past] = await Promise.all([
    rides.listPassengerRidesPage(riderIds, { direction: "upcoming" }),
    rides.listPassengerRidesPage(riderIds, { direction: "past" }),
  ]);
  return { upcoming, past, riderCount: riderIds.length };
}

export async function passengerRideView(userId: string, rideId: string) {
  const riderIds = await ridersOf(userId);
  const ride = await rides.getRideForPassengers(rideId, riderIds);
  if (!ride) return null;
  const story = await rides.listRideStoryForPassengers(
    rideId,
    riderIds,
    userId,
  );
  return { ride, story, riderCount: riderIds.length };
}
