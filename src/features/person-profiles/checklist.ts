import type { PersonProfile, PilotStepState } from "./facade";
import type { PilotStep, SubjectRef } from "./schemas";

export type ChecklistStepKey =
  | "photo"
  | "bio"
  | "interests"
  | "prompt"
  | "accessibility"
  | "managedRiders"
  | "passkey"
  | "push"
  | PilotStep
  | "firstRide";

export type ChecklistStep = {
  key: ChecklistStepKey;
  done: boolean;
  confirmed?: boolean;
};

export type ChecklistInput = {
  perspective: "pilot" | "passenger";
  profile: PersonProfile;
  ridesThemself: boolean;
  managedRidersWithoutProfile: number;
  managesRiders: boolean;
  hasPasskey: boolean;
  pushOn: boolean;
  pilotSteps: Record<PilotStep, PilotStepState> | null;
  firstRideDone: boolean;
};

export const hasStartedProfile = (profile: PersonProfile) =>
  Boolean(profile.bio) ||
  profile.interests.length + profile.customInterests.length > 0 ||
  profile.prompts.length > 0;

export type ManagedRider = {
  name: string;
  ref: SubjectRef;
  profile: PersonProfile | undefined;
};

export type ManagedRidersSummary = {
  total: number;
  missing: number;
  focus: { name: string; ref: SubjectRef } | null;
};

export function summarizeManagedRiders(
  riders: ManagedRider[],
): ManagedRidersSummary {
  const incomplete = riders.filter(
    (rider) => !rider.profile || !hasStartedProfile(rider.profile),
  );
  const single =
    incomplete.length === 1
      ? incomplete[0]
      : incomplete.length === 0 && riders.length === 1
        ? riders[0]
        : null;
  return {
    total: riders.length,
    missing: incomplete.length,
    focus: single ? { name: single.name, ref: single.ref } : null,
  };
}

export function checklistSteps(input: ChecklistInput): ChecklistStep[] {
  const { profile } = input;
  const steps: ChecklistStep[] = [
    { key: "photo", done: profile.photoFileId !== null },
    { key: "bio", done: Boolean(profile.bio) },
    {
      key: "interests",
      done: profile.interests.length + profile.customInterests.length > 0,
    },
    { key: "prompt", done: profile.prompts.length > 0 },
  ];

  if (input.perspective === "passenger" && input.ridesThemself)
    steps.push({
      key: "accessibility",
      done: profile.accessibilityNone || profile.accessibilityTags.length > 0,
    });

  if (input.perspective === "passenger" && input.managesRiders)
    steps.push({
      key: "managedRiders",
      done: input.managedRidersWithoutProfile === 0,
    });

  if (input.perspective === "pilot" && input.pilotSteps) {
    for (const key of ["trainingVideos", "workshop"] as const)
      steps.push({
        key,
        done: input.pilotSteps[key].done,
        confirmed: input.pilotSteps[key].confirmed,
      });
    steps.push({ key: "firstRide", done: input.firstRideDone });
  }

  steps.push(
    { key: "passkey", done: input.hasPasskey },
    { key: "push", done: input.pushOn },
  );
  return steps;
}

export const isChecklistVisible = (
  steps: ChecklistStep[],
  profile: PersonProfile,
) => !profile.setupDismissed && steps.some((step) => !step.done);
