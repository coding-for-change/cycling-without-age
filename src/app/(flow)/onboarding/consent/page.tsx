import { fill } from "@/lib/utils";
import { OnboardingStepPage } from "../_components/step-page";
import { ConsentStep } from "../_components/consent-step";

export default function ConsentPage() {
  return (
    <OnboardingStepPage
      step="consent"
      render={({
        role,
        progress,
        presetChapterName,
        claimBanner,
        defaults,
        dict,
      }) => (
        <ConsentStep
          role={role}
          progress={progress}
          chapterName={presetChapterName}
          setUpBy={
            claimBanner
              ? fill(dict.consent.setUpBy, { name: claimBanner })
              : null
          }
          defaults={defaults}
          strings={dict.consent}
          continueLabel={dict.common.continue}
        />
      )}
    />
  );
}
