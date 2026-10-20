import { chapters } from "@/features/chapters";
import { personProfiles } from "@/features/person-profiles";
import {
  exemptionInput,
  training,
  type ChapterContext,
  type ExemptionInput,
} from "@/features/training";
import { activity } from "@/lib/activity";
import { allowsAdmin, type AdminAuthority } from "@/lib/access";
import { requireAdminOf, requireAdminScope } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { trainingChapterIdsOf } from "./training-access";

export const isPilotOrApplicant = async (userId: string) =>
  (await trainingChapterIdsOf(userId)).length > 0;

const NO_ONE: AdminAuthority = { chapters: [], countryIds: [] };

const authorityOf = (chapter: ChapterContext): AdminAuthority => ({
  chapters: [chapter],
  countryIds: [],
});

async function requireTrainingAdminOf(pilotUserId: string, chapterId?: string) {
  await requireAdminScope();
  const trainingIds = await trainingChapterIdsOf(pilotUserId);
  const candidates = chapterId
    ? trainingIds.filter((id) => id === chapterId)
    : trainingIds;
  if (candidates.length === 0) {
    await requireAdminOf(NO_ONE);
    throw new DomainError("notMember");
  }
  const countries = await chapters.getChapterCountryIds(candidates);
  const contexts = candidates.map((id) => ({
    chapterId: id,
    countryId: countries.get(id) ?? "",
  }));
  const session = await requireAdminOf({ chapters: contexts, countryIds: [] });
  const chapter = contexts.find((context) =>
    allowsAdmin(session.access, authorityOf(context)),
  )!;
  return { session, chapter };
}

export async function confirmInPersonTraining(
  pilotUserId: string,
  chapterId?: string,
) {
  const { session, chapter } = await requireTrainingAdminOf(
    pilotUserId,
    chapterId,
  );
  await personProfiles.confirmPilotStep(
    pilotUserId,
    "inPersonTraining",
    session.user.id,
  );
  await activity.record({
    userId: pilotUserId,
    actorUserId: session.user.id,
    chapterId: chapter.chapterId,
    type: "inPersonTrainingConfirmed",
  });
}

export async function revokeInPersonTraining(
  pilotUserId: string,
  chapterId?: string,
) {
  await requireTrainingAdminOf(pilotUserId, chapterId);
  await personProfiles.revokePilotStep(pilotUserId, "inPersonTraining");
}

export async function grantTrainingExemption(input: ExemptionInput) {
  const { userId, chapterId, familyId } = exemptionInput.parse(input);
  const { session, chapter } = await requireTrainingAdminOf(userId, chapterId);
  return training.grantExemption(
    { userId, familyId, reason: "manual" },
    {
      grantedByUserId: session.user.id,
      chapterId: chapter.chapterId,
      visibleTo: chapter,
    },
  );
}

export async function revokeTrainingExemption(input: ExemptionInput) {
  const { userId, chapterId, familyId } = exemptionInput.parse(input);
  const { session, chapter } = await requireTrainingAdminOf(userId, chapterId);
  return training.revokeExemption(
    { userId, familyId },
    { actorUserId: session.user.id, chapterId: chapter.chapterId },
  );
}
