import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { commandClient } from "@/lib/realtime";
import { withTimeout } from "@/lib/with-timeout";

const CHECK_TIMEOUT_MS = 2_000;

const check = (run: () => Promise<unknown>) =>
  withTimeout(Promise.resolve().then(run), CHECK_TIMEOUT_MS).then(
    () => "ok" as const,
    () => "failed" as const,
  );

export async function GET() {
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
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
