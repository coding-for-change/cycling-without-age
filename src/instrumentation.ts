import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
    return;
  }
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  await import("../sentry.server.config");

  const { startMetricsServer } = await import("@/lib/observability/metrics");
  startMetricsServer(Number(process.env.METRICS_PORT ?? 9464));
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ logger }, { serializeError }] = await Promise.all([
      import("@/lib/observability/logger"),
      import("@/lib/observability/errors"),
    ]);
    logger.error(
      {
        err: serializeError(error),
        route: context.routePath,
        kind: context.routeType,
      },
      "request error",
    );
  }

  Sentry.captureRequestError(error, request, context);
};
