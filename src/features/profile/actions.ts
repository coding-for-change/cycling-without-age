"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { avatarSvg } from "@/lib/avatar";
import {
  DISPLAY_COOKIE_MAX_AGE,
  MOTION_COOKIE,
  REDUCED_MOTION,
  TEXT_SIZE_COOKIE,
} from "@/lib/display-preferences";
import { invalidateReports } from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { resolvePlaceFor, suggestPlaces } from "@/lib/mapbox";
import type { PlaceSuggestion } from "@/lib/mapbox";
import { z } from "zod";
import { updateOwnDetails } from "@/use-cases/update-own-details";
import {
  avatarSeedInput,
  displayPreferences,
  notificationPreferences,
  ownDetailsPatch,
  profile,
} from "./index";

export type ProfileActionResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

const SAVE_LIMIT = { max: 60, windowMs: 60_000 };

const withinSaveLimit = (userId: string) =>
  withinRateLimit(`own-details:${userId}`, SAVE_LIMIT);

export async function updateOwnDetailsAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const session = await requireAuth();

  const parsed = ownDetailsPatch.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!withinSaveLimit(session.user.id)) return { ok: false, error: "generic" };

  try {
    await updateOwnDetails(session.user.id, parsed.data);
    revalidatePath("/", "layout");
    const chapterIds = session.access.memberships.map((m) => m.chapterId);
    const renamed = ["name", "firstName", "lastName"].some(
      (key) => parsed.data[key as keyof typeof parsed.data] !== undefined,
    );
    if (renamed && chapterIds.length) invalidateReports(...chapterIds);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function setNotificationPreferencesAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const session = await requireAuth();

  const parsed = notificationPreferences.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!withinSaveLimit(session.user.id)) return { ok: false, error: "generic" };

  try {
    await profile.setNotificationPreferences(session.user.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

const SEARCH_LIMIT = { max: 60, windowMs: 60_000 };
const searchInput = z.object({
  query: z.string().trim().min(3).max(120),
  sessionToken: z.string().uuid(),
  language: z.string().max(8).optional(),
});

export async function suggestAddresses(
  input: unknown,
): Promise<PlaceSuggestion[]> {
  const session = await requireAuth();
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return [];

  if (!withinRateLimit(`places:${session.user.id}`, SEARCH_LIMIT)) return [];
  return suggestPlaces(parsed.data.query, parsed.data.sessionToken, {
    language: parsed.data.language,
  });
}

export async function resolveAddress(
  input: unknown,
): Promise<{ address: string; latitude: number; longitude: number } | null> {
  const session = await requireAuth();
  const place = await resolvePlaceFor(session.user.id, input);
  return place
    ? {
        address: place.address,
        latitude: place.coords.lat,
        longitude: place.coords.lng,
      }
    : null;
}

const displayCookie = {
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DISPLAY_COOKIE_MAX_AGE,
} as const;

/**
 * The account keeps the choice; the cookies let the root layout draw the next
 * page at the right size before anything paints.
 */
export async function setDisplayPreferencesAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const session = await requireAuth();

  const parsed = displayPreferences.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!withinSaveLimit(session.user.id)) return { ok: false, error: "generic" };

  try {
    await profile.setDisplayPreferences(session.user.id, parsed.data);
    const jar = await cookies();
    const { textSize, reduceMotion } = parsed.data;
    if (textSize !== undefined)
      jar.set(TEXT_SIZE_COOKIE, textSize, displayCookie);
    if (reduceMotion !== undefined)
      jar.set(MOTION_COOKIE, reduceMotion ? REDUCED_MOTION : "", displayCookie);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export type AvatarSuggestion = { seed: string; svg: string };

const AVATAR_SUGGESTIONS = 6;
const SUGGEST_LIMIT = { max: 30, windowMs: 60_000 };

/** Fresh characters to choose from, drawn on the server so DiceBear never ships. */
export async function suggestAvatarsAction(): Promise<AvatarSuggestion[]> {
  const session = await requireAuth();
  if (!withinRateLimit(`avatar-suggest:${session.user.id}`, SUGGEST_LIMIT))
    return [];
  return Array.from({ length: AVATAR_SUGGESTIONS }, () => {
    const seed = randomBytes(9).toString("base64url");
    return { seed, svg: avatarSvg(seed) };
  });
}

/**
 * The character drawn where there is no photo. A photo, when there is one,
 * still comes first (`PersonAvatar`'s `photoUrl`).
 */
export async function setAvatarAction(
  seed: unknown,
): Promise<ProfileActionResult> {
  const session = await requireAuth();

  const parsed = avatarSeedInput.safeParse(seed);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!withinSaveLimit(session.user.id)) return { ok: false, error: "generic" };

  try {
    await profile.setAvatarSeed(session.user.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}
