import {
  demandCheck,
  riderReminders,
  volunteerReminders,
} from "./ride-reminders";
import { staffingCheck } from "./staffing-check";

/**
 * The worker's periodic pass over upcoming rides. Each check stamps what it
 * did in the same transaction as what it emits, so a sweep that runs twice
 * tells nobody twice.
 */
export async function rideSweep(now = new Date()) {
  const understaffed = await staffingCheck(now);
  const ridersReminded = await riderReminders(now);
  const pilotsReminded = await volunteerReminders(now);
  const noDemand = await demandCheck(now);
  return { understaffed, ridersReminded, pilotsReminded, noDemand };
}
