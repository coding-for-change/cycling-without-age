import { OnboardingStepPage } from "../_components/step-page";
import { ProfileStep } from "../_components/profile-step";

export default function ProfilePage() {
  return (
    <OnboardingStepPage
      step="profile"
      render={({ role, progress, defaults, dict }) => (
        <ProfileStep
          role={role}
          progress={progress}
          defaults={defaults}
          strings={dict.profile}
          continueLabel={dict.common.continue}
        />
      )}
    />
  );
}
