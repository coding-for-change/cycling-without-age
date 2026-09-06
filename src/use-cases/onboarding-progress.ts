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
  /** The preset after validation — a chapter that exists, a role we recognise. */
  preset: { chapterId: string | null; role: OnboardingRole | null };
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

  // A pilot is the account holder, so their details sit on the account. A rider's
  // sit on their own Passenger row — the account may never ride at all.
  const profiled =
    account?.managesOthers === true ||
    (role === "pilot"
      ? account?.birthDate != null
      : (account?._count.passengers ?? 0) > 0);

  return {
    preset,
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

/**
 * `next` is the destination someone was heading for before they were asked to
 * sign in (parked in a cookie by `proxy.ts`). It is spent only once there is
 * nothing left to do — an unfinished wizard always wins, or the person would
 * land on a page their account is not ready for.
 */
export async function resolveDestination(
  session: { user: { id: string }; access: Access },
  preset: JoinPreset,
  next: string | null = null,
): Promise<string> {
  // An admin has no onboarding to do — asking a chapter admin whether they would
  // like to be a passenger or a pilot is a question a flow should never ask.
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
