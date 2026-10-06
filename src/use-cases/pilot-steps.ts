import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { personProfiles, type PilotStep } from "@/features/person-profiles";
import { requireAdminOf, requireAdminScope } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";

async function trainingChapterIdsOf(userId: string) {
  const [memberships, applications] = await Promise.all([
    membership.listMembershipsOfUser(userId),
    membership.listApplicationsOfUser(userId),
  ]);
  return [
    ...new Set([
      ...memberships
        .filter((m) => m.roles.includes("pilot"))
        .map((m) => m.chapterId),
      ...applications
        .filter((application) => application.status === "pending")
        .map((application) => application.chapterId),
    ]),
  ];
}

export const isPilotOrApplicant = async (userId: string) =>
  (await trainingChapterIdsOf(userId)).length > 0;

export async function tickPilotStep(
  userId: string,
  step: PilotStep,
  done: boolean,
) {
  if (!(await isPilotOrApplicant(userId))) throw new DomainError("notMember");
  await personProfiles.setPilotStep(userId, step, done);
}

async function requireTrainingAdminOf(pilotUserId: string) {
  await requireAdminScope();
  const chapterIds = await trainingChapterIdsOf(pilotUserId);
  if (chapterIds.length === 0) {
    await requireAdminOf({ chapters: [], countryIds: [] });
    throw new DomainError("notMember");
  }

  return requireAdminOf({
    chapters: await Promise.all(
      chapterIds.map(async (chapterId) => ({
        chapterId,
        countryId: (await chapters.getChapterCountryId(chapterId)) ?? "",
      })),
    ),
    countryIds: [],
  });
}

export async function confirmPilotStep(pilotUserId: string, step: PilotStep) {
  const session = await requireTrainingAdminOf(pilotUserId);
  await personProfiles.confirmPilotStep(pilotUserId, step, session.user.id);
}

export async function revokePilotStep(pilotUserId: string, step: PilotStep) {
  await requireTrainingAdminOf(pilotUserId);
  await personProfiles.revokePilotStep(pilotUserId, step);
}
