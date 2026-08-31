import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { chapters } from "@/features/chapters";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { requireAuth } from "@/lib/auth-guards";
import { readJoinPreset } from "@/lib/join-preset";
import { getDictionary } from "@/lib/i18n";
import { toIsoDateUtc } from "@/lib/format";
import {
  canViewStep,
  stepProgress,
  type OnboardingStep,
} from "@/lib/onboarding";
import {
  getOnboardingState,
  resolveDestination,
} from "@/use-cases/onboarding-progress";
import type { StepProgress } from "../../_components/step";
import { StepSkeleton } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";
import type { Dictionary } from "@/lib/i18n";
import type { OnboardingRole } from "@/lib/onboarding";

export type StepDefaults = {
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD`, which is what `<input type="date">` wants. */
  birthDate: string;
  gender: "female" | "male" | "other" | null;
  consented: boolean;
  safety: boolean;
  notifications: boolean;
};

export type StepContext = {
  role: OnboardingRole;
  progress: StepProgress | null;
  /** What they answered last time, so walking back shows their answers rather
   *  than an empty form they have to fill in again. */
  defaults: StepDefaults;
  presetChapterName: string | null;
  dict: Dictionary;
};


export function OnboardingStepPage({
  step,
  render,
}: {
  step: OnboardingStep;
  render: (context: StepContext) => ReactNode;
}) {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <Resolve
          step={step}
          render={render}
        />
      </Suspense>
    </StepTransition>
  );
}

async function Resolve({
  step,
  render,
}: {
  step: OnboardingStep;
  render: (context: StepContext) => ReactNode;
}) {
  const session = await requireAuth();
  const preset = await readJoinPreset();

  const [state, dict, account, rider] = await Promise.all([
    getOnboardingState(session.user.id, preset),
    getDictionary(),
    profile.getProfile(session.user.id),
    passengers.getOwnPassenger(session.user.id),
  ]);
  const { progress } = state;

  if (!canViewStep(progress, step)) {
    redirect(await resolveDestination(session, preset));
  }

  const presetChapterName =
    state.preset.chapterId && state.preset.role
      ? ((await chapters.getChapter(state.preset.chapterId))?.name ?? null)
      : null;


  const name = rider ?? {
    firstName: account?.name?.split(" ")[0] ?? "",
    lastName: account?.name?.split(" ").slice(1).join(" ") ?? "",
    birthDate: account?.birthDate ?? null,
    gender: account?.gender ?? null,
  };

  return render({
    role: progress.role ?? "passenger",
    presetChapterName,
    defaults: {
      firstName: name.firstName,
      lastName: name.lastName,
      birthDate: name.birthDate ? toIsoDateUtc(name.birthDate) : "",
      gender: name.gender,
      consented: account?.consentDataAt != null,
      safety: account?.consentSafetyAt != null,
      notifications: account?.notifyEmail === true,
    },
    progress: dots(dict, {
      role: progress.role,
      presetRole: Boolean(state.preset.role),
      presetChapter: Boolean(state.preset.chapterId),
      step,
    }),
    dict,
  });
}

function dots(
  dict: Dictionary,
  {
    role,
    presetRole,
    presetChapter,
    step,
  }: {
    role: OnboardingRole | null;
    presetRole: boolean;
    presetChapter: boolean;
    step: OnboardingStep;
  },
): StepProgress | null {
  const at = stepProgress({ role, presetRole, presetChapter }, step);
  return at ? { ...at, label: dict.common.stepProgress } : null;
}
