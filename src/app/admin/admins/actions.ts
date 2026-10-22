"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admins, inviteId, inviteeInput } from "@/features/admins";
import {
  refreshSessionCookie,
  requireSuperAdmin,
  requireSuperAdminStepUp,
} from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { getLocale } from "@/lib/i18n";
import { inviteAdmin } from "@/use-cases/invite-admin";

export type AdminsActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "stepUp"
        | "alreadyAdmin"
        | "lastSuperadmin"
        | "inviteClosed"
        | "generic";
    };

const userId = z.string().min(1).max(64);

const failed = (error: unknown) =>
  actionFailure(error, {
    alreadyAdmin: "alreadyAdmin",
    lastSuperadmin: "lastSuperadmin",
    inviteClosed: "inviteClosed",
  });

const refresh = () => revalidatePath("/admin/admins");

export async function inviteSuperadminAction(
  input: z.input<typeof inviteeInput>,
): Promise<AdminsActionResult> {
  const parsed = inviteeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const { session, fresh } = await requireSuperAdminStepUp();
  if (!fresh) return { ok: false, error: "stepUp" };

  try {
    await inviteAdmin({
      actorUserId: session.user.id,
      locale: await getLocale(),
      invitee: parsed.data,
      target: { kind: "superadmin" },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function revokeSuperadminInviteAction(
  id: string,
): Promise<AdminsActionResult> {
  const parsed = inviteId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "generic" };
  await requireSuperAdmin();

  try {
    await admins.revokeInvite(parsed.data, "superadmin");
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function removeSuperadminAction(
  id: string,
): Promise<AdminsActionResult> {
  const parsed = userId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "generic" };
  const { session, fresh } = await requireSuperAdminStepUp();
  if (!fresh) return { ok: false, error: "stepUp" };

  try {
    await admins.removeSuperadmin(parsed.data, session.user.id);
    if (parsed.data === session.user.id) await refreshSessionCookie();
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}
