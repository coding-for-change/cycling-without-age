"use server";

import { z } from "zod";
import { getSession, requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { deviceInput, deviceTokenInput, notifications } from "./index";

export type NotificationActionResult =
  { ok: true } | { ok: false; error: "generic" };

const notificationId = z.string().min(1).max(64);

const GENERIC: NotificationActionResult = { ok: false, error: "generic" };

const attempt = async (
  run: () => Promise<unknown>,
): Promise<NotificationActionResult> => {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
};

export async function markInboxSeen(): Promise<NotificationActionResult> {
  const session = await requireAuth();
  return attempt(() => notifications.markSeen(session.user.id));
}

export async function markNotificationRead(
  id: unknown,
): Promise<NotificationActionResult> {
  const session = await requireAuth();
  const parsed = notificationId.safeParse(id);
  if (!parsed.success) return GENERIC;
  return attempt(() => notifications.markRead(parsed.data, session.user.id));
}

export async function registerDevice(
  input: unknown,
): Promise<NotificationActionResult> {
  const session = await getSession();
  if (!session) return GENERIC;
  const allowed = withinRateLimit(`device:${session.user.id}`, {
    max: 10,
    windowMs: 60_000,
  });
  if (!allowed) return GENERIC;
  const parsed = deviceInput.safeParse(input);
  if (!parsed.success) return GENERIC;
  return attempt(() =>
    notifications.registerDevice({ userId: session.user.id, ...parsed.data }),
  );
}

export async function unregisterDevice(
  input: unknown,
): Promise<NotificationActionResult> {
  const session = await getSession();
  if (!session) return GENERIC;
  const parsed = deviceTokenInput.safeParse(input);
  if (!parsed.success) return GENERIC;
  return attempt(() =>
    notifications.unregisterDevice(session.user.id, parsed.data.token),
  );
}
