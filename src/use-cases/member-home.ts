import { cache } from "react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";

/**
 * Everything the member home needs about where this person belongs: the chapters
 * they are in, the ones they have asked to join, and the chapter records behind
 * both. Two facades, so it is a use case rather than work an Action could do.
 *
 * `cache` because the sidebar subtitle and the home's chapter cards ask the same
 * question in the same request, each inside its own Suspense boundary.
 */
export const getMemberHome = cache(async (userId: string) => {
  const [memberships, applications] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    membership.listApplicationsOfUser(userId),
  ]);

  const chapterIds = [
    ...new Set([
      ...memberships.map((m) => m.chapterId),
      ...applications.map((a) => a.chapterId),
    ]),
  ];

  const rows = await Promise.all(
    chapterIds.map((id) => chapters.getChapter(id)),
  );

  return {
    memberships,
    applications,
    // A chapter deleted while an application was open leaves a dangling id.
    chapters: rows.filter((chapter) => chapter !== null),
  };
});

export type MemberHome = Awaited<ReturnType<typeof getMemberHome>>;
