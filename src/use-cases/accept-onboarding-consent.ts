import { legal } from "@/features/legal";
import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { profile } from "@/features/profile";
import type { OnboardingRole } from "@/lib/onboarding";

export async function acceptOnboardingConsent({
  userId,
  consent,
  preset,
}: {
  userId: string;
  consent: { safety: boolean; health?: boolean };
  /** Already validated against the real chapter list by the caller. */
  preset?: { chapterId: string; role: OnboardingRole } | null;
}) {
  await profile.recordConsent(userId, {
    safety: consent.safety,
    privacyVersion: legal.editionOf("privacy").version,
  });
  if (consent.health)
    await personProfiles.grantHealthConsent(
      { kind: "user", id: userId },
      userId,
    );

  if (!preset) return;
  if (preset.role === "passenger") {
    await membership.joinAsPassenger(userId, preset.chapterId);
    return;
  }
  // Already a pilot there — the preset is stale, not an error worth surfacing.
  const roles = await membership.getMemberRoles(userId, preset.chapterId);
  if (roles.includes("pilot")) return;
  await membership.applyAsPilot({ userId, chapterId: preset.chapterId });
}
