import { cache } from "react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";

export const getMemberHome = cache(async (userId: string) => {
  const [memberships, applications] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    membership.listApplicationsOfUser(userId),
  ]);

  const rows = await chapters.getChapters(
    memberships.map((member) => member.chapterId),
  );
  const byId = new Map(rows.map((chapter) => [chapter.id, chapter]));

  return {
    memberships,
    applications,
    chapters: memberships.flatMap((member) => {
      const chapter = byId.get(member.chapterId);
      return chapter ? [chapter] : [];
    }),
  };
});

export type MemberHome = Awaited<ReturnType<typeof getMemberHome>>;
