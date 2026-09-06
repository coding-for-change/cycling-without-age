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
  requireAdminScope,
  requireCountryAdmin,
  requireCountryAdminOfChapter,
} from "@/lib/auth-guards";
import {
  retrievePlace,
  reversePlace,
  suggestPlaces,
  type PlaceSuggestion,
  type ResolvedPlace,
} from "@/lib/mapbox";
import { withinRateLimit } from "@/lib/rate-limit";
import {
  createChapter,
  deleteChapter,
  updateChapter,
} from "@/use-cases/manage-chapter";

export type ChapterActionResult =
  { ok: true } | { ok: false; error: "slugTaken" | "generic" };

export type ChapterCreated =
  | { ok: true; id: string; slug: string; name: string }
  | { ok: false; error: "slugTaken" | "generic" };

const chapterId = z.string().min(1).max(64);

const failed = (
  error: unknown,
): { ok: false; error: "slugTaken" | "generic" } =>
  (error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002") ||
  (error instanceof Error && error.message.includes("Slug already taken"))
    ? { ok: false, error: "slugTaken" }
    : { ok: false, error: "generic" };

export async function createChapterAction(
  input: z.input<typeof chapterInput>,
): Promise<ChapterCreated> {
  const parsed = chapterInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  // Which country the chapter lands in decides who may create it, so the
  // payload is parsed before the guard reads `countryId` off it.
  const session = await requireCountryAdmin(parsed.data.countryId);

  try {
    const chapter = await createChapter({
      input: parsed.data,
      actorUserId: session.user.id,
    });
    revalidatePath("/admin", "layout");
    return { ok: true, id: chapter.id, slug: chapter.slug, name: chapter.name };
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
  const session = await requireCountryAdminOfChapter(parsedId.data);

  try {
    await updateChapter({
      chapterId: parsedId.data,
      input: parsed.data,
      actorUserId: session.user.id,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function deleteChapterAction(
  id: string,
): Promise<ChapterActionResult> {
  const parsedId = chapterId.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "generic" };
  const session = await requireCountryAdminOfChapter(parsedId.data);

  try {
    await deleteChapter({
      chapterId: parsedId.data,
      actorUserId: session.user.id,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/* -------------------------------------------------------------------------- */
/* Live helpers behind the create drawer and the detail page                   */
/* -------------------------------------------------------------------------- */

const SLUG_LIMIT = { max: 60, windowMs: 60_000 };
const SEARCH_LIMIT = { max: 60, windowMs: 60_000 };
const RESOLVE_LIMIT = { max: 30, windowMs: 60_000 };

export async function checkSlugAction(
  slug: string,
): Promise<{ available: boolean }> {
  const { session } = await requireAdminScope();
  const parsed = z.string().trim().max(60).safeParse(slug);
  if (!parsed.success) return { available: false };
  if (!withinRateLimit(`slug:${session.user.id}`, SLUG_LIMIT))
    return { available: false };
  return { available: await chapters.isSlugAvailable(parsed.data) };
}

const searchInput = z.object({
  query: z.string().trim().min(3).max(120),
  sessionToken: z.string().uuid(),
  language: z.string().max(8).optional(),
});

/** Care homes are points of interest, so the search asks for those too. */
export async function suggestChapterPlaces(
  input: unknown,
): Promise<PlaceSuggestion[]> {
  const { session } = await requireAdminScope();
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return [];
  if (!withinRateLimit(`places:${session.user.id}`, SEARCH_LIMIT)) return [];
  return suggestPlaces(parsed.data.query, parsed.data.sessionToken, {
    language: parsed.data.language,
    types: "address,street,place,poi",
  });
}

const resolveInput = z.object({
  mapboxId: z.string().min(1).max(200),
  sessionToken: z.string().uuid(),
});

export async function resolveChapterPlace(
  input: unknown,
): Promise<ResolvedPlace | null> {
  const { session } = await requireAdminScope();
  const parsed = resolveInput.safeParse(input);
  if (!parsed.success) return null;
  if (!withinRateLimit(`resolve:${session.user.id}`, RESOLVE_LIMIT))
    return null;
  return retrievePlace(parsed.data.mapboxId, parsed.data.sessionToken);
}

const reverseInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  language: z.string().max(8).optional(),
});

export async function reverseChapterPlace(
  input: unknown,
): Promise<ResolvedPlace | null> {
  const { session } = await requireAdminScope();
  const parsed = reverseInput.safeParse(input);
  if (!parsed.success) return null;
  if (!withinRateLimit(`reverse:${session.user.id}`, RESOLVE_LIMIT))
    return null;
  const { lat, lng, language } = parsed.data;
  return reversePlace({ lat, lng }, { language });
}
