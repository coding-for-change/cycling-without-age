"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { withinRateLimit } from "@/lib/rate-limit";
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
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
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
  } catch {
    return { ok: false, error: "generic" };
  }
}
