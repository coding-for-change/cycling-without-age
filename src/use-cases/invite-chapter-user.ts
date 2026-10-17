import { accounts } from "@/features/accounts";
import type { InviteInput } from "@/features/accounts";
import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { profile } from "@/features/profile";
import { training } from "@/features/training";
import { activity } from "@/lib/activity";
import { isTrainingRequired } from "@/lib/feature-flags";
import type { Locale } from "@/lib/i18n/locales";

export async function inviteChapterUser({
  inviterUserId,
  locale,
  input,
}: {
  inviterUserId: string;
  locale: Locale;
  input: InviteInput;
}) {
  const { chapterId, name, email, roles, skipTraining } = input;

  const { userId, created } = await accounts.provisionUser({
    name,
    contact: email,
    createdByUserId: inviterUserId,
  });

  if (created || !(await profile.getProfile(userId))?.locale) {
    await profile.setLocale(userId, locale);
  }

  await membership.inviteMember({
    userId,
    chapterId,
    actorUserId: inviterUserId,
    roles,
  });

  if (skipTraining && roles.includes("pilot") && isTrainingRequired()) {
    await training.grantExemption(
      { userId, familyId: null, reason: "experienced" },
      { grantedByUserId: inviterUserId, chapterId },
    );
    await personProfiles.confirmPilotStep(
      userId,
      "inPersonTraining",
      inviterUserId,
    );
    await activity.record({
      userId,
      actorUserId: inviterUserId,
      chapterId,
      type: "inPersonTrainingConfirmed",
    });
  }

  return { userId, created };
}
