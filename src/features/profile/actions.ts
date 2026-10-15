"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { invalidateReports } from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { resolvePlaceFor, suggestPlaces } from "@/lib/mapbox";
import type { PlaceSuggestion } from "@/lib/mapbox";
import { z } from "zod";
import { updateOwnDetails } from "@/use-cases/update-own-details";
import { notificationPreferences, ownDetailsPatch, profile } from "./index";

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
    if (parsed.data.name !== undefined && chapterIds.length)
      invalidateReports(...chapterIds);
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
