import { headers } from "next/headers";
import { legal } from "@/features/legal";
import { resolveLocale } from "@/lib/format";
import { editionLine } from "@/lib/legal";
import { OnboardingStepPage } from "../_components/step-page";
import { TermsStep } from "../_components/terms-step";

export default function TermsPage() {
  return (
    <OnboardingStepPage
      step="terms"
      render={async ({ termsAcceptedBefore, dict, locale }) => {
        const head = await headers();
        const { updated, first, ...strings } = dict.termsStep;
        return (
          <TermsStep
            strings={{
              ...strings,
              ...(termsAcceptedBefore ? updated : first),
              privacy: dict.consent.privacy,
              termsOfUse: dict.consent.termsOfUse,
              error: dict.consent.error,
              edition: editionLine(
                dict.legal.edition,
                legal.editionOf("terms"),
                resolveLocale(head.get("accept-language")),
                locale,
              ),
            }}
            continueLabel={dict.common.continue}
          />
        );
      }}
    />
  );
}
