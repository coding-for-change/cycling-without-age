import { OnboardingStepPage } from "../_components/step-page";
import { PasskeyStep } from "../_components/passkey-step";

export default function PasskeyPage() {
  return (
    <OnboardingStepPage
      step="passkey"
      render={({ progress, dict }) => (
        <PasskeyStep
          progress={progress}
          strings={dict.passkey}
        />
      )}
    />
  );
}
