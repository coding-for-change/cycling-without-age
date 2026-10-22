"use server";

import { revalidatePath } from "next/cache";
import { inviteId as inviteIdSchema } from "@/features/admins";
import { refreshSessionCookie, requireAuth } from "@/lib/auth-guards";
import { invalidateAccess } from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { acceptAdminInvite } from "@/use-cases/accept-admin-invite";

export type AcceptAdminInviteResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "notFound"
        | "passkeyRequired"
        | "inviteClosed"
        | "inviteExpired"
        | "generic";
    };

export async function acceptAdminInviteAction(
  inviteId: string,
): Promise<AcceptAdminInviteResult> {
  const parsed = inviteIdSchema.safeParse(inviteId);
  if (!parsed.success) return { ok: false, error: "notFound" };
  const session = await requireAuth();

  try {
    await acceptAdminInvite({ inviteId: parsed.data, userId: session.user.id });
    invalidateAccess({ userIds: [session.user.id] });
    await refreshSessionCookie();
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      notFound: "notFound",
      passkeyRequired: "passkeyRequired",
      inviteClosed: "inviteClosed",
      inviteExpired: "inviteExpired",
    });
  }
}
