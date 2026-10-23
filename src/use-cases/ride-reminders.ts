import {
  DEMAND_CHECK_LEAD_HOURS,
  REMINDER_LEAD_MINUTES,
  chapters,
  type ChapterSettings,
} from "@/features/chapters";
import { rides, type RideMarker } from "@/features/rides";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

const CHECKS_PER_SWEEP = 50;

type Sweep = {
  marker: RideMarker;
  maxLeadMinutes: number;
  leadOf: (settings: ChapterSettings) => number;
  run: (rideId: string, leadMinutes: number, now: Date) => Promise<boolean>;
  failure: string;
};

/**
 * One once-per-ride pass of the sweep, the way the staffing check runs: the
 * chapters are grouped by their own lead and each group reads only the rides
 * already inside it, a run handles a bounded number of rides and the next one
 * carries on, and a ride that fails is logged and passed over.
 */
async function sweepDue(
  { marker, maxLeadMinutes, leadOf, run, failure }: Sweep,
  now: Date,
) {
  const chapterIds = await rides.listChaptersDue(marker, maxLeadMinutes, now);
  if (!chapterIds.length) return 0;

  const byLead = new Map<number, string[]>();
  for (const [chapterId, settings] of await chapters.getSettingsOf(
    chapterIds,
  )) {
    const lead = leadOf(settings);
    byLead.set(lead, [...(byLead.get(lead) ?? []), chapterId]);
  }

  let done = 0;
  let checked = 0;
  for (const [lead, ids] of byLead) {
    if (checked >= CHECKS_PER_SWEEP) break;
    const due = await rides.listRidesDue(
      marker,
      ids,
      lead,
      now,
      CHECKS_PER_SWEEP - checked,
    );
    for (const ride of due) {
      checked += 1;
      try {
        if (await run(ride.id, lead, now)) done += 1;
      } catch (error) {
        logger.error({ err: serializeError(error), ride_id: ride.id }, failure);
      }
    }
  }
  return done;
}

/** Lifecycle 5B-b: each rider's side hears the ride is coming up, and how to cancel if plans changed. */
export const riderReminders = (now = new Date()) =>
  sweepDue(
    {
      marker: "riderReminderSentAt",
      maxLeadMinutes: Math.max(...REMINDER_LEAD_MINUTES),
      leadOf: (settings) => settings.riderReminderLeadMinutes,
      run: (rideId, lead, at) =>
        rides.sendReminder("riderReminderSentAt", rideId, lead, at),
      failure: "rider reminder failed",
    },
    now,
  );

/** Lifecycle 5B and stories 29–30: the pilots get the ride and the pickup pack again. */
export const volunteerReminders = (now = new Date()) =>
  sweepDue(
    {
      marker: "volunteerReminderSentAt",
      maxLeadMinutes: Math.max(...REMINDER_LEAD_MINUTES),
      leadOf: (settings) => settings.volunteerReminderLeadMinutes,
      run: (rideId, lead, at) =>
        rides.sendReminder("volunteerReminderSentAt", rideId, lead, at),
      failure: "volunteer reminder failed",
    },
    now,
  );

/** Lifecycle 4C: a roster still empty this close to the ride is flagged for cancellation. */
export const demandCheck = (now = new Date()) =>
  sweepDue(
    {
      marker: "demandCheckedAt",
      maxLeadMinutes: Math.max(...DEMAND_CHECK_LEAD_HOURS) * 60,
      leadOf: (settings) => settings.demandCheckLeadHours * 60,
      run: (rideId, lead, at) => rides.checkDemand(rideId, lead, at),
      failure: "demand check failed",
    },
    now,
  );
