"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { membership } from "@/features/membership";
import { requireAuth, requireChapterAdmin } from "@/lib/auth-guards";
import { changeMemberRole, SELF_CHANGE } from "@/use-cases/change-member-role";
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

function failed(error: unknown): AdminActionResult {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Last admin of the chapter"))
    return { ok: false, error: "lastAdmin" };
  if (message.includes("Application already decided"))
    return { ok: false, error: "alreadyDecided" };
  if (error instanceof Error && error.message === SELF_CHANGE)
    return { ok: false, error: "self" };
  return { ok: false, error: "generic" };
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
    await changeMemberRole({
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
