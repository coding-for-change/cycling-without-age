import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import {
  demandCheck,
  riderReminders,
  volunteerReminders,
} from "./ride-reminders";
import { staffingCheck } from "./staffing-check";

const STAGES = {
  understaffed: staffingCheck,
  ridersReminded: riderReminders,
  pilotsReminded: volunteerReminders,
  noDemand: demandCheck,
};

/**
 * The worker's periodic pass over upcoming rides. Each check stamps what it
 * did in the same transaction as what it emits, so a sweep that runs twice
 * tells nobody twice. The checks are independent: one that fails is logged,
 * the others still run, and the run then fails so the monitor sees it.
 */
export async function rideSweep(now = new Date()) {
  const counts = {} as Record<keyof typeof STAGES, number>;
  let failure: unknown = null;
  for (const [stage, run] of Object.entries(STAGES) as [
    keyof typeof STAGES,
    (now: Date) => Promise<number>,
  ][]) {
    try {
      counts[stage] = await run(now);
    } catch (error) {
      counts[stage] = 0;
      failure ??= error;
      logger.error({ err: serializeError(error), stage }, "ride sweep failed");
    }
  }
  if (failure) throw failure;
  return counts;
}
