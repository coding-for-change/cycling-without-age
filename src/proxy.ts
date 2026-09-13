import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { NEXT_COOKIE, NEXT_MAX_AGE, safeNextPath } from "@/lib/redirects";

const NATIVE_UA = "CWA-Native";

/**
 * Where `/` goes. Three audiences, three answers.
 *
 * Someone already signed in never sees a sign-in screen again: `/onboarding`
 * reads how far they got and forwards them to their own home, or to the step
 * they stopped on. Someone opening the app for the first time has probably
 * never heard of Cycling Without Age and gets the story; someone following a
 * link from cyclingwithoutage.org already knows, and goes straight to sign-in.
 *
 * The session check here is cookie PRESENCE, not validation — middleware has no
 * database. A stale cookie therefore sends someone to `/onboarding`, whose
 * `requireAuth()` validates properly and sends them on to `/sign-in`. That is
 * why `requireAuth` must not redirect back to `/`: it would loop against this.

 */
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

export const config = { matcher: ["/((?!_next/|api/|.*\\..*).*)"] };
