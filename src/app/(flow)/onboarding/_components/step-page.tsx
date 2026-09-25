import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { readNextPath, requireAuth } from "@/lib/auth-guards";
import { hasAnyAdminScope } from "@/lib/access";
import { readJoinPreset } from "@/lib/join-preset";
import { getDictionary, getLocale } from "@/lib/i18n";
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
import { StepSkeleton, withStepLabel } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { OnboardingRole } from "@/lib/onboarding";

export type StepDefaults = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "female" | "male" | "other" | null;
  consented: boolean;
  safety: boolean;
  notifications: boolean;
};

export type StepContext = {
  role: OnboardingRole;
  progress: StepProgress | null;
  defaults: StepDefaults;
  presetChapterName: string | null;
  claimBanner: string | null;
  dict: Dictionary;
  locale: Locale;
};

export function OnboardingStepPage({
  step,
  render,
}: {
  step: OnboardingStep;
  render: (context: StepContext) => ReactNode | Promise<ReactNode>;
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
  render: (context: StepContext) => ReactNode | Promise<ReactNode>;
}) {
  const session = await requireAuth();
  const preset = await readJoinPreset();

  const [state, dict, locale, rider, claimBanner] = await Promise.all([
    getOnboardingState(session.user.id, preset),
    getDictionary(),
    getLocale(),
    passengers.getOwnPassenger(session.user.id),
    accounts.getClaimBanner(session.user.id),
  ]);
  const { progress, account } = state;

  if (!canViewStep(progress, step) && !hasAnyAdminScope(session.access)) {
    redirect(await resolveDestination(session, preset, await readNextPath()));
  }

  const presetChapterName = state.preset.role ? state.preset.chapterName : null;

  const name = rider ?? {
    firstName: account?.name?.split(" ")[0] ?? "",
    lastName: account?.name?.split(" ").slice(1).join(" ") ?? "",
    birthDate: account?.birthDate ?? null,
    gender: account?.gender ?? null,
  };

  return render({
    role: progress.role ?? "passenger",
    presetChapterName,
    claimBanner,
    defaults: {
      firstName: name.firstName,
      lastName: name.lastName,
      birthDate: name.birthDate ? toIsoDateUtc(name.birthDate) : "",
      gender: name.gender,
      consented: account?.consentDataAt != null,
      safety: account?.consentSafetyAt != null,
      notifications: account?.notifyEmail === true,
    },
    progress: dots(dict, locale, {
      role: progress.role,
      presetRole: Boolean(state.preset.role),
      presetChapter: Boolean(state.preset.chapterId),
      step,
    }),
    dict,
    locale,
  });
}

function dots(
  dict: Dictionary,
  locale: Locale,
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
  return at ? withStepLabel(at, dict.common.stepProgress, locale) : null;
}
