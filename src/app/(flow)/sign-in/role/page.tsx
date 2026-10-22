import { Suspense } from "react";
import { getDictionary, getLocale } from "@/lib/i18n";
import { readJoinPreset } from "@/lib/join-preset";
import { stepProgress } from "@/lib/onboarding";
import { RoleStep } from "../_components/role-step";
import { StepSkeleton, withStepLabel } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";

export default function RolePage() {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <Role />
      </Suspense>
    </StepTransition>
  );
}

async function Role() {
  const [dict, locale, preset] = await Promise.all([
    getDictionary(),
    getLocale(),
    readJoinPreset(),
  ]);
  const atChapter = Boolean(preset.chapterId);

  const at = stepProgress(
    { role: null, presetRole: false, presetChapter: atChapter },
    "role",
  );
  return (
    <RoleStep
      strings={dict.signIn.role}
      progress={at && withStepLabel(at, dict.common.stepProgress, locale)}
      atChapter={atChapter}
    />
  );
}
