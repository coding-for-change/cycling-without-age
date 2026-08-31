import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { stepProgress } from "@/lib/onboarding";
import { RoleStep } from "../_components/role-step";
import { StepSkeleton } from "../../_components/step";
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
  const dict = await getDictionary();

  const at = stepProgress(
    { role: null, presetRole: false, presetChapter: false },
    "role",
  );
  return (
    <RoleStep
      strings={dict.signIn.role}
      progress={at && { ...at, label: dict.common.stepProgress }}
    />
  );
}
