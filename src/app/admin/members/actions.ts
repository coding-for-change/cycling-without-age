"use server";

import { revalidatePath } from "next/cache";
import { actionFailure } from "@/lib/domain-error";
import { z } from "zod";
import { accounts } from "@/features/accounts";
import {
  requireAuth,
  requireChapterAdmin,
  requireSuperAdmin,
} from "@/lib/auth-guards";
import { membership } from "@/features/membership";

export type AdminActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "lastAdmin" | "alreadyDecided" | "self" | "generic";
    };

const id = z.string().min(1).max(64);

const decisionInput = z.object({
  applicationId: id,
  approve: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

const roleChangeInput = z.object({
  userId: id,
  chapterId: id,
  change: z.enum(["promote", "demote", "remove"]),
});

const deleteUserInput = z.object({ userId: id });

const failed = (error: unknown): AdminActionResult =>
  actionFailure(error, {
    lastAdmin: "lastAdmin",
    alreadyDecided: "alreadyDecided",
    selfChange: "self",
  });

export async function decideApplicationAction(
  input: z.input<typeof decisionInput>,
): Promise<AdminActionResult> {
  const parsed = decisionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  await requireAuth();
  const application = await membership.getApplication(
    parsed.data.applicationId,
  );
  if (!application) return { ok: false, error: "generic" };
  const session = await requireChapterAdmin(application.chapterId);

  try {
    await membership.decideApplication({
      applicationId: parsed.data.applicationId,
      decidedByUserId: session.user.id,
      approve: parsed.data.approve,
      note: parsed.data.note,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function changeMemberRoleAction(
  input: z.input<typeof roleChangeInput>,
): Promise<AdminActionResult> {
  const parsed = roleChangeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireChapterAdmin(parsed.data.chapterId);

  try {
    await membership.changeMemberRole({
      userId: parsed.data.userId,
      chapterId: parsed.data.chapterId,
      change: parsed.data.change,
      actorUserId: session.user.id,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function deleteUserAction(
  input: z.input<typeof deleteUserInput>,
): Promise<AdminActionResult> {
  const parsed = deleteUserInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireSuperAdmin();
  if (session.user.id === parsed.data.userId)
    return { ok: false, error: "self" };

  try {
    await accounts.deleteUser(parsed.data.userId);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}
