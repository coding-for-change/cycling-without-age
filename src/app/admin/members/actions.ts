"use server";

import { revalidatePath } from "next/cache";
import { domainCode } from "@/lib/domain-error";
import { z } from "zod";
import { accounts } from "@/features/accounts";
import {
  requireAuth,
  requireChapterAdmin,
  requireSuperAdmin,
} from "@/lib/auth-guards";
import { membership } from "@/features/membership";
import { decidePilotApplication } from "@/use-cases/decide-pilot-application";

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

function failed(error: unknown): AdminActionResult {
  switch (domainCode(error)) {
    case "lastAdmin":
      return { ok: false, error: "lastAdmin" };
    case "alreadyDecided":
      return { ok: false, error: "alreadyDecided" };
    case "selfChange":
      return { ok: false, error: "self" };
    default:
      return { ok: false, error: "generic" };
  }
}

export async function decideApplicationAction(
  input: z.input<typeof decisionInput>,
): Promise<AdminActionResult> {
  const parsed = decisionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  // The chapter to guard against is the application's, so it has to be read
  // first — behind a session, so an anonymous POST cannot probe for ids.
  await requireAuth();
  const application = await membership.getApplication(
    parsed.data.applicationId,
  );
  if (!application) return { ok: false, error: "generic" };
  const session = await requireChapterAdmin(application.chapterId);

  try {
    await decidePilotApplication({
      applicationId: parsed.data.applicationId,
      actorUserId: session.user.id,
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

// Superadmin only: an account spans chapters, so no chapter or country admin can
// see enough of it to take it away. A chapter admin removes people from the
// chapter instead.
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
