import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";

/**
 * What a pilot sees after a ride: the chapter's standing instructions, then per
 * trishaw where it goes back and how to get in. Only the ride's own pilots who
 * are still members get it, and only locations the chapter can still reach —
 * the access code is on this page.
 */
export async function finishRideView(rideId: string, userId: string) {
  const ride = await rides.getFinishableRideForPilot(rideId, userId);
  if (!ride) return null;

  const [settings, trishaws, reported, locations] = await Promise.all([
    chapters.getSettings(ride.chapterId),
    fleet.getTrishaws(ride.trishaws.map(({ trishaw }) => trishaw.id)),
    fleet.listDamagesReportedOnRide(rideId, userId),
    fleet.listLocationsForChapters([ride.chapterId]),
  ]);

  const locationById = new Map(locations.map((l) => [l.id, l]));

  return {
    ride,
    instructions: settings.postRideInstructions,
    trishaws: trishaws.map((trishaw) => ({
      trishaw,
      location: locationById.get(trishaw.storageLocation.id) ?? null,
      reported: reported.filter((d) => d.trishawId === trishaw.id),
    })),
  };
}
