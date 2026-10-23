import { recordEventInput } from "./schemas";
import type { RecordEventInput } from "./schemas";
import {
  findEventsOfChapter,
  findEventsOfChapters,
  findEventsOfPassenger,
  findEventsOfUser,
  insertEvent,
  insertEvents,
} from "./events";

export type ActivityEvent = Awaited<
  ReturnType<typeof findEventsOfUser>
>[number];

const rowOf = (input: RecordEventInput) => {
  const { userId, type, actorUserId, chapterId, passengerId, payload } =
    recordEventInput.parse(input);
  return {
    userId,
    type,
    actorUserId: actorUserId ?? null,
    chapterId: chapterId ?? null,
    passengerId: passengerId ?? null,
    payload,
  };
};

export const record = (input: RecordEventInput) => insertEvent(rowOf(input));

/** Several lines about one happening, written together or not at all. */
export const recordMany = (inputs: RecordEventInput[]) =>
  insertEvents(inputs.map(rowOf));

export const listForUser = (
  userId: string,
  {
    chapterIds,
    includeGlobal = false,
    take,
  }: { chapterIds: string[]; includeGlobal?: boolean; take: number },
) => findEventsOfUser(userId, chapterIds, includeGlobal, take);

export const listForChapter = (chapterId: string, take: number) =>
  findEventsOfChapter(chapterId, take);

export const listForChapters = async (chapterIds: string[], take: number) =>
  chapterIds.length ? findEventsOfChapters(chapterIds, take) : [];

/** The history of a rider without an account of their own. */
export const listForPassenger = (passengerId: string, take: number) =>
  findEventsOfPassenger(passengerId, take);
