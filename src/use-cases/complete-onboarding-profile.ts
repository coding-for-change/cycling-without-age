import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { PersonalDetailsInput } from "@/features/profile";
import type { Locale } from "@/lib/i18n/locales";
import type { OnboardingRole } from "@/lib/onboarding";

export async function completeOnboardingProfile({
  userId,
  role,
  details,
  locale,
  helperRelationship,
}: {
  userId: string;
  role: OnboardingRole;
  details: PersonalDetailsInput | null;
  locale: Locale;
  helperRelationship?: string;
}) {
  const chapterId = await chapterOf(userId, role);

  if (!details) {
    await profile.markManagesOthers(userId, helperRelationship);
  } else {
    await profile.setPersonalDetails(userId, details);
    if (role === "passenger" && chapterId) {
      await passengers.saveOwnPassenger({
        ...details,
        chapterId,
        managedByUserId: userId,
        userId,
      });
    }
  }

  await profile.setLocale(userId, locale);
  await profile.completeOnboarding(userId, { chapterId, role });
}

async function chapterOf(userId: string, role: OnboardingRole) {
  if (role === "passenger") {
    const joined = await membership.listMembershipsOfUser(userId);
    return (
      joined.find((m) => m.roles.includes("passenger"))?.chapterId ??
      joined[0]?.chapterId ??
      null
    );
  }
  const applied = await membership.listApplicationsOfUser(userId);
  return applied[0]?.chapterId ?? null;
}
