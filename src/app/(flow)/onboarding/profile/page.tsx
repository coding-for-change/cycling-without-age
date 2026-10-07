import { OnboardingStepPage } from "../_components/step-page";
import { ProfileStep } from "../_components/profile-step";
import { RidersStep } from "../_components/riders-step";

export default function ProfilePage() {
  return (
    <OnboardingStepPage
      step="profile"
      render={({ role, caretaker, progress, defaults, dict, locale }) =>
        caretaker && role === "passenger" ? (
          <RidersStep
            progress={progress}
            defaults={defaults}
            strings={{ ...dict.profile, ...dict.riders }}
            continueLabel={dict.common.continue}
            locale={locale}
          />
        ) : (
          <ProfileStep
            role={role}
            progress={progress}
            defaults={defaults}
            strings={dict.profile}
            continueLabel={dict.common.continue}
          />
        )
      }
    />
  );
}
