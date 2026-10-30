"use server";

import { revalidatePath } from "next/cache";
import {
  expirePasskeys,
  invalidateAccess,
  invalidateReports,
} from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { z } from "zod";
import { requireAuth, requireChapterAdmin } from "@/lib/auth-guards";
import { canDeleteOwnAccount } from "@/lib/access";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { getLocale } from "@/lib/i18n";
import { withinRateLimit } from "@/lib/rate-limit";
import { inviteChapterUser as invite } from "@/use-cases/invite-chapter-user";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import { accounts } from "@/features/accounts";
import {
  appleAuthorizationCode,
  assistedPassengerInput,
  inviteInput,
} from "./schemas";
import { deleteAccount } from "@/use-cases/delete-account";

export type AccountActionResult =
  | { ok: true; outcome: "created" | "sent" }
  | {
      ok: false;
      error: "exists" | "tooMany" | "invalid" | "generic";
    };

export type InviteActionResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

export type DeleteOwnAccountResult =
  | { ok: true }
  | {
      ok: false;
      error: "handOverAdmin" | "managesRiders" | "rateLimited" | "generic";
    };

const deleteOwnInput = z
  .object({
    removeRiders: z.array(z.string().min(1).max(64)).max(50).default([]),
  })
  .default({ removeRiders: [] });

const ADD_LIMIT = { max: 60, windowMs: 60 * 60_000 };

export async function addAssistedPassenger(
  input: unknown,
): Promise<AccountActionResult> {
  const parsed = assistedPassengerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireChapterAdmin(parsed.data.chapterId);
  if (!withinRateLimit(`add-passenger:${session.user.id}`, ADD_LIMIT))
    return { ok: false, error: "generic" };

  try {
    const { userId, outcome } = await provisionAssistedPassenger({
      adminUserId: session.user.id,
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    invalidateReports(parsed.data.chapterId);
    invalidateAccess({ userIds: [userId] });
    return { ok: true, outcome };
  } catch (error) {
    return actionFailure(error, {
      alreadyHasAccount: "exists",
      passengerChapterMismatch: "exists",
      tooManyRiders: "tooMany",
    } as const);
  }
}

export async function inviteChapterUser(
  input: unknown,
): Promise<InviteActionResult> {
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireChapterAdmin(parsed.data.chapterId);

  try {
    const { userId } = await invite({
      inviterUserId: session.user.id,
      locale: await getLocale(),
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    invalidateReports(parsed.data.chapterId);
    invalidateAccess({ userIds: [userId] });
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

/**
 * `removeRiders` names the riders the account holder was shown and agreed to
 * remove; an account that looks after anyone else is not deleted.
 */
export async function deleteOwnAccountAction(
  input?: unknown,
): Promise<DeleteOwnAccountResult> {
  const parsed = deleteOwnInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();

  if (!canDeleteOwnAccount(session.access))
    return { ok: false, error: "handOverAdmin" };

  const allowed = withinRateLimit(`delete-account:${session.user.id}`, {
    max: 3,
    windowMs: 60_000,
  });
  if (!allowed) return { ok: false, error: "rateLimited" };

  try {
    await deleteAccount(session.user.id, session.user.id, parsed.data);
    revalidatePath("/admin", "layout");
    invalidateReports();
    return { ok: true };
  } catch (error) {
    return actionFailure(error, { managesRiders: "managesRiders" } as const);
  } finally {
    invalidateAccess({ userIds: [session.user.id] });
    expirePasskeys(session.user.id);
  }
}

/** Called right after the native iOS sheet signed someone in with Apple. */
export async function keepNativeAppleRefreshTokenAction(
  authorizationCode: unknown,
): Promise<{ ok: true } | { ok: false; error: "generic" }> {
  const parsed = appleAuthorizationCode.safeParse(authorizationCode);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();

  const allowed = withinRateLimit(`apple-sign-in:${session.user.id}`, {
    max: 5,
    windowMs: 60_000,
  });
  if (!allowed) return { ok: false, error: "generic" };

  try {
    await accounts.keepNativeAppleRefreshToken(session.user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}
