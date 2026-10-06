"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { chapters } from "@/features/chapters";
import { homeInput } from "@/features/profile";
import { readNextPath, requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import {
  GUEST_CHAPTER_COOKIE,
  GUEST_CHAPTER_MAX_AGE,
} from "@/lib/guest-chapter";
import { cyclingRoute, resolvePlaceFor } from "@/lib/mapbox";
import { EMPTY_PRESET } from "@/lib/join-preset";
import { resolveDestination } from "@/use-cases/onboarding-progress";
import {
  settleCaretakerLocation,
  settlePassengerLocation,
} from "@/use-cases/settle-passenger-location";

const chapterId = z.string().min(1).max(64);

export async function rememberGuestChapter(
  id: string,
): Promise<{ ok: true } | { ok: false; error: "unknownChapter" }> {
  const parsed = chapterId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "unknownChapter" };

  (await cookies()).set(GUEST_CHAPTER_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_CHAPTER_MAX_AGE,
  });
  return { ok: true };
}

export type HomeResolution =
  | { ok: false }
  | {
      ok: true;
      address: string;
      coords: { lat: number; lng: number };
      chapter: {
        id: string;
        name: string;
        careHomeName: string | null;
        city: string;
        coords: { lat: number; lng: number };
        radiusKm: number;
      } | null;
      distanceMeters: number | null;
      inRange: boolean;
      /** GeoJSON `[lng, lat]` pairs for the map, and the ride's own estimate. */
      route: { path: [number, number][]; durationSec: number } | null;
    };

/**
 * Turns a chosen suggestion into everything the screen needs at once: the
 * address, the nearest chapter, whether that chapter reaches this far, and the
 * trishaw route between them. One roundtrip, because they are one answer.
 */
export async function resolveHomeAddress(
  input: unknown,
): Promise<HomeResolution> {
  const session = await requireAuth();
  const place = await resolvePlaceFor(session.user.id, input);
  if (!place) return { ok: false };

  const nearest = await chapters.nearestChapter(place.coords);
  if (!nearest) {
    return {
      ok: true,
      ...place,
      chapter: null,
      distanceMeters: null,
      inRange: false,
      route: null,
    };
  }

  const target = {
    lat: nearest.chapter.latitude,
    lng: nearest.chapter.longitude,
  };
  // Only worth asking for a route we might actually draw — a 300 km line across
  // a country tells the person nothing the distance did not already say.
  const route = nearest.inRange
    ? await cyclingRoute(place.coords, target)
    : null;

  return {
    ok: true,
    ...place,
    chapter: {
      id: nearest.chapter.id,
      name: nearest.chapter.name,
      careHomeName: nearest.chapter.careHomeName,
      city: nearest.chapter.city,
      coords: target,
      radiusKm: nearest.chapter.serviceRadiusKm,
    },
    distanceMeters: nearest.distanceMeters,
    inRange: nearest.inRange,
    route: route && { path: route.path, durationSec: route.durationSec },
  };
}

/* -------------------------------------------------------------------------- */
/* Joining                                                                    */
/* -------------------------------------------------------------------------- */

export type LocationResult =
  | { ok: true; next: string }
  | { ok: false; error: "unknownChapter" | "generic" };

const settleInput = z.discriminatedUnion("residence", [
  z.object({ residence: z.literal("careHome"), chapterId }),
  z.object({ residence: z.literal("home"), chapterId, home: homeInput }),
]);

export async function settlePassengerAt(
  input: unknown,
): Promise<LocationResult> {
  const session = await requireAuth();
  const parsed = settleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  if (!(await chapters.getChapter(parsed.data.chapterId))) {
    return { ok: false, error: "unknownChapter" };
  }

  try {
    await settlePassengerLocation({
      userId: session.user.id,
      chapterId: parsed.data.chapterId,
      residence: parsed.data.residence,
      home: parsed.data.residence === "home" ? parsed.data.home : undefined,
    });
    revalidatePath("/onboarding");
    // Named outright rather than left to `/onboarding` to redirect: a cached
    // redirect replays. See `resolveDestination`.
    return {
      ok: true,
      next: await resolveDestination(
        session,
        EMPTY_PRESET,
        await readNextPath(),
      ),
    };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function settleCaretakerAt(
  input: unknown,
): Promise<LocationResult> {
  const session = await requireAuth();
  const parsed = chapterId.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  if (!(await chapters.getChapter(parsed.data))) {
    return { ok: false, error: "unknownChapter" };
  }

  try {
    await settleCaretakerLocation({
      userId: session.user.id,
      chapterId: parsed.data,
    });
    revalidatePath("/onboarding");
    return {
      ok: true,
      next: await resolveDestination(
        session,
        EMPTY_PRESET,
        await readNextPath(),
      ),
    };
  } catch (error) {
    return actionFailure(error, {});
  }
}
