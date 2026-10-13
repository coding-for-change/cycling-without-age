import { passengers, type RiderNeedsInput } from "@/features/passengers";
import { rideLocations } from "@/features/ride-locations";
import { DomainError } from "@/lib/domain-error";

export async function getOwnRiderNeeds(userId: string) {
  const own = await passengers.getOwnPassenger(userId);
  if (!own) return null;
  const places = await rideLocations.listRideLocations([own.chapterId]);
  return {
    needsWheelchairBike: own.needsWheelchairBike,
    note: own.note,
    rideLocationId: own.rideLocationId,
    careCenters: places
      .filter((place) => place.kind !== "publicPlace")
      .map((place) => ({ id: place.id, name: place.name })),
  };
}

export type OwnRiderNeeds = NonNullable<
  Awaited<ReturnType<typeof getOwnRiderNeeds>>
>;

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
