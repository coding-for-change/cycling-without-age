import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { ManagedRiderInput } from "@/features/passengers";
import type { PersonalDetailsInput } from "@/features/profile";
import { DomainError } from "@/lib/domain-error";
import type { Locale } from "@/lib/i18n/locales";
import type { OnboardingRole } from "@/lib/onboarding";

export async function completeOnboardingProfile({
  userId,
  role,
  details,
  locale,
}: {
  userId: string;
  role: OnboardingRole;
  details: PersonalDetailsInput;
  locale: Locale;
}) {
  const chapterId = await chapterOf(userId, role);

  await profile.setPersonalDetails(userId, details);
  if (role === "passenger" && chapterId) {
    await passengers.saveOwnPassenger({
      ...details,
      chapterId,
      managedByUserId: userId,
      userId,
    });
  }

  await profile.setLocale(userId, locale);
  await profile.completeOnboarding(userId, { chapterId, role });
}

export async function completeCaretakerOnboarding({
  userId,
  name,
  relationship,
  riders,
  locale,
}: {
  userId: string;
  name: string;
  relationship?: string;
  riders: ManagedRiderInput[];
  locale: Locale;
}) {
  const chapterId = (await membership.listMembershipsOfUser(userId)).find((m) =>
    m.roles.includes("passenger"),
  )?.chapterId;
  if (!chapterId) throw new DomainError("notChapterMember");

  await profile.updateOwnDetails(userId, { name });
  await profile.markManagesOthers(userId, relationship);
  await profile.setLocale(userId, locale);
  const managed = await passengers.listPassengersManagedBy(userId);
  if (!managed.some((passenger) => passenger.userId === null))
    await passengers.addManagedPassengers(userId, chapterId, riders);
  await profile.completeOnboarding(userId, { chapterId, role: "passenger" });
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
