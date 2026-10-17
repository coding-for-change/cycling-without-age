import { accounts } from "@/features/accounts";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import {
  training,
  type ExemptionRow,
  type RequiredFamily,
} from "@/features/training";
import { allowsAdmin, type Access } from "@/lib/access";
import {
  inPersonOf,
  readinessOfGroups,
  type PilotReadiness,
  type ReadinessCourse,
} from "./pilot-readiness";
import { trainingContext, type TrainingChapter } from "./training-access";

export type ProgressPilot = {
  userId: string | null;
  chapterId: string;
  name: string | null;
  ready: boolean;
  coursesDone: boolean;
  inPersonConfirmedAt: Date | null;
};

export type ProgressRow = ReadinessCourse & {
  userId: string | null;
  chapterId: string;
  pilotName: string | null;
};

export type ProgressTable = {
  families: RequiredFamily[];
  pilots: ProgressPilot[];
  rows: ProgressRow[];
};

export async function trainingProgressTable({
  chapterIds,
  includeNames,
  locale,
}: {
  chapterIds: string[];
  includeNames: boolean;
  locale?: string | null;
}): Promise<ProgressTable> {
  const unique = [...new Set(chapterIds)];
  if (unique.length === 0) return { families: [], pilots: [], rows: [] };
  const [countries, pilots] = await Promise.all([
    chapters.getChapterCountryIds(unique),
    membership.listPilotMembers(unique),
  ]);
  const groups = unique.flatMap((chapterId) => {
    const userIds = pilots
      .filter((pilot) => pilot.chapterId === chapterId)
      .map((pilot) => pilot.userId);
    return userIds.length
      ? [
          {
            chapter: { chapterId, countryId: countries.get(chapterId) ?? null },
            userIds,
          },
        ]
      : [];
  });
  const [{ facts, byChapter }, names] = await Promise.all([
    readinessOfGroups(groups, { locale }),
    includeNames
      ? accounts.displayNames([...new Set(pilots.map((p) => p.userId))])
      : Promise.resolve({} as Record<string, string>),
  ]);
  const nameOf = (userId: string) =>
    includeNames ? (names[userId] ?? null) : null;

  const summaries: ProgressPilot[] = [];
  const rows: ProgressRow[] = [];
  for (const { chapter, userIds } of groups) {
    for (const userId of userIds) {
      const readiness = byChapter.get(chapter.chapterId)!.get(userId)!;
      const name = nameOf(userId);
      const shownId = includeNames ? userId : null;
      summaries.push({
        userId: shownId,
        chapterId: chapter.chapterId,
        name,
        ready: readiness.ready,
        coursesDone: readiness.coursesDone,
        inPersonConfirmedAt: readiness.inPerson.confirmedAt,
      });
      for (const course of readiness.courses)
        rows.push({
          ...course,
          exemption: includeNames ? course.exemption : null,
          userId: shownId,
          chapterId: chapter.chapterId,
          pilotName: name,
        });
    }
  }
  const used = new Set(rows.map((row) => row.familyId));
  return {
    families: [...facts.families.values()].filter((family) =>
      used.has(family.familyId),
    ),
    pilots: summaries,
    rows,
  };
}

export type PersonRef = { userId: string; name: string | null };

export type PanelExemption = {
  familyId: string | null;
  familyTitle: string | null;
  reason: ExemptionRow["reason"];
  grantedAt: Date;
  grantedBy: PersonRef | null;
  chapterId: string | null;
};

export type MemberTrainingPanel = {
  chapters: (PilotReadiness & { status: TrainingChapter["status"] })[];
  inPerson: {
    confirmedAt: Date | null;
    confirmedBy: PersonRef | null;
  };
  blanketExemption: PanelExemption | null;
  exemptions: PanelExemption[];
};

