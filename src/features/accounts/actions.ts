"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, requireChapterAdmin } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { getLocale } from "@/lib/i18n";
import { withinRateLimit } from "@/lib/rate-limit";
import { inviteChapterUser as invite } from "@/use-cases/invite-chapter-user";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import { assistedPassengerInput, inviteInput } from "./schemas";

export type AccountActionResult =
  { ok: true } | { ok: false; error: "exists" | "invalid" | "generic" };

export type InviteActionResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

export async function addAssistedPassenger(
  input: unknown,
): Promise<AccountActionResult> {
  const parsed = assistedPassengerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireChapterAdmin(parsed.data.chapterId);

  try {
    await provisionAssistedPassenger({
      adminUserId: session.user.id,
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Already has an account"))
      return { ok: false, error: "exists" };
    return { ok: false, error: "generic" };
  }
}

export async function inviteChapterUser(
  input: unknown,
): Promise<InviteActionResult> {
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireChapterAdmin(parsed.data.chapterId);

  try {
    await invite({
      inviterUserId: session.user.id,
      inviterName: session.user.name,
      locale: await getLocale(),
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

const previewEmail = z.string().trim().min(1).max(254);

export async function previewAvatar(email: unknown): Promise<string | null> {
  const parsed = previewEmail.safeParse(email);
  if (!parsed.success) return null;

  const session = await requireAuth();
  const allowed = withinRateLimit(`avatar-preview:${session.user.id}`, {
    max: 120,
    windowMs: 60_000,
  });
  if (!allowed) return null;

  return avatarSvg(avatarSeed(parsed.data));
}
