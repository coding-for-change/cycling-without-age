import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { baseOptions } from "@/lib/observability/sentry-shared";

process.env.CWA_SERVICE = "worker";

Sentry.init({
  ...baseOptions({
    dsn: process.env.SENTRY_DSN_WORKER,
    service: "worker",
  }),
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ["warn", "error", "fatal"] },
      error: { levels: [] },
    }),
    nodeProfilingIntegration(),
    Sentry.onUncaughtExceptionIntegration({
      exitEvenIfOtherHandlersAreRegistered: true,
    }),
  ],
  profileSessionSampleRate: 0.1,
  profileLifecycle: "trace",
  includeLocalVariables: false,
  enableLogs: true,
});