export async function memberTrainingPanel(
  userId: string,
  access: Access,
  locale?: string | null,
): Promise<MemberTrainingPanel | null> {
  const context = (await trainingContext(userId)).filter((chapter) =>
    allowsAdmin(access, {
      chapters: [
        { chapterId: chapter.chapterId, countryId: chapter.countryId },
      ],
      countryIds: [],
    }),
  );
  if (context.length === 0) return null;

  const { facts, byChapter, inPerson } = await readinessOfGroups(
    context.map(({ chapterId, countryId }) => ({
      chapter: { chapterId, countryId },
      userIds: [userId],
    })),
    { locale },
  );
  const exemptionRows = facts.exemptions.get(userId) ?? [];
  const state = inPersonOf(inPerson.get(userId));
  const people = [
    ...exemptionRows.map((row) => row.grantedByUserId),
    state.confirmedBy,
  ].filter((id): id is string => id !== null);
  const [names, titles] = await Promise.all([
    accounts.displayNames([...new Set(people)]),
    training.familyTitles(
      exemptionRows.flatMap((row) => (row.familyId ? [row.familyId] : [])),
      locale,
    ),
  ]);
  const ref = (id: string | null): PersonRef | null =>
    id ? { userId: id, name: names[id] ?? null } : null;

  const exemptions = exemptionRows.map((row): PanelExemption => ({
    familyId: row.familyId,
    familyTitle: row.familyId ? (titles.get(row.familyId) ?? null) : null,
    reason: row.reason,
    grantedAt: row.grantedAt,
    grantedBy: ref(row.grantedByUserId),
    chapterId: row.chapterId,
  }));

  return {
    chapters: context.map((chapter) => ({
      ...byChapter.get(chapter.chapterId)!.get(userId)!,
      status: chapter.status,
    })),
    inPerson: {
      confirmedAt: state.confirmedAt,
      confirmedBy: ref(state.confirmedBy),
    },
    blanketExemption: exemptions.find((row) => row.familyId === null) ?? null,
    exemptions,
  };
}

export type CourseProgressRow = {
  userId: string;
  chapterId: string;
  name: string | null;
  required: boolean;
  status: ReadinessCourse["status"];
  percent: number;
  currentLessonTitle: string | null;
  attempts: number;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  passedAt: Date | null;
};

export type CourseProgressCounts = Record<ReadinessCourse["status"], number>;

export type CourseProgress = {
  familyId: string;
  pilots: number;
  counts: CourseProgressCounts;
  rows: CourseProgressRow[];
};

export async function courseProgress({
  courseId,
  chapterIds,
  includeNames,
  locale,
}: {
  courseId: string;
  chapterIds: string[];
  includeNames: boolean;
  locale?: string | null;
}): Promise<CourseProgress> {
  const { familyId } = await training.courseFamilyOf(courseId);
  const counts: CourseProgressCounts = {
    passed: 0,
    exempt: 0,
    inProgress: 0,
    notStarted: 0,
  };
  const unique = [...new Set(chapterIds)];
  if (unique.length === 0) return { familyId, pilots: 0, counts, rows: [] };
  const [countries, pilots] = await Promise.all([
    chapters.getChapterCountryIds(unique),
    membership.listPilotMembers(unique),
  ]);
  const groups = unique.flatMap((chapterId) => {
    const userIds = pilots
      .filter((pilot) => pilot.chapterId === chapterId)
      .map((pilot) => pilot.userId);
    return userIds.length
      ? [
          {
            chapter: { chapterId, countryId: countries.get(chapterId) ?? null },
            userIds,
          },
        ]
      : [];
  });
  if (groups.length === 0) return { familyId, pilots: 0, counts, rows: [] };
  const [{ facts }, names] = await Promise.all([
    readinessOfGroups(groups, { locale, extraFamilyIds: [familyId] }),
    includeNames
      ? accounts.displayNames([...new Set(pilots.map((p) => p.userId))])
      : Promise.resolve({} as Record<string, string>),
  ]);

  const rows: CourseProgressRow[] = [];
  for (const { chapter, userIds } of groups) {
    const required = (facts.requirements.get(chapter.chapterId) ?? []).some(
      (requirement) => requirement.familyId === familyId,
    );
    for (const userId of userIds) {
      const status = facts.statuses
        .get(chapter.chapterId)
        ?.get(userId)
        ?.find((row) => row.familyId === familyId);
      if (!status) continue;
      counts[status.status] += 1;
      rows.push({
        userId,
        chapterId: chapter.chapterId,
        name: names[userId] ?? null,
        required,
        status: status.status,
        percent: status.percent,
        currentLessonTitle: status.currentLessonTitle,
        attempts: status.attempts,
        startedAt: status.startedAt,
        lastActivityAt: status.lastActivityAt,
        passedAt: status.passedAt,
      });
    }
  }
  return {
    familyId,
    pilots: rows.length,
    counts,
    rows: includeNames ? rows : [],
  };
}
