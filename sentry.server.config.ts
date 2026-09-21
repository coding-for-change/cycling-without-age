import * as Sentry from "@sentry/nextjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { baseOptions } from "./src/lib/observability/sentry-shared";

Sentry.init({
  ...baseOptions({
    dsn: process.env.SENTRY_DSN_WEB ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
    service: "web",
  }),
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ["warn", "error", "fatal"] },
      error: { levels: [] },
    }),
    nodeProfilingIntegration(),
  ],
  profileSessionSampleRate: 0.1,
  profileLifecycle: "trace",
  includeLocalVariables: false,
  enableLogs: true,
});
