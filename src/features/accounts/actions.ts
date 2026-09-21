"use server";

import { revalidatePath } from "next/cache";
import { actionFailure } from "@/lib/domain-error";
import { z } from "zod";
import { requireAuth, requireChapterAdmin } from "@/lib/auth-guards";
import { canDeleteOwnAccount } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { getLocale } from "@/lib/i18n";
import { withinRateLimit } from "@/lib/rate-limit";
import { inviteChapterUser as invite } from "@/use-cases/invite-chapter-user";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import { accounts } from "./index";
import { assistedPassengerInput, inviteInput } from "./schemas";

export type AccountActionResult =
  { ok: true } | { ok: false; error: "exists" | "invalid" | "generic" };

export type InviteActionResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

export type DeleteOwnAccountResult =
  | { ok: true }
  | { ok: false; error: "handOverAdmin" | "rateLimited" | "generic" };

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
    return actionFailure(error, { alreadyHasAccount: "exists" } as const);
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
      locale: await getLocale(),
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
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

export async function deleteOwnAccountAction(): Promise<DeleteOwnAccountResult> {
  const session = await requireAuth();

  if (!canDeleteOwnAccount(session.access))
    return { ok: false, error: "handOverAdmin" };

  const allowed = withinRateLimit(`delete-account:${session.user.id}`, {
    max: 3,
    windowMs: 60_000,
  });
  if (!allowed) return { ok: false, error: "rateLimited" };

  try {
    await accounts.deleteUser(session.user.id);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}
