import { recordEventInput } from "./schemas";
import type { RecordEventInput } from "./schemas";
import { findEventsOfChapter, findEventsOfUser, insertEvent } from "./events";

export type ActivityEvent = Awaited<
  ReturnType<typeof findEventsOfUser>
>[number];

export function record(input: RecordEventInput) {
  const { userId, type, actorUserId, chapterId, payload } =
    recordEventInput.parse(input);
  return insertEvent({
    userId,
    type,
    actorUserId: actorUserId ?? null,
    chapterId: chapterId ?? null,
    payload,
  });
}

export const listForUser = (
  userId: string,
  {
    chapterIds,
    includeGlobal = false,
  }: { chapterIds: string[]; includeGlobal?: boolean },
) => findEventsOfUser(userId, chapterIds, includeGlobal);

export const listForChapter = (chapterId: string) =>
  findEventsOfChapter(chapterId);
