import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { getHighestRole } from "@/lib/access";
import type { Access } from "@/lib/access";
import type { JoinPreset } from "@/lib/join-preset";
import {
  nextOnboardingStep,
  PASSKEY_REPROMPT_MS,
  STEP_PATH,
} from "@/lib/onboarding";
import type { OnboardingProgress, OnboardingRole } from "@/lib/onboarding";
import { HOME_BY_ROLE } from "@/lib/redirects";

export type OnboardingState = {
  progress: OnboardingProgress;
  preset: {
    chapterId: string | null;
    role: OnboardingRole | null;
    chapterName: string | null;
  };
  account: Awaited<ReturnType<typeof profile.getProfile>>;
};

export async function getOnboardingState(
  userId: string,
  cookiePreset: JoinPreset,
): Promise<OnboardingState> {
  const [account, memberships, applications, presetChapter] = await Promise.all(
    [
      profile.getProfile(userId),
      membership.listMembershipsOfUser(userId),
      membership.listApplicationsOfUser(userId),
      cookiePreset.chapterId
        ? chapters.getChapter(cookiePreset.chapterId)
        : Promise.resolve(null),
    ],
  );

  const preset = {
    chapterId: presetChapter?.id ?? null,
    role: presetChapter ? cookiePreset.role : null,
    chapterName: presetChapter?.name ?? null,
  };

  const roles = memberships.flatMap((m) => m.roles);
  const role: OnboardingRole | null = roles.includes("pilot")
    ? "pilot"
    : applications.length > 0
      ? "pilot"
      : roles.includes("passenger")
        ? "passenger"
        : preset.role;

  const joined =
    memberships.length > 0 ||
    applications.length > 0 ||
    Boolean(preset.chapterId && preset.role);

  const profiled =
    account?.managesOthers === true ||
    (role === "pilot"
      ? account?.birthDate != null
      : (account?._count.passengers ?? 0) > 0);

  return {
    preset,
    account,
    progress: {
      role,
      joined,
      consented: account?.consentDataAt != null,
      profiled,
      passkeyHandled:
        (account?._count.passkeys ?? 0) > 0 ||
        (account?.passkeyPromptedAt != null &&
          Date.now() - account.passkeyPromptedAt.getTime() <
            PASSKEY_REPROMPT_MS),
      nextStepsSeen: account?.pilotNextStepsSeenAt != null,
    },
  };
}

export async function resolveDestination(
  session: { user: { id: string }; access: Access },
  preset: JoinPreset,
  next: string | null = null,
): Promise<string> {
  const role = getHighestRole(session.access);
  if (
    role === "superadmin" ||
    role === "countryAdmin" ||
    role === "chapterAdmin"
  ) {
    return next ?? HOME_BY_ROLE[role];
  }

  const { progress } = await getOnboardingState(session.user.id, preset);
  const step = nextOnboardingStep(progress);
  if (step) return STEP_PATH[step];
  return next ?? HOME_BY_ROLE[progress.role ?? "passenger"];
}
