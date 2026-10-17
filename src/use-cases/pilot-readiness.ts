import { chapters } from "@/features/chapters";
import {
  personProfiles,
  type InPersonTraining,
} from "@/features/person-profiles";
import {
  BLANKET_EXEMPTION,
  readinessOf,
  training,
  type ReadinessChapter,
  type ExemptionRow,
  type FamilyStatusName,
  type PilotFamilyStatus,
  type ReadinessFacts,
  type ReadinessGroup,
} from "@/features/training";
import { DomainError } from "@/lib/domain-error";
import { isTrainingRequired } from "@/lib/feature-flags";
import { trainingContext, type TrainingChapter } from "./training-access";

export type ReadinessExemption = {
  blanket: boolean;
  reason: ExemptionRow["reason"];
  grantedAt: Date;
  grantedByUserId: string | null;
  chapterId: string | null;
};

export type ReadinessCourse = {
  familyId: string;
  name: string;
  status: FamilyStatusName;
  percent: number;
  passedAt: Date | null;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  attempts: number;
  currentLessonTitle: string | null;
  variantCourseId: string | null;
  exemption: ReadinessExemption | null;
};

export type InPersonState = {
  confirmedAt: Date | null;
  confirmedBy: string | null;
};

export type PilotReadiness = {
  userId: string;
  chapterId: string;
  ready: boolean;
  coursesDone: boolean;
  courses: ReadinessCourse[];
  inPerson: InPersonState;
};

const exemptionView = (row: ExemptionRow | null): ReadinessExemption | null =>
  row
    ? {
        blanket: row.familyKey === BLANKET_EXEMPTION,
        reason: row.reason,
        grantedAt: row.grantedAt,
        grantedByUserId: row.grantedByUserId,
        chapterId: row.chapterId,
      }
    : null;

const courseOf = (status: PilotFamilyStatus): ReadinessCourse => ({
  familyId: status.familyId,
  name: status.title,
  status: status.status,
  percent: status.percent,
  passedAt: status.passedAt,
  startedAt: status.startedAt,
  lastActivityAt: status.lastActivityAt,
  attempts: status.attempts,
  currentLessonTitle: status.currentLessonTitle,
  variantCourseId: status.variantCourseId,
  exemption: exemptionView(status.exemption),
});

export const inPersonOf = (
  row: InPersonTraining | undefined,
): InPersonState => ({
  confirmedAt: row?.confirmedAt ?? null,
  confirmedBy: row?.confirmedByUserId ?? null,
});

export function buildReadiness(
  userId: string,
  chapterId: string,
  facts: ReadinessFacts,
  inPerson: Map<string, InPersonTraining>,
  includes: (familyId: string) => boolean = () => true,
): PilotReadiness {
  const statuses = (facts.statuses.get(chapterId)?.get(userId) ?? []).filter(
    (status) => includes(status.familyId),
  );
  const state = inPersonOf(inPerson.get(userId));
  const { ready, coursesDone } = readinessOf(
    statuses,
    state.confirmedAt !== null,
  );
  return {
    userId,
    chapterId,
    ready,
    coursesDone,
    courses: statuses.map(courseOf),
    inPerson: state,
  };
}

export async function chapterContext(
  chapterId: string,
): Promise<ReadinessChapter> {
  const countryId = await chapters.getChapterCountryId(chapterId);
  return { chapterId, countryId: countryId ?? null };
}

const readyWithoutTraining = (
  userId: string,
  chapterId: string,
): PilotReadiness => ({
  userId,
  chapterId,
  ready: true,
  coursesDone: true,
  courses: [],
  inPerson: { confirmedAt: null, confirmedBy: null },
});

const everyoneReady = (userIds: string[], chapterId: string) =>
  new Map(
    userIds.map((userId) => [userId, readyWithoutTraining(userId, chapterId)]),
  );

export async function readinessOfGroups(
  groups: ReadinessGroup[],
  options: { locale?: string | null; extraFamilyIds?: string[] } = {},
) {
  const userIds = groups.flatMap((group) => group.userIds);
  const [facts, inPerson] = await Promise.all([
    training.readinessFacts(groups, options),
    personProfiles.inPersonTrainingOf(userIds),
  ]);
  const byChapter = new Map<string, Map<string, PilotReadiness>>();
  for (const { chapter, userIds: members } of groups) {
    const required = new Set(
      (facts.requirements.get(chapter.chapterId) ?? []).map((r) => r.familyId),
    );
    const byUser = byChapter.get(chapter.chapterId) ?? new Map();
    for (const userId of members)
      byUser.set(
        userId,
        buildReadiness(userId, chapter.chapterId, facts, inPerson, (familyId) =>
          required.has(familyId),
        ),
      );
    byChapter.set(chapter.chapterId, byUser);
  }
  return { facts, inPerson, byChapter };
}

export async function readinessOfPilots(
  userIds: string[],
  chapterId: string,
  locale?: string | null,
): Promise<Map<string, PilotReadiness>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  if (!isTrainingRequired()) return everyoneReady(unique, chapterId);
  const chapter = await chapterContext(chapterId);
  const { byChapter } = await readinessOfGroups(
    [{ chapter, userIds: unique }],
    { locale },
  );
  return byChapter.get(chapterId) ?? new Map();
}

export async function readinessForChapters(
  entries: { chapterId: string; userIds: string[] }[],
  locale?: string | null,
): Promise<Map<string, Map<string, PilotReadiness>>> {
  const wanted = entries.filter((entry) => entry.userIds.length > 0);
  if (wanted.length === 0) return new Map();
  if (!isTrainingRequired())
    return new Map(
      wanted.map(({ chapterId, userIds }) => [
        chapterId,
        everyoneReady([...new Set(userIds)], chapterId),
      ]),
    );
  const countries = await chapters.getChapterCountryIds(
    wanted.map((entry) => entry.chapterId),
  );
  const groups = wanted.map(({ chapterId, userIds }) => ({
    chapter: { chapterId, countryId: countries.get(chapterId) ?? null },
    userIds: [...new Set(userIds)],
  }));
  return (await readinessOfGroups(groups, { locale })).byChapter;
}

export async function pilotReadiness(
  userId: string,
  chapterId: string,
  locale?: string | null,
): Promise<PilotReadiness> {
  const readiness = await readinessOfPilots([userId], chapterId, locale);
  return readiness.get(userId)!;
}

export async function assertPilotsReady(userIds: string[], chapterId: string) {
  if (userIds.length === 0 || !isTrainingRequired()) return;
  const readiness = await readinessOfPilots(userIds, chapterId);
  if (userIds.some((userId) => !readiness.get(userId)?.ready))
    throw new DomainError("pilotNotReady");
}

export type OwnReadiness = {
  chapters: (PilotReadiness & { status: TrainingChapter["status"] })[];
  coursesDone: boolean;
  inPerson: InPersonState;
};

export async function ownReadiness(
  userId: string,
  locale?: string | null,
): Promise<OwnReadiness> {
  const context = await trainingContext(userId);
  const { byChapter, inPerson } = await readinessOfGroups(
    context.map(({ chapterId, countryId }) => ({
      chapter: { chapterId, countryId },
      userIds: [userId],
    })),
    { locale },
  );
  const list = context.map((chapter) => ({
    ...byChapter.get(chapter.chapterId)!.get(userId)!,
    status: chapter.status,
  }));
  return {
    chapters: list,
    coursesDone: list.every((readiness) => readiness.coursesDone),
    inPerson: inPersonOf(inPerson.get(userId)),
  };
}
