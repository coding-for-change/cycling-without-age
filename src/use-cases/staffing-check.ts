import { STAFFING_LEAD_HOURS, chapters } from "@/features/chapters";
import { rides } from "@/features/rides";

const HOUR_MS = 60 * 60 * 1000;
const FURTHEST_LEAD_HOURS = Math.max(...STAFFING_LEAD_HOURS);

/**
 * Lifecycle 3D: a ride still short of pilots once its chapter's staffing
 * window opens is flagged to the chapter's admins, once. Each chapter sets its
 * own window, so the rides are read for the widest one and kept per chapter.
 */
export async function staffingCheck(now = new Date()) {
  const candidates = await rides.listStaffingCandidates(
    FURTHEST_LEAD_HOURS,
    now,
  );
  if (!candidates.length) return 0;

  const settings = await chapters.getSettingsOf([
    ...new Set(candidates.map((ride) => ride.chapterId)),
  ]);
  let flagged = 0;
  for (const ride of candidates) {
    const lead = settings.get(ride.chapterId)?.staffingCheckLeadHours;
    if (lead === undefined) continue;
    if (ride.startsAt.getTime() - now.getTime() > lead * HOUR_MS) continue;
    if (await rides.checkStaffing(ride.id, now)) flagged += 1;
  }
  return flagged;
}
