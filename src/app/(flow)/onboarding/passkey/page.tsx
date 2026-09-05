import { safeNextPath } from "@/lib/redirects";
import { OnboardingStepPage } from "../_components/step-page";
import { PasskeyStep } from "../_components/passkey-step";

type Params = Promise<{ required?: string; next?: string }>;

export default function PasskeyPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  return (
    <OnboardingStepPage
      step="passkey"
      render={async ({ progress, dict }) => {
        const params = await searchParams;
        const requiredNext =
          params.required === "1"
            ? (safeNextPath(params.next) ?? "/admin")
            : null;
        const { admin, ...strings } = dict.passkey;
        return (
          <PasskeyStep
            progress={requiredNext ? null : progress}
            strings={requiredNext ? { ...strings, ...admin } : strings}
            requiredNext={requiredNext}
          />
        );
      }}
    />
  );
}
