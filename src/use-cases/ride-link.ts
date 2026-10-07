import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";

/**
 * Which of a person's own pages shows this ride. A notification about a ride
 * reaches pilots, riders' accounts and admins with one link, and each of them
 * reads the ride somewhere else. The pilot's view wins over the rider's: a
 * pilot who also manages a rider on the same ride is there to ride the bike.
 */
export async function rideLinkFor(rideId: string, userId: string) {
  if (await rides.getRideForPilot(rideId, userId))
    return `/pilot/rides/${rideId}`;
  const managed = await passengers.listPassengersManagedBy(userId);
  if (
    await rides.getRideForPassengers(
      rideId,
      managed.map((passenger) => passenger.id),
    )
  )
    return `/passenger/rides/${rideId}`;
  return null;
}
