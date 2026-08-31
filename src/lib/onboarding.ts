export type OnboardingRole = "passenger" | "pilot";

export type OnboardingStep =
  "role" | "location" | "consent" | "profile" | "passkey" | "pilotNextSteps";

export type OnboardingProgress = {
  role: OnboardingRole | null;
  /** A membership exists, or a QR preset supplies both chapter and role. */
  joined: boolean;
  consented: boolean;
  profiled: boolean;
  passkeyHandled: boolean;
  nextStepsSeen: boolean;
};

/** Canonical order. The pilot closer only belongs to a pilot's run. */
const ORDER: OnboardingStep[] = [
  "role",
  "location",
  "consent",
  "profile",
  "passkey",
  "pilotNextSteps",
];

export const STEP_PATH: Record<OnboardingStep, string> = {
  role: "/sign-in/role",
  location: "/location",
  consent: "/onboarding/consent",
  profile: "/onboarding/profile",
  passkey: "/onboarding/passkey",
  pilotNextSteps: "/onboarding/pilot",
};

export function onboardingSteps(
  progress: OnboardingProgress,
): OnboardingStep[] {
  const steps: OnboardingStep[] = [];
  if (!progress.role) steps.push("role");
  if (!progress.joined) steps.push("location");
  if (!progress.consented) steps.push("consent");
  if (!progress.profiled) steps.push("profile");
  if (!progress.passkeyHandled) steps.push("passkey");
  if (progress.role === "pilot" && !progress.nextStepsSeen)
    steps.push("pilotNextSteps");
  return steps;
}

export function canViewStep(
  progress: OnboardingProgress,
  step: OnboardingStep,
): boolean {
  if (step === "pilotNextSteps" && progress.role !== "pilot") return false;

  const next = nextOnboardingStep(progress);
  // Nothing left to do: every screen behind them is theirs to revisit.
  if (!next) return true;
  return ORDER.indexOf(step) <= ORDER.indexOf(next);
}

/** The screen to show now, or `null` when onboarding is finished. */
export function nextOnboardingStep(
  progress: OnboardingProgress,
): OnboardingStep | null {
  return onboardingSteps(progress)[0] ?? null;
}

export function stepProgress(
  {
    role,
    presetRole,
    presetChapter,
  }: {
    role: OnboardingRole | null;
    presetRole: boolean;
    presetChapter: boolean;
  },
  current: OnboardingStep,
): { index: number; total: number } | null {
  const run: OnboardingStep[] = [
    ...(presetRole ? [] : (["role"] as const)),
    ...(presetRole && presetChapter ? [] : (["location"] as const)),
    "consent",
    "profile",
    "passkey",
    ...(role === "pilot" ? (["pilotNextSteps"] as const) : []),
  ];
  const index = run.indexOf(current);
  return index === -1 ? null : { index, total: run.length };
}
