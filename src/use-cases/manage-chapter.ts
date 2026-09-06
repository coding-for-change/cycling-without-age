import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { chapters } from "@/features/chapters";
import type { ChapterInput, ChapterUpdateInput } from "@/features/chapters";

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
  if (!before) throw new DomainError("unknownChapter");

  const changes = chapters.diffChapter(before, input);
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
  if (!chapter) throw new DomainError("unknownChapter");

  await chapters.deleteChapter(chapterId);
  await activity.record({
    userId: actorUserId,
    actorUserId,
    type: "chapterDeleted",
    payload: { name: chapter.name, slug: chapter.slug },
  });
}
