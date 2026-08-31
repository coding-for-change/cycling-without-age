import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { ConsentInput } from "@/features/profile";
import type { OnboardingRole } from "@/lib/onboarding";

export async function acceptOnboardingConsent({
  userId,
  consent,
  preset,
}: {
  userId: string;
  consent: ConsentInput;
  /** Already validated against the real chapter list by the caller. */
  preset?: { chapterId: string; role: OnboardingRole } | null;
}) {
  await profile.recordConsent(userId, consent);

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
