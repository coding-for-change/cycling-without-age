"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import {
  chapters,
  chapterInput,
  chapterUpdateInput,
} from "@/features/chapters";
import {
  requireCountryAdmin,
  requireCountryAdminOfChapter,
} from "@/lib/auth-guards";

export type ChapterActionResult =
  { ok: true } | { ok: false; error: "slugTaken" | "generic" };

const chapterId = z.string().min(1).max(64);

const failed = (error: unknown): ChapterActionResult =>
  (error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002") ||
  (error instanceof Error && error.message.includes("Slug already taken"))
    ? { ok: false, error: "slugTaken" }
    : { ok: false, error: "generic" };

export async function createChapterAction(
  input: z.input<typeof chapterInput>,
): Promise<ChapterActionResult> {
  const parsed = chapterInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  // Which country the chapter lands in decides who may create it, so the
  // payload is parsed before the guard reads `countryId` off it.
  await requireCountryAdmin(parsed.data.countryId);

  try {
    await chapters.createChapter(parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function updateChapterAction(
  id: string,
  input: z.input<typeof chapterUpdateInput>,
): Promise<ChapterActionResult> {
  const parsedId = chapterId.safeParse(id);
  const parsed = chapterUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success)
    return { ok: false, error: "generic" };
  await requireCountryAdminOfChapter(parsedId.data);

  try {
    await chapters.updateChapter(parsedId.data, parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}
