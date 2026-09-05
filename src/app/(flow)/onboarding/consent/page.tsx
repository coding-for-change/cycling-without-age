import { OnboardingStepPage } from "../_components/step-page";
import { ConsentStep } from "../_components/consent-step";

export default function ConsentPage() {
  return (
    <OnboardingStepPage
      step="consent"
      render={({ role, progress, presetChapterName, defaults, dict }) => (
        <ConsentStep
          role={role}
          progress={progress}
          chapterName={presetChapterName}
          defaults={defaults}
          strings={dict.consent}
          continueLabel={dict.common.continue}
        />
      )}
    />
  );
}
