import { withMonitor } from "@sentry/node";
import type { MonitorConfig } from "@sentry/core";
import { worker as workerMetrics } from "@/lib/observability/metrics";

const TIMEZONE = "UTC";
const MINUTE_MS = 60_000;

export const MONITORS = {
  sweep: {
    schedule: { type: "interval", value: 1, unit: "minute" },
    checkinMargin: 2,
    maxRuntime: 5,
    failureIssueThreshold: 3,
    recoveryThreshold: 1,
    timezone: TIMEZONE,
  },
  "prune-devices": {
    schedule: { type: "crontab", value: "0 4 * * *" },
    checkinMargin: 10,
    maxRuntime: 30,
    failureIssueThreshold: 1,
    recoveryThreshold: 1,
    timezone: TIMEZONE,
  },
  "prune-chat": {
    schedule: { type: "crontab", value: "0 3 * * *" },
    checkinMargin: 10,
    maxRuntime: 30,
    failureIssueThreshold: 1,
    recoveryThreshold: 1,
    timezone: TIMEZONE,
  },
} satisfies Record<string, MonitorConfig>;

export type MaintenanceName = keyof typeof MONITORS;

export const MAINTENANCE_NAMES = Object.keys(MONITORS) as MaintenanceName[];

export const isMaintenance = (name: string): name is MaintenanceName =>
  name in MONITORS;

export function schedulerOptions(name: MaintenanceName) {
  const { schedule } = MONITORS[name];
  return schedule.type === "crontab"
    ? { pattern: schedule.value, tz: TIMEZONE }
    : { every: schedule.value * MINUTE_MS, tz: TIMEZONE };
}

export function runMaintenance(
  name: MaintenanceName,
  run: () => Promise<void>,
) {
  return withMonitor(
    name,
    async () => {
      try {
        await run();
      } catch (error) {
        workerMetrics.cronRuns.inc({ cron: name, outcome: "failed" });
        throw error;
      }
      workerMetrics.cronRuns.inc({ cron: name, outcome: "ok" });
      workerMetrics.cronLastSuccess.set({ cron: name }, Date.now() / 1_000);
    },
    MONITORS[name],
  );
}
