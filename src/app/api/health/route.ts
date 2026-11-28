import { connection } from "next/server";
import { NATIVE_OFFLINE_PAGE_ORIGINS } from "@/lib/native-app";
import { prisma } from "@/lib/prisma";
import { commandClient } from "@/lib/realtime";
import { withTimeout } from "@/lib/with-timeout";

const CHECK_TIMEOUT_MS = 2_000;

const check = (run: () => Promise<unknown>) =>
  withTimeout(Promise.resolve().then(run), CHECK_TIMEOUT_MS).then(
    () => "ok" as const,
    () => "failed" as const,
  );

function allowNativeOfflinePage(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  return origin && NATIVE_OFFLINE_PAGE_ORIGINS.has(origin)
    ? { "Access-Control-Allow-Origin": origin }
    : {};
}

export async function GET(request: Request) {
  await connection();

  const [db, redis] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(() => commandClient().ping()),
  ]);

  const ok = db === "ok" && redis === "ok";

  return Response.json(
    {
      ok,
      checks: { db, redis },
      release: process.env.SENTRY_RELEASE ?? "dev",
      env: process.env.SENTRY_ENVIRONMENT ?? "development",
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        Vary: "Origin",
        ...allowNativeOfflinePage(request),
      },
    },
  );
}
