import * as Sentry from "@sentry/nextjs";
import { dataCollection } from "./src/lib/observability/sentry-shared";

const dsn = process.env.SENTRY_DSN_WEB ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? "development",
  release: process.env.SENTRY_RELEASE,
  dataCollection,
  attachStacktrace: false,
  tracesSampleRate: 0,
});
