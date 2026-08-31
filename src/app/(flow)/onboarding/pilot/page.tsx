import { OnboardingStepPage } from "../_components/step-page";
import { PilotNextSteps } from "../_components/pilot-next-steps";

export default function PilotNextStepsPage() {
  return (
    <OnboardingStepPage
      step="pilotNextSteps"
      render={({ progress, dict }) => (
        <PilotNextSteps
          progress={progress}
          strings={dict.pilotNextSteps}
        />
      )}
    />
  );
}
