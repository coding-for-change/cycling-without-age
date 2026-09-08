"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth-guards";
import { notifications } from "./index";

export type NotificationActionResult =
  { ok: true } | { ok: false; error: "generic" };

const notificationId = z.string().min(1).max(64);

// No revalidatePath: nothing renders the inbox yet. The bell adds it.
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
