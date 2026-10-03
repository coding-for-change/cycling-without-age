import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

/** A rider joins a ride of their own chapter, never another chapter's. */
export async function bookRider(
  rideId: string,
  passengerId: string,
  actorUserId: string,
) {
  const [ride, passenger] = await Promise.all([
    rides.getRide(rideId),
    passengers.getPassenger(passengerId),
  ]);
  if (!ride) throw new DomainError("unknownRide");
  if (!passenger) throw new DomainError("unknownPassenger");
  if (passenger.chapterId !== ride.chapterId)
    throw new DomainError("riderNotInChapter");
  return rides.bookRider(rideId, passengerId, actorUserId);
}
