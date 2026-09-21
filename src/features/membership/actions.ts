"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_PILOT_CHAPTERS, membership } from "@/features/membership";
import { requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";

export type MembershipActionResult =
  | { ok: true }
  | { ok: false; error: "unknownChapter" | "alreadyPilot" | "generic" };

const chapterId = z.string().min(1).max(64);
const chapterIds = z.array(chapterId).min(1).max(MAX_PILOT_CHAPTERS);

export async function joinChapterAsPassenger(
  id: string,
): Promise<MembershipActionResult> {
  const session = await requireAuth();
  const parsed = chapterId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "unknownChapter" };

  try {
    await membership.joinAsPassenger(session.user.id, parsed.data);
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      unknownChapter: "unknownChapter",
    } as const);
  }
}

export async function applyToChaptersAsPilot(
  ids: string[],
): Promise<MembershipActionResult> {
  const session = await requireAuth();
  const parsed = chapterIds.safeParse([...new Set(ids)]);
  if (!parsed.success) return { ok: false, error: "generic" };

  try {
    await membership.submitPilotApplications({
      userId: session.user.id,
      chapterIds: parsed.data,
    });
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      unknownChapter: "unknownChapter",
      alreadyPilot: "alreadyPilot",
    } as const);
  }
}

export async function acknowledgeApproval(): Promise<MembershipActionResult> {
  const session = await requireAuth();

  try {
    await membership.markApprovalsSeen(session.user.id);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}
