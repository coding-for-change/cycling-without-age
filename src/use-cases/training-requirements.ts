import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import {
  requirementInput,
  training,
  type CatalogueOwner,
  type ChapterContext,
  type RequirementInput,
} from "@/features/training";
import { DomainError } from "@/lib/domain-error";
import {
  buildReadiness,
  chapterContext,
  readinessOfGroups,
} from "./pilot-readiness";

async function ownerChapter(
  owner: CatalogueOwner,
): Promise<ChapterContext | null> {
  if (owner.scope !== "chapter") return null;
  const { chapterId, countryId } = await chapterContext(owner.chapterId);
  if (!countryId) throw new DomainError("unknownChapter");
  return { chapterId, countryId };
}

export async function setTrainingRequirement(
  input: RequirementInput,
  actorUserId: string,
) {
  const parsed = requirementInput.parse(input);
  return training.setRequirement(
    parsed,
    actorUserId,
    await ownerChapter(parsed.owner),
  );
}

async function chaptersUnder(owner: CatalogueOwner): Promise<ChapterContext[]> {
  if (owner.scope === "chapter") return [(await ownerChapter(owner))!];
  const rows =
    owner.scope === "country"
      ? await chapters.listChapters(owner.countryId)
      : await chapters.listChapterScopes();
  return rows.flatMap((row) =>
    row.countryId ? [{ chapterId: row.id, countryId: row.countryId }] : [],
  );
}

export async function requirementImpact(input: RequirementInput) {
  const { owner, familyId } = requirementInput.parse(input);
  await training.assertFamilyAllowed(
    familyId,
    owner,
    await ownerChapter(owner),
  );
  const contexts = await chaptersUnder(owner);
  const pilots = await membership.listPilotMembers(
    contexts.map((context) => context.chapterId),
  );
  const groups = contexts
    .map((chapter) => ({
      chapter,
      userIds: pilots
        .filter((pilot) => pilot.chapterId === chapter.chapterId)
        .map((pilot) => pilot.userId),
    }))
    .filter((group) => group.userIds.length > 0);
  if (groups.length === 0) return { pilots: 0 };

  const { facts, inPerson } = await readinessOfGroups(groups, {
    extraFamilyIds: [familyId],
  });
  const affected = new Set<string>();
  for (const { chapter, userIds } of groups) {
    const required = new Set(
      (facts.requirements.get(chapter.chapterId) ?? []).map((r) => r.familyId),
    );
    if (required.has(familyId)) continue;
    for (const userId of userIds) {
      const before = buildReadiness(
        userId,
        chapter.chapterId,
        facts,
        inPerson,
        (id) => required.has(id),
      );
      const after = buildReadiness(
        userId,
        chapter.chapterId,
        facts,
        inPerson,
        (id) => required.has(id) || id === familyId,
      );
      if (before.ready && !after.ready) affected.add(userId);
    }
  }
  return { pilots: affected.size };
}
