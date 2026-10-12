import { passengers, type RiderNeedsInput } from "@/features/passengers";
import { rideLocations } from "@/features/ride-locations";
import { DomainError } from "@/lib/domain-error";

export async function setOwnRiderNeeds(userId: string, input: RiderNeedsInput) {
  const own = await passengers.getOwnPassenger(userId);
  if (!own) throw new DomainError("notFound");
  if (input.rideLocationId)
    await rideLocations.requireUsableRideLocation(
      input.rideLocationId,
      own.chapterId,
    );
  await passengers.setRiderNeeds(own.id, input);
}
