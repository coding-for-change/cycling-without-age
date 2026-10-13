import { passengers, type RiderNeedsInput } from "@/features/passengers";
import { rideLocations } from "@/features/ride-locations";
import { DomainError } from "@/lib/domain-error";

export async function getOwnRiderNeeds(userId: string) {
  const own = await passengers.getOwnPassenger(userId);
  if (!own) return null;
  const places = await rideLocations.listRideLocations([own.chapterId], {
    includeArchived: true,
  });
  const offered = (place: (typeof places)[number]) =>
    place.archivedAt === null && place.kind !== "publicPlace";
  return {
    needsWheelchairBike: own.needsWheelchairBike,
    note: own.note,
    rideLocationId: own.rideLocationId,
    careCenters: places
      .filter((place) => offered(place) || place.id === own.rideLocationId)
      .map((place) => ({
        id: place.id,
        name: place.name,
        offered: offered(place),
      })),
  };
}

export type OwnRiderNeeds = NonNullable<
  Awaited<ReturnType<typeof getOwnRiderNeeds>>
>;

export async function setOwnRiderNeeds(userId: string, input: RiderNeedsInput) {
  const own = await passengers.getOwnPassenger(userId);
  if (!own) throw new DomainError("notFound");
  if (input.rideLocationId)
    await rideLocations.requireCareCenter(input.rideLocationId, own.chapterId);
  await passengers.setRiderNeeds(own.id, input);
}
