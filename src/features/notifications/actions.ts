"use server";

import { z } from "zod";
import { getSession, requireAuth } from "@/lib/auth-guards";
import { withinRateLimit } from "@/lib/rate-limit";
import { deviceInput, deviceTokenInput, notifications } from "./index";

export type NotificationActionResult =
  { ok: true } | { ok: false; error: "generic" };

const notificationId = z.string().min(1).max(64);

/**
 * No `revalidatePath` on either mark: the inbox is read at request time, and
 * the bell already applies the change locally. Re-rendering a whole route to
 * repaint a badge is the wrong price.
 */
export async function markInboxSeen(): Promise<NotificationActionResult> {
  const session = await requireAuth();
  try {
    await notifications.markSeen(session.user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export async function markNotificationRead(
  id: unknown,
): Promise<NotificationActionResult> {
  const session = await requireAuth();
  const parsed = notificationId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "generic" };
  try {
    await notifications.markRead(parsed.data, session.user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/**
 * Push registration runs in the background of a page the user is already on,
 * so a missing session answers instead of redirecting: `requireAuth` would
 * turn a silent token refresh into a navigation.
 */
export async function registerDevice(
  input: unknown,
): Promise<NotificationActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "generic" };
  // A token refresh is rare; anything past this is a client inserting rows.
  const allowed = withinRateLimit(`device:${session.user.id}`, {
    max: 10,
    windowMs: 60_000,
  });
  if (!allowed) return { ok: false, error: "generic" };
  const parsed = deviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  try {
    // The owner comes from the session; the client only ever names its token.
    await notifications.registerDevice({
      userId: session.user.id,
      ...parsed.data,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export async function unregisterDevice(
  input: unknown,
): Promise<NotificationActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "generic" };
  const parsed = deviceTokenInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  try {
    await notifications.unregisterDevice(session.user.id, parsed.data.token);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}
