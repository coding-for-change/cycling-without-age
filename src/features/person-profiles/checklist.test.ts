import {
  checklistSteps,
  isChecklistVisible,
  summarizeManagedRiders,
  type ChecklistInput,
} from "./checklist";
import { EMPTY_PROFILE } from "./facade";

jest.mock("./services/profiles", () => ({}));
jest.mock("@/lib/storage", () => ({}));

const base: ChecklistInput = {
  perspective: "passenger",
  profile: EMPTY_PROFILE,
  ridesThemself: true,
  managesRiders: false,
  managedRidersWithoutProfile: 0,
  hasPasskey: false,
  pushOn: false,
  pilotSteps: null,
  trainingDone: false,
  firstRideDone: false,
};

const keys = (input: ChecklistInput) =>
  checklistSteps(input).map((step) => step.key);

describe("checklistSteps", () => {
  it("asks a rider about what helps on a ride", () => {
    expect(keys(base)).toContain("accessibility");
  });

  it("does not ask a helper who never rides themself", () => {
    expect(
      keys({ ...base, ridesThemself: false, managesRiders: true }),
    ).toEqual(expect.arrayContaining(["managedRiders"]));
    expect(keys({ ...base, ridesThemself: false })).not.toContain(
      "accessibility",
    );
  });

  it("counts 'nothing special needed' as an answer", () => {
    const steps = checklistSteps({
      ...base,
      profile: { ...EMPTY_PROFILE, accessibilityNone: true },
    });
    expect(steps.find((s) => s.key === "accessibility")?.done).toBe(true);
  });

  it("gives pilots the training steps instead", () => {
    const pilot = keys({
      ...base,
      perspective: "pilot",
      pilotSteps: {
        inPersonTraining: { confirmed: false },
      },
    });
    expect(pilot).toEqual(
      expect.arrayContaining(["training", "inPersonTraining", "firstRide"]),
    );
    expect(pilot).not.toContain("accessibility");
    expect(pilot).not.toContain("trainingVideos");
  });

  it("derives the training step from the courses and keeps the chapter's confirmation", () => {
    const steps = checklistSteps({
      ...base,
      perspective: "pilot",
      trainingDone: true,
      pilotSteps: { inPersonTraining: { confirmed: true } },
    });
    expect(steps.find((s) => s.key === "training")).toEqual({
      key: "training",
      done: true,
    });
    expect(steps.find((s) => s.key === "inPersonTraining")).toEqual({
      key: "inPersonTraining",
      done: true,
      confirmed: true,
      waiting: false,
    });
  });

  it("drops the course step when training isn't required, keeping the in-person one", () => {
    const pilot = keys({
      ...base,
      perspective: "pilot",
      trainingDone: null,
      pilotSteps: { inPersonTraining: { confirmed: false } },
    });
    expect(pilot).not.toContain("training");
    expect(pilot).toEqual(
      expect.arrayContaining(["inPersonTraining", "firstRide"]),
    );
  });

  it("leaves the in-person step waiting for the chapter, never ticked by the pilot", () => {
    const steps = checklistSteps({
      ...base,
      perspective: "pilot",
      pilotSteps: { inPersonTraining: { confirmed: false } },
    });
    expect(steps.find((s) => s.key === "inPersonTraining")).toEqual({
      key: "inPersonTraining",
      done: false,
      confirmed: false,
      waiting: true,
    });
  });
});

describe("isChecklistVisible", () => {
  it("hides once dismissed", () => {
    expect(
      isChecklistVisible(checklistSteps(base), {
        ...EMPTY_PROFILE,
        setupDismissed: true,
      }),
    ).toBe(false);
  });

  it("hides once everything is done", () => {
    expect(
      isChecklistVisible([{ key: "photo", done: true }], EMPTY_PROFILE),
    ).toBe(false);
  });
});

describe("summarizeManagedRiders", () => {
  const rider = (id: string, started: boolean) => ({
    name: id,
    ref: { kind: "passenger" as const, id },
    profile: started
      ? { ...EMPTY_PROFILE, bio: "Loves the harbour." }
      : undefined,
  });

  it("names the one rider still missing a profile", () => {
    expect(
      summarizeManagedRiders([
        rider("Inge", false),
        rider("Karl", true),
        rider("Grete", true),
      ]),
    ).toEqual({
      total: 3,
      missing: 1,
      focus: { name: "Inge", ref: { kind: "passenger", id: "Inge" } },
    });
  });

  it("counts several missing profiles without naming anyone", () => {
    expect(
      summarizeManagedRiders([rider("Inge", false), rider("Karl", false)]),
    ).toEqual({ total: 2, missing: 2, focus: null });
  });

  it("keeps the only rider's name once their profile is done", () => {
    expect(summarizeManagedRiders([rider("Inge", true)]).focus?.name).toBe(
      "Inge",
    );
  });
});
