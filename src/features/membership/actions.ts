"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { MAX_PILOT_CHAPTERS, membership } from "@/features/membership";
import { requireAuth } from "@/lib/auth-guards";

/**
 * The Boundary Layer for joining a chapter (AGENTS.md §2). Both operations touch
 * only the membership feature, so the Action calls the Facade directly — a Use
 * Case here would be a layer with nothing to coordinate.
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

/** A chapter id that does not exist trips the foreign key rather than a lookup —
 *  the constraint already guarantees it, and calling the chapters facade here
 *  would drag a second feature in and force a Use Case for nothing. */
const isUnknownChapter = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2003";

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
      error: isUnknownChapter(error) ? "unknownChapter" : "generic",
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
    // Sequential rather than Promise.all: one foreign-key violation must not
    // leave the others in an unknown state, and five upserts is not a problem.
    for (const id of parsed.data) {
      await membership.applyAsPilot({ userId: session.user.id, chapterId: id });
    }
    // `/onboarding` decides the next screen from this application's existence.
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    if (isUnknownChapter(error)) return { ok: false, error: "unknownChapter" };
    // The facade refuses an application from someone who is already a pilot
    // there. Harmless, but the person deserves to be told which it was.
    if (error instanceof Error && error.message === membership.ALREADY_PILOT) {
      return { ok: false, error: "alreadyPilot" };
    }
    return { ok: false, error: "generic" };
  }
}
