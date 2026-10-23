import { NextResponse, type NextRequest } from "next/server";
import { chapters } from "@/features/chapters";
import { getSession } from "@/lib/auth-guards";
import {
  encodeJoinPreset,
  JOIN_PRESET_COOKIE,
  JOIN_PRESET_COOKIE_OPTIONS,
} from "@/lib/join-preset";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const chapter = await chapters.getChapterBySlug(slug);

  if (!chapter) {
    return NextResponse.redirect(
      new URL(`/join/${encodeURIComponent(slug)}`, request.url),
    );
  }

  const destination = session ? "/onboarding" : "/sign-in";
  const response = NextResponse.redirect(new URL(destination, request.url));

  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return response;

  response.cookies.set(
    JOIN_PRESET_COOKIE,
    encodeJoinPreset({ chapterId: chapter.id, role: null }),
    JOIN_PRESET_COOKIE_OPTIONS,
  );
  return response;
}
