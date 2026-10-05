import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

/** A rider joins a ride of their own chapter, never another chapter's. */
export async function bookRider(
  ride: { id: string; chapterId: string },
  passengerId: string,
  actorUserId: string,
) {
  const passenger = await passengers.getPassenger(passengerId);
  if (!passenger) throw new DomainError("unknownPassenger");
  if (passenger.chapterId !== ride.chapterId)
    throw new DomainError("riderNotInChapter");
  return rides.bookRider(ride.id, passengerId, actorUserId);
}
