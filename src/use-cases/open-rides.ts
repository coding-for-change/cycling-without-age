import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";

/**
 * Of the chapters someone pilots for, the ones that let pilots sign up
 * themselves. Whether a chapter does is its setting; the rides are the
 * calendar's.
 */
export async function selfServiceChapters(pilotChapterIds: string[]) {
  if (!pilotChapterIds.length) return [];
  const settings = await chapters.getSettingsOf(pilotChapterIds);
  return pilotChapterIds.filter(
    (chapterId) => settings.get(chapterId)?.pilotsMaySelfAssign,
  );
}

export async function listOpenRides(userId: string, pilotChapterIds: string[]) {
  return rides.listOpenRidesForPilot(
    userId,
    await selfServiceChapters(pilotChapterIds),
  );
}

export async function getOpenRide(rideId: string, pilotChapterIds: string[]) {
  return rides.getOpenRideForPilot(
    rideId,
    await selfServiceChapters(pilotChapterIds),
  );
}
