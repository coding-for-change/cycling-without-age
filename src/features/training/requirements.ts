export function pickVariant<V extends { language: string }>(
  variants: readonly V[],
  preferences: readonly (string | null | undefined)[],
): V | null {
  for (const language of preferences) {
    if (!language) continue;
    const exact = variants.find((variant) => variant.language === language);
    if (exact) return exact;
    const base = language.split("-")[0];
    const loose = variants.find(
      (variant) => variant.language.split("-")[0] === base,
    );
    if (loose) return loose;
  }
  return variants[0] ?? null;
}

export const BLANKET_EXEMPTION = "all";

export type RequirementScopeName = "global" | "country" | "chapter";

export type RequirementSource = {
  familyId: string;
  scope: RequirementScopeName;
  countryId: string | null;
  chapterId: string | null;
};

const SCOPE_ORDER: Record<RequirementScopeName, number> = {
  global: 0,
  country: 1,
  chapter: 2,
};

export const requirementApplies = (
  requirement: RequirementSource,
  chapter: { chapterId: string; countryId: string | null },
) =>
  requirement.scope === "global" ||
  (requirement.scope === "country" &&
    chapter.countryId !== null &&
    requirement.countryId === chapter.countryId) ||
  (requirement.scope === "chapter" &&
    requirement.chapterId === chapter.chapterId);

export function effectiveRequirements<R extends RequirementSource>(
  requirements: readonly R[],
  chapter: { chapterId: string; countryId: string | null },
): R[] {
  const byFamily = new Map<string, R>();
  for (const requirement of [...requirements]
    .filter((row) => requirementApplies(row, chapter))
    .sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope]))
    if (!byFamily.has(requirement.familyId))
      byFamily.set(requirement.familyId, requirement);
  return [...byFamily.values()];
}

export type ExemptionFact = {
  familyKey: string;
  familyId: string | null;
  reason: "experienced" | "manual" | "migration";
  grantedAt: Date;
  grantedByUserId: string | null;
  chapterId: string | null;
};

export const exemptionFor = <E extends { familyKey: string }>(
  exemptions: readonly E[],
  familyId: string,
): E | null =>
  exemptions.find((exemption) => exemption.familyKey === familyId) ??
  exemptions.find((exemption) => exemption.familyKey === BLANKET_EXEMPTION) ??
  null;

export type EnrollmentFacts = {
  startedAt: Date;
  lastActivityAt: Date;
  passedAt: Date | null;
  attemptCount: number;
};

export type VariantFacts = {
  courseId: string;
  language: string;
  totalElements: number;
  completedElements: number;
  currentElementTitle: string | null;
  enrollment: EnrollmentFacts | null;
};

export type FamilyStatusName =
  "passed" | "exempt" | "inProgress" | "notStarted";

export type FamilyStatus<E extends ExemptionFact = ExemptionFact> = {
  familyId: string;
  status: FamilyStatusName;
  percent: number;
  passedAt: Date | null;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  attempts: number;
  currentLessonTitle: string | null;
  variantCourseId: string | null;
  exemption: E | null;
};

const percentOf = (variant: VariantFacts) =>
  variant.totalElements === 0
    ? 0
    : Math.round((variant.completedElements / variant.totalElements) * 100);

const earliest = (dates: (Date | null | undefined)[]) =>
  dates
    .filter((date): date is Date => date instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

const latest = (dates: (Date | null | undefined)[]) =>
  dates
    .filter((date): date is Date => date instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

export function familyStatus<E extends ExemptionFact>(
  familyId: string,
  variants: readonly VariantFacts[],
  exemptions: readonly E[] = [],
  preferences: readonly (string | null | undefined)[] = [],
): FamilyStatus<E> | null {
  if (variants.length === 0) return null;
  const enrolled = variants.filter((variant) => variant.enrollment);
  const passed = enrolled
    .filter((variant) => variant.enrollment!.passedAt)
    .sort(
      (a, b) =>
        a.enrollment!.passedAt!.getTime() - b.enrollment!.passedAt!.getTime(),
    )[0];
  const active = [...enrolled].sort(
    (a, b) =>
      b.enrollment!.lastActivityAt.getTime() -
      a.enrollment!.lastActivityAt.getTime(),
  )[0];
  const exemption = exemptionFor(exemptions, familyId);
  const shown = passed ?? active ?? pickVariant(variants, preferences)!;
  const status: FamilyStatusName = passed
    ? "passed"
    : exemption
      ? "exempt"
      : active
        ? "inProgress"
        : "notStarted";
  return {
    familyId,
    status,
    percent: passed ? 100 : active ? percentOf(active) : 0,
    passedAt: passed?.enrollment?.passedAt ?? null,
    startedAt: earliest(
      enrolled.map((variant) => variant.enrollment?.startedAt),
    ),
    lastActivityAt: latest(
      enrolled.map((variant) => variant.enrollment?.lastActivityAt),
    ),
    attempts: enrolled.reduce(
      (sum, variant) => sum + variant.enrollment!.attemptCount,
      0,
    ),
    currentLessonTitle: passed ? null : (active?.currentElementTitle ?? null),
    variantCourseId: shown.courseId,
    exemption,
  };
}

export const isSatisfied = (status: FamilyStatusName) =>
  status === "passed" || status === "exempt";

export function readinessOf(
  families: readonly { status: FamilyStatusName }[],
  inPersonConfirmed: boolean,
) {
  const coursesDone = families.every((family) => isSatisfied(family.status));
  return { coursesDone, ready: coursesDone && inPersonConfirmed };
}
