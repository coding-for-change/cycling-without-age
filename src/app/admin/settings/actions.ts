"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chapters, chapterSettingsInput } from "@/features/chapters";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";

export type SettingsActionResult =
  { ok: true } | { ok: false; error: "generic" };

const chapterId = z.string().min(1).max(64);

export async function updateChapterSettingsAction(
  id: string,
  input: unknown,
): Promise<SettingsActionResult> {
  const parsedId = chapterId.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "generic" };
  await requireChapterAdmin(parsedId.data);

  const parsed = chapterSettingsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  try {
    await chapters.updateSettings(parsedId.data, parsed.data);
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}
