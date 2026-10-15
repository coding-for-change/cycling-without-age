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
        trainingVideos: { done: true, confirmed: false },
        workshop: { done: false, confirmed: false },
      },
    });
    expect(pilot).toEqual(
      expect.arrayContaining(["trainingVideos", "workshop", "firstRide"]),
    );
    expect(pilot).not.toContain("accessibility");
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
