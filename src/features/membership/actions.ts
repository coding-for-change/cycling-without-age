"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_PILOT_CHAPTERS, membership } from "@/features/membership";
import { requireAuth } from "@/lib/auth-guards";
import { domainCode } from "@/lib/domain-error";

/**
 * The Boundary Layer for joining a chapter (AGENTS.md §2). Joining as a
 * passenger touches only the membership feature, so the Action calls the Facade
 * directly; applying as a pilot also writes history, so that one goes through a
 * Use Case.
 *
 * A Server Action is a public POST endpoint, not a private function: everything
 * below re-derives identity from the session and re-validates its input, because
 * rendering a screen behind a guard proves nothing about who calls the action.
 */

export type MembershipActionResult =
  | { ok: true }
  | { ok: false; error: "unknownChapter" | "alreadyPilot" | "generic" };

const chapterId = z.string().min(1).max(64);
/** The cap is the rate limit for one request: without it a single POST could
 *  create an unbounded number of applications. */
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
    return {
      ok: false,
      error:
        domainCode(error) === "unknownChapter" ? "unknownChapter" : "generic",
    };
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
    // `/onboarding` decides the next screen from this application's existence.
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    // The facade refuses an application from someone who is already a pilot
    // there. Harmless, but the person deserves to be told which it was.
    const code = domainCode(error);
    if (code === "unknownChapter" || code === "alreadyPilot") {
      return { ok: false, error: code };
    }
    return { ok: false, error: "generic" };
  }
}

/**
 * Fired by the celebration banner on `/pilot` so it appears exactly once.
 * Deliberately does not revalidate: the banner is already on screen and the
 * next natural request re-reads `approvalSeenAt`.
 */
export async function acknowledgeApproval(): Promise<MembershipActionResult> {
  const session = await requireAuth();

  try {
    await membership.markApprovalsSeen(session.user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}
