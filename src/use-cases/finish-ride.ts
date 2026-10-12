import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";

const PICKUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Each trishaw with the location it waits at, if the chapter can still reach it. */
async function trishawPlaces(chapterId: string, trishawIds: string[]) {
  const [trishaws, locations] = await Promise.all([
    fleet.getTrishaws(trishawIds),
    fleet.listLocationsForChapters([chapterId]),
  ]);
  const locationById = new Map(locations.map((l) => [l.id, l]));
  return trishaws.map((trishaw) => ({
    trishaw,
    location: locationById.get(trishaw.storageLocation.id) ?? null,
  }));
}

/**
 * What a pilot sees after a ride: the chapter's standing instructions, then per
 * trishaw where it goes back and how to get in. Only the ride's own pilots who
 * are still members get it, and only locations the chapter can still reach —
 * the access code is on this page.
 */
export async function finishRideView(rideId: string, userId: string) {
  const ride = await rides.getFinishableRideForPilot(rideId, userId);
  if (!ride) return null;

  const [settings, places, reported] = await Promise.all([
    chapters.getSettings(ride.chapterId),
    trishawPlaces(
      ride.chapterId,
      ride.trishaws.map(({ trishaw }) => trishaw.id),
    ),
    fleet.listDamagesReportedOnRide(rideId, userId),
  ]);

  return {
    ride,
    instructions: settings.postRideInstructions,
    trishaws: places.map((place) => ({
      ...place,
      reported: reported.filter((d) => d.trishawId === place.trishaw.id),
    })),
  };
}

export const pickupOpens = (startsAt: Date) =>
  new Date(startsAt.getTime() - PICKUP_WINDOW_MS);

/**
 * The pickup pack on an assigned pilot's ride page: where each trishaw waits
 * and its access code, from a day before the ride until it ends. The caller
 * passes a ride it already read as this pilot's own.
 */
export async function pickupView(
  ride: {
    chapterId: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    trishaws: { trishaw: { id: string } }[];
  },
  now = new Date(),
) {
  if (
    ride.status !== "scheduled" ||
    now < pickupOpens(ride.startsAt) ||
    now > ride.endsAt ||
    !ride.trishaws.length
  )
    return null;
  return trishawPlaces(
    ride.chapterId,
    ride.trishaws.map(({ trishaw }) => trishaw.id),
  );
}
