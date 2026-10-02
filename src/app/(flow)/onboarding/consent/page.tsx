import { formatMessage } from "@/lib/i18n/format";
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
        locale,
      }) => (
        <ConsentStep
          role={role}
          progress={progress}
          chapterName={presetChapterName}
          setUpBy={
            claimBanner
              ? formatMessage(
                  dict.consent.setUpBy,
                  { name: claimBanner },
                  locale,
                )
              : null
          }
          defaults={defaults}
          strings={dict.consent}
          continueLabel={dict.common.continue}
          locale={locale}
        />
      )}
    />
  );
}
