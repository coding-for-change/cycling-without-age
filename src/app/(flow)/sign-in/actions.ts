"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { readNextPath, requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import {
  encodeJoinPreset,
  JOIN_PRESET_COOKIE,
  JOIN_PRESET_COOKIE_OPTIONS,
  readJoinPreset,
} from "@/lib/join-preset";
import { resolveDestination } from "@/use-cases/onboarding-progress";

const choice = z.enum(["passenger", "caretaker", "pilot"]);

export type RoleAtChapterResult =
  { ok: true; next: string } | { ok: false; error: "noChapter" | "generic" };

export async function chooseRoleAtChapter(
  input: unknown,
): Promise<RoleAtChapterResult> {
  const session = await requireAuth();
  const parsed = choice.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  const { chapterId } = await readJoinPreset();
  if (!chapterId || !(await chapters.getChapter(chapterId)))
    return { ok: false, error: "noChapter" };

  try {
    const preset = {
      chapterId,
      role:
        parsed.data === "pilot" ? ("pilot" as const) : ("passenger" as const),
    };
    if (parsed.data === "caretaker")
      await profile.markManagesOthers(session.user.id);
    (await cookies()).set(
      JOIN_PRESET_COOKIE,
      encodeJoinPreset(preset),
      JOIN_PRESET_COOKIE_OPTIONS,
    );
    revalidatePath("/onboarding");
    return {
      ok: true,
      next: await resolveDestination(session, preset, await readNextPath()),
    };
  } catch (error) {
    return actionFailure(error, {});
  }
}
