type Course = { familyId: string };
type Exemption = { familyId: string | null };

export function panelCourses<C extends Course>(
  chapters: { courses: C[] }[],
): C[] {
  const seen = new Map<string, C>();
  for (const chapter of chapters)
    for (const course of chapter.courses)
      if (!seen.has(course.familyId)) seen.set(course.familyId, course);
  return [...seen.values()];
}

export const familyExemption = <E extends Exemption>(
  exemptions: E[],
  familyId: string,
) => exemptions.find((row) => row.familyId === familyId) ?? null;

export type CourseAction = "exempt" | "revoke" | "covered" | null;

export function courseAction(
  status: "passed" | "exempt" | "inProgress" | "notStarted",
  hasFamilyExemption: boolean,
  blanket: boolean,
): CourseAction {
  if (hasFamilyExemption) return "revoke";
  if (status === "passed") return null;
  return blanket ? "covered" : "exempt";
}
