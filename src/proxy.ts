import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { NATIVE_UA } from "@/lib/device";
import { NEXT_COOKIE, NEXT_MAX_AGE, safeNextPath } from "@/lib/redirects";
import { hasLocale, LOCALE_COOKIE, LOCALE_PARAM } from "@/lib/i18n/locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

// The session check is cookie presence only: middleware has no database.
// `requireAuth` must not redirect back to `/`, or it would loop against this.
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = Boolean(getSessionCookie(request));

  const forcedLocale = searchParams.get(LOCALE_PARAM);
  if (forcedLocale !== null) {
    const destination = request.nextUrl.clone();
    destination.searchParams.delete(LOCALE_PARAM);
    const response = NextResponse.redirect(destination);
    if (hasLocale(forcedLocale))
      response.cookies.set(LOCALE_COOKIE, forcedLocale, {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ONE_YEAR,
      });
    return response;
  }

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
