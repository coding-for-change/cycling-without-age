import { NextResponse, type NextRequest } from "next/server";
import { chapters } from "@/features/chapters";
import { getSession } from "@/lib/auth-guards";
import {
  encodeJoinPreset,
  JOIN_PRESET_COOKIE,
  JOIN_PRESET_MAX_AGE,
} from "@/lib/join-preset";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);

  const chapter = slug?.[0] ? await chapters.getChapterBySlug(slug[0]) : null;

  const asked = request.nextUrl.searchParams.get("role");
  const role = asked === "pilot" || asked === "passenger" ? asked : null;

  const destination = session ? "/onboarding" : "/sign-in";
  const response = NextResponse.redirect(new URL(destination, request.url));

  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return response;

  response.cookies.set(
    JOIN_PRESET_COOKIE,
    encodeJoinPreset({ chapterId: chapter?.id ?? null, role }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: JOIN_PRESET_MAX_AGE,
    },
  );
  return response;
}
