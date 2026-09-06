import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { CodeStep } from "../_components/code-step";
import { StepSkeleton } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";

export default function CodePage() {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <Code />
      </Suspense>
    </StepTransition>
  );
}

async function Code() {
  const dict = await getDictionary();
  return <CodeStep strings={dict.signIn.code} />;
}
