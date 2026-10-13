import { STAFFING_LEAD_HOURS, chapters } from "@/features/chapters";
import { rides } from "@/features/rides";

const FURTHEST_LEAD_HOURS = Math.max(...STAFFING_LEAD_HOURS);

/**
 * Lifecycle 3D: a ride still short of pilots once its chapter's staffing
 * window opens is flagged to the chapter's admins, once. Each chapter sets its
 * own window, so the chapters are grouped by it and each group reads only the
 * rides already inside it — rides not due yet never crowd out ones that are.
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
  for (const [lead, ids] of byLead)
    for (const ride of await rides.listStaffingCandidates(ids, lead, now))
      if (await rides.checkStaffing(ride.id, now)) flagged += 1;
  return flagged;
}
