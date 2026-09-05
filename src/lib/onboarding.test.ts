import {
  canViewStep,
  nextOnboardingStep,
  onboardingSteps,
  STEP_PATH,
  stepProgress,
  type OnboardingProgress,
} from "./onboarding";

const fresh: OnboardingProgress = {
  role: null,
  joined: false,
  consented: false,
  profiled: false,
  passkeyHandled: false,
  nextStepsSeen: false,
};

const done: OnboardingProgress = {
  role: "passenger",
  joined: true,
  consented: true,
  profiled: true,
  passkeyHandled: true,
  nextStepsSeen: true,
};

describe("onboardingSteps", () => {
  it("walks a fresh passenger through every screen but the pilot closer", () => {
    expect(onboardingSteps({ ...fresh, role: "passenger" })).toEqual([
      "location",
      "consent",
      "profile",
      "passkey",
    ]);
  });

  it("adds the closing screen for a pilot only", () => {
    expect(onboardingSteps({ ...fresh, role: "pilot" })).toContain(
      "pilotNextSteps",
    );
    expect(onboardingSteps({ ...fresh, role: "passenger" })).not.toContain(
      "pilotNextSteps",
    );
  });

  it("drops role and location when a QR preset answered them", () => {
    expect(
      onboardingSteps({ ...fresh, role: "passenger", joined: true }),
    ).toEqual(["consent", "profile", "passkey"]);
  });

  it("is empty once everything is done", () => {
    expect(onboardingSteps(done)).toEqual([]);
    expect(nextOnboardingStep(done)).toBeNull();
  });
});

describe("nextOnboardingStep", () => {
  it("sends a brand-new account to the role question", () => {
    expect(STEP_PATH[nextOnboardingStep(fresh)!]).toBe("/sign-in/role");
  });

  it("resumes mid-flow rather than restarting", () => {
    const resumed = { ...done, profiled: false, passkeyHandled: false };
    expect(STEP_PATH[nextOnboardingStep(resumed)!]).toBe("/onboarding/profile");
  });

  it("leaves a pilot on the closing screen until they have read it", () => {
    const pilot = { ...done, role: "pilot" as const, nextStepsSeen: false };
    expect(nextOnboardingStep(pilot)).toBe("pilotNextSteps");
  });
});

describe("stepProgress", () => {
  const noPreset = { presetRole: false, presetChapter: false };

  it("keeps the total steady as a passenger walks forward", () => {
    const totals = (
      ["role", "location", "consent", "profile", "passkey"] as const
    ).map(
      (step) => stepProgress({ ...noPreset, role: "passenger" }, step)?.total,
    );
    expect(totals).toEqual([5, 5, 5, 5, 5]);
  });

  it("numbers the steps in order", () => {
    expect(stepProgress({ ...noPreset, role: "passenger" }, "consent")).toEqual(
      {
        index: 2,
        total: 5,
      },
    );
  });

  it("shrinks the run when a QR preset both answers", () => {
    expect(
      stepProgress(
        { role: "passenger", presetRole: true, presetChapter: true },
        "consent",
      ),
    ).toEqual({ index: 0, total: 3 });
  });

  it("keeps the location step when only the role was preset", () => {
    expect(
      stepProgress(
        { role: "pilot", presetRole: true, presetChapter: false },
        "location",
      ),
    ).toEqual({ index: 0, total: 5 });
  });

  it("has no dots for a step that is not in this person's run", () => {
    expect(
      stepProgress({ ...noPreset, role: "passenger" }, "pilotNextSteps"),
    ).toBeNull();
  });
});

describe("canViewStep", () => {
  const midway: OnboardingProgress = {
    role: "passenger",
    joined: true,
    consented: true,
    profiled: false,
    passkeyHandled: false,
    nextStepsSeen: false,
  };

  it("lets someone back into a step they already answered", () => {
    expect(canViewStep(midway, "location")).toBe(true);
    expect(canViewStep(midway, "consent")).toBe(true);
  });

  it("allows the step they are actually on", () => {
    expect(canViewStep(midway, "profile")).toBe(true);
  });

  it("refuses a step they have not earned yet", () => {
    expect(canViewStep(midway, "passkey")).toBe(false);
  });

  it("never shows a passenger the pilot closer", () => {
    expect(canViewStep(midway, "pilotNextSteps")).toBe(false);
    expect(canViewStep({ ...midway, role: "pilot" }, "pilotNextSteps")).toBe(
      false,
    );
  });

  it("opens every earlier screen once onboarding is finished", () => {
    expect(canViewStep(done, "consent")).toBe(true);
    expect(canViewStep(done, "profile")).toBe(true);
    expect(canViewStep(done, "passkey")).toBe(true);
  });
});
