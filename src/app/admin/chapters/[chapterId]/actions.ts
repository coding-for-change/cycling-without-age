"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  chapters,
  chapterSettingsInput,
  closureInput,
  operatingHoursInput,
} from "@/features/chapters";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";

export type SettingsActionResult =
  { ok: true } | { ok: false; error: "generic" };

const chapterId = z.string().min(1).max(64);

const refresh = (id: string) => {
  revalidatePath(`/admin/chapters/${id}`);
  revalidatePath("/admin/rides");
};

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
    refresh(parsedId.data);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export type HoursActionResult =
  { ok: true } | { ok: false; error: "invalidHours" | "generic" };

export async function setOperatingHoursAction(
  id: string,
  input: unknown,
): Promise<HoursActionResult> {
  const parsedId = chapterId.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "generic" };
  await requireChapterAdmin(parsedId.data);

  const parsed = operatingHoursInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidHours" };

  try {
    await chapters.setOperatingWindows(parsedId.data, parsed.data);
    refresh(parsedId.data);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export type ClosureActionResult =
  | { ok: true; closure: { id: string; date: string; reason: string | null } }
  | { ok: false; error: "generic" };

export async function addClosureAction(
  id: string,
  input: unknown,
): Promise<ClosureActionResult> {
  const parsedId = chapterId.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "generic" };
  await requireChapterAdmin(parsedId.data);

  const parsed = closureInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  try {
    const closure = await chapters.addClosure(parsedId.data, parsed.data);
    refresh(parsedId.data);
    return { ok: true, closure };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function removeClosureAction(
  id: string,
  closureId: string,
): Promise<SettingsActionResult> {
  const parsedId = chapterId.safeParse(id);
  const parsedClosure = chapterId.safeParse(closureId);
  if (!parsedId.success || !parsedClosure.success)
    return { ok: false, error: "generic" };
  await requireChapterAdmin(parsedId.data);

  try {
    await chapters.removeClosure(parsedId.data, parsedClosure.data);
    refresh(parsedId.data);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}
