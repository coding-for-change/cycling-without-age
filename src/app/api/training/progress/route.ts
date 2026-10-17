import { connection } from "next/server";
import { heartbeatInput, id } from "@/features/training";
import { APP_URL } from "@/lib/app-url";
import { getSession } from "@/lib/auth-guards";
import { isTrainingRequired } from "@/lib/feature-flags";
import { domainCode } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { recordLessonProgress } from "@/use-cases/training-access";

const HEARTBEAT_LIMIT = { max: 30, windowMs: 60_000 };
const MAX_BODY_BYTES = 1_024;

const PRIVATE = { "Cache-Control": "private, no-store" };

const respond = (status: number) =>
  new Response(null, { status, headers: PRIVATE });

const body = heartbeatInput.extend({ courseId: id });

const allowedOrigin = () => new URL(APP_URL).origin;

export async function POST(request: Request) {
  await connection();
  if (!isTrainingRequired()) return respond(404);
  const origin = request.headers.get("origin");
  if (origin !== allowedOrigin()) return respond(403);

  const session = await getSession();
  if (!session) return respond(401);

  if (!withinRateLimit(`training-progress:${session.user.id}`, HEARTBEAT_LIMIT))
    return respond(429);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return respond(413);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return respond(400);
  }
  const parsed = body.safeParse(json);
  if (!parsed.success) return respond(400);

  const { courseId, ...beat } = parsed.data;
  try {
    await recordLessonProgress(session.user.id, courseId, beat);
  } catch (error) {
    if (domainCode(error)) return respond(404);
    throw error;
  }
  return respond(204);
}
