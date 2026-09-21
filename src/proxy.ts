import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { NEXT_COOKIE, NEXT_MAX_AGE, safeNextPath } from "@/lib/redirects";

const NATIVE_UA = "CWA-Native";

// The session check is cookie presence only: middleware has no database.
// `requireAuth` must not redirect back to `/`, or it would loop against this.
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = Boolean(getSessionCookie(request));

  if (pathname === "/") {
    const isNative = request.headers.get("user-agent")?.includes(NATIVE_UA);

    const path = signedIn ? "/onboarding" : isNative ? "/welcome" : "/sign-in";
    const destination = new URL(path, request.url);

    destination.search = request.nextUrl.search;
    return NextResponse.redirect(destination);
  }

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + search);

  const next =
    pathname === "/sign-in" ? safeNextPath(searchParams.get("next")) : null;

  const response =
    next && signedIn
      ? NextResponse.redirect(new URL("/onboarding", request.url))
      : NextResponse.next({ request: { headers } });

  if (next)
    response.cookies.set(NEXT_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: NEXT_MAX_AGE,
    });

  return response;
}

export const config = { matcher: ["/((?!_next/|api/|monitoring|.*\\..*).*)"] };
