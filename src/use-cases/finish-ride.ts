import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";

/**
 * What a pilot sees after a ride: the chapter's standing instructions, then per
 * trishaw where it goes back and how to get in. Only the ride's own pilots get
 * it — the access code is on this page.
 */
export async function finishRideView(rideId: string, userId: string) {
  const ride = await rides.getRide(rideId);
  if (!ride || !ride.assignments.some((a) => a.user.id === userId)) return null;

  const [settings, trishaws, reported] = await Promise.all([
    chapters.getSettings(ride.chapterId),
    fleet.getTrishaws(ride.trishaws.map(({ trishaw }) => trishaw.id)),
    fleet.listDamagesReportedOnRide(rideId, userId),
  ]);

  const locations = await fleet.getLocations([
    ...new Set(trishaws.map((t) => t.storageLocation.id)),
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
