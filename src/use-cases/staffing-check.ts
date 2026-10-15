import { STAFFING_LEAD_HOURS, chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

const FURTHEST_LEAD_HOURS = Math.max(...STAFFING_LEAD_HOURS);
const CHECKS_PER_SWEEP = 50;

/**
 * Lifecycle 3D: a ride still short of pilots once its chapter's staffing
 * window opens is flagged to the chapter's admins, once. Each chapter sets its
 * own window, so the chapters are grouped by it and each group reads only the
 * rides already inside it — rides not due yet never crowd out ones that are.
 * The sweep shares a worker with every outbox event, so one run checks a
 * bounded number of rides and the next one carries on; a ride that fails is
 * logged and passed over rather than stopping the rest.
 */
export async function staffingCheck(now = new Date()) {
  const chapterIds = await rides.listChaptersToCheck(FURTHEST_LEAD_HOURS, now);
  if (!chapterIds.length) return 0;

  const byLead = new Map<number, string[]>();
  for (const [
    chapterId,
    { staffingCheckLeadHours: lead },
  ] of await chapters.getSettingsOf(chapterIds))
    byLead.set(lead, [...(byLead.get(lead) ?? []), chapterId]);

  let flagged = 0;
  let checked = 0;
  for (const [lead, ids] of byLead) {
    if (checked >= CHECKS_PER_SWEEP) break;
    const due = await rides.listStaffingCandidates(
      ids,
      lead,
      now,
      CHECKS_PER_SWEEP - checked,
    );
    for (const ride of due) {
      checked += 1;
      try {
        if (await rides.checkStaffing(ride.id, now)) flagged += 1;
      } catch (error) {
        logger.error(
          { err: serializeError(error), ride_id: ride.id },
          "staffing check failed",
        );
      }
    }
  }
  return flagged;
}
