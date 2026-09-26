import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import type { ChapterInput, ChapterUpdateInput } from "@/features/chapters";

export const defaultLocationFor = (
  chapter: Parameters<typeof fleet.createDefaultLocation>[0] & {
    careHomeName: string | null;
  },
) => ({
  id: chapter.id,
  name: chapter.careHomeName ?? chapter.name,
  address: chapter.address,
  latitude: chapter.latitude,
  longitude: chapter.longitude,
});

export async function createChapter({
  input,
  actorUserId,
}: {
  input: ChapterInput;
  actorUserId: string;
}) {
  const chapter = await chapters.createChapter(input);
  await fleet.createDefaultLocation(defaultLocationFor(chapter));
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
  if (!before) throw new DomainError("unknownChapter");

  // The zone follows the pin, so resolve it before diffing — otherwise the
  // change would be written without a history line of its own.
  const patch = chapters.withDerivedTimeZone(input);
  const changes = chapters.diffChapter(before, patch);
  const after = await chapters.updateChapter(chapterId, patch);
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

export async function deleteChapter({
  chapterId,
  actorUserId,
}: {
  chapterId: string;
  actorUserId: string;
}) {
  const chapter = await chapters.getChapter(chapterId);
  if (!chapter) throw new DomainError("unknownChapter");

  await chapters.deleteChapter(chapterId);
  await activity.record({
    userId: actorUserId,
    actorUserId,
    type: "chapterDeleted",
    payload: { name: chapter.name, slug: chapter.slug },
  });
}
