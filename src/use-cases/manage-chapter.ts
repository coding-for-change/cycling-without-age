import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import type { ChapterInput, ChapterUpdateInput } from "@/features/chapters";

type Chapter = NonNullable<Awaited<ReturnType<typeof chapters.getChapter>>>;

/** Latitude, longitude and the address they name are one move on the map. */
const LOCATION = ["latitude", "longitude", "address"] as const;
const VALUE_MAX = 120;

const shown = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const text = typeof value === "number" ? String(value) : String(value);
  return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX - 1)}…` : text;
};

const locationText = (row: {
  address?: string | null;
  latitude?: number;
  longitude?: number;
}) =>
  row.address ||
  (row.latitude !== undefined && row.longitude !== undefined
    ? `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`
    : "");

/**
 * One history line per field that actually changed. A whole form re-submitted
 * with one edit reads as one edit, and a save that changed nothing is silent.
 */
export function diffChapter(
  before: Chapter,
  input: ChapterUpdateInput,
): { field: string; from: string; to: string }[] {
  const changes: { field: string; from: string; to: string }[] = [];
  const moved = LOCATION.some(
    (key) => input[key] !== undefined && input[key] !== before[key],
  );
  if (moved) {
    changes.push({
      field: "location",
      from: locationText(before),
      to: locationText({
        address: input.address === undefined ? before.address : input.address,
        latitude: input.latitude ?? before.latitude,
        longitude: input.longitude ?? before.longitude,
      }),
    });
  }
  for (const [field, next] of Object.entries(input)) {
    if (next === undefined) continue;
    if ((LOCATION as readonly string[]).includes(field)) continue;
    const previous = before[field as keyof Chapter];
    if (shown(previous) === shown(next)) continue;
    changes.push({ field, from: shown(previous), to: shown(next) });
  }
  return changes;
}

export async function createChapter({
  input,
  actorUserId,
}: {
  input: ChapterInput;
  actorUserId: string;
}) {
  const chapter = await chapters.createChapter(input);
  await activity.record({
    userId: actorUserId,
    actorUserId,
    chapterId: chapter.id,
    type: "chapterCreated",
    payload: { name: chapter.name },
  });
  return chapter;
}

export async function updateChapter({
  chapterId,
  input,
  actorUserId,
}: {
  chapterId: string;
  input: ChapterUpdateInput;
  actorUserId: string;
}) {
  const before = await chapters.getChapter(chapterId);
  if (!before) throw new Error("Unknown chapter");

  const changes = diffChapter(before, input);
  const after = await chapters.updateChapter(chapterId, input);
  for (const change of changes) {
    await activity.record({
      userId: actorUserId,
      actorUserId,
      chapterId,
      type: "chapterUpdated",
      payload: change,
    });
  }
  return after;
}

/**
 * The event is global on purpose: the chapter row is gone, and a `chapterId`
 * pointing at it would cascade the line away with it.
 */
export async function deleteChapter({
  chapterId,
  actorUserId,
}: {
  chapterId: string;
  actorUserId: string;
}) {
  const chapter = await chapters.getChapter(chapterId);
  if (!chapter) throw new Error("Unknown chapter");

  await chapters.deleteChapter(chapterId);
  await activity.record({
    userId: actorUserId,
    actorUserId,
    type: "chapterDeleted",
    payload: { name: chapter.name, slug: chapter.slug },
  });
}
