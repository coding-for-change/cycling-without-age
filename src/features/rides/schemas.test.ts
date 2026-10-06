import {
  modelLimits,
  rescheduleInput,
  rideDetailsPatch,
  rideInput,
  returnWindow,
  scheduleRideForm,
  slotOf,
  slotWindow,
  wallSlot,
} from "@/features/rides/schemas";

const BERLIN = "Europe/Berlin";

describe("wall-clock slots", () => {
  // 25 October 2026 is the night Berlin falls back from CEST to CET.
  it("reads a start after the clocks went back in winter time", () => {
    expect(
      slotWindow(
        { date: "2026-10-25", start: "10:00", durationMinutes: 120 },
        BERLIN,
      ),
    ).toEqual({
      startsAt: new Date("2026-10-25T09:00:00Z"),
      endsAt: new Date("2026-10-25T11:00:00Z"),
    });
  });

  it("gives back the slot it was made from", () => {
    const slot = { date: "2026-03-29", start: "14:15", durationMinutes: 45 };
    expect(slotOf(slotWindow(slot, BERLIN), BERLIN)).toEqual(slot);
  });

  it("refuses a date that does not exist", () => {
    expect(
      wallSlot.safeParse({
        date: "2026-02-31",
        start: "10:00",
        durationMinutes: 60,
      }).success,
    ).toBe(false);
  });

  it("refuses a time that does not exist", () => {
    expect(
      wallSlot.safeParse({
        date: "2026-02-03",
        start: "24:00",
        durationMinutes: 60,
      }).success,
    ).toBe(false);
  });

  it("starts the way back after the stay and keeps its length", () => {
    expect(
      returnWindow(
        {
          startsAt: new Date("2026-10-27T08:00:00Z"),
          endsAt: new Date("2026-10-27T08:40:00Z"),
        },
        90,
      ),
    ).toEqual({
      startsAt: new Date("2026-10-27T10:10:00Z"),
      endsAt: new Date("2026-10-27T10:50:00Z"),
    });
  });
});

it("asks for at least one pilot", () => {
  expect(
    scheduleRideForm.safeParse({
      chapterId: "chapter-1",
      model: "event",
      slot: { date: "2026-10-27", start: "10:00", durationMinutes: 60 },
      requiredPilots: 0,
    }).success,
  ).toBe(false);
});

const form = (overrides: Record<string, unknown> = {}) => ({
  chapterId: "chapter-1",
  model: "event",
  title: "Sommerfest",
  capacity: 4,
  slot: { date: "2026-10-27", start: "10:00", durationMinutes: 60 },
  ...overrides,
});

const issuesOf = (input: unknown) => {
  const result = scheduleRideForm.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
};

describe("model rules", () => {
  it("accepts an event with a title and a capacity", () => {
    expect(issuesOf(form())).toEqual([]);
  });

  it("asks an event for a title and a capacity", () => {
    expect(issuesOf(form({ title: " ", capacity: null }))).toEqual([
      "titleRequired",
      "capacityRequired",
    ]);
  });

  it("holds an event to its capacity and its pilots needed", () => {
    expect(
      issuesOf(
        form({
          capacity: 1,
          passengerIds: ["p-1", "p-2"],
          pilotIds: ["u-1", "u-2"],
        }),
      ),
    ).toEqual(["capacityBelowRoster", "tooManyPilots"]);
  });

  it("holds a pleasure ride to two passengers, one trishaw and one pilot", () => {
    expect(
      issuesOf(
        form({
          model: "pleasure",
          passengerIds: ["p-1", "p-2", "p-3"],
          trishawIds: ["t-1", "t-2"],
          requiredPilots: 2,
          pilotIds: ["u-1", "u-2"],
        }),
      ),
    ).toEqual([
      "pleasureLimit",
      "pleasureLimit",
      "pleasureLimit",
      "pleasureLimit",
    ]);
  });

  it("lets a pleasure ride do without a title", () => {
    expect(
      issuesOf(
        form({
          model: "pleasure",
          title: null,
          capacity: null,
          passengerIds: ["p-1", "p-2"],
          trishawIds: ["t-1"],
          pilotIds: ["u-1"],
        }),
      ),
    ).toEqual([]);
  });

  it("asks a functional ride where it goes and takes two passengers", () => {
    expect(
      issuesOf(form({ model: "functional", passengerIds: ["a", "b", "c"] })),
    ).toEqual(["destinationRequired", "capacityBelowRoster"]);
    expect(
      issuesOf(form({ model: "functional", destinationName: "Dr. Weber" })),
    ).toEqual([]);
  });

  it("keeps photos to events, six at most, each once", () => {
    expect(
      issuesOf(form({ model: "pleasure", photoFileIds: ["f-1"] })),
    ).toEqual(["photosEventOnly"]);
    expect(
      scheduleRideForm.safeParse(
        form({ photoFileIds: ["1", "2", "3", "4", "5", "6", "7"] }),
      ).success,
    ).toBe(false);
    expect(
      scheduleRideForm.safeParse(form({ photoFileIds: ["1", "1"] })).success,
    ).toBe(false);
  });

  it("applies the same rules where the facade parses a ride", () => {
    expect(
      rideInput.safeParse({
        chapterId: "chapter-1",
        model: "pleasure",
        startsAt: "2026-10-27T10:00:00Z",
        endsAt: "2026-10-27T11:00:00Z",
        passengerIds: ["p-1", "p-2", "p-3"],
      }).success,
    ).toBe(false);
  });
});

describe("modelLimits", () => {
  it("is fixed for pleasure, two riders for functional and the capacity for events", () => {
    expect(modelLimits("pleasure", 40, 3)).toEqual({
      passengers: 2,
      trishaws: 1,
      pilots: 1,
    });
    expect(modelLimits("functional", 40, 3)).toEqual({
      passengers: 2,
      trishaws: null,
      pilots: 3,
    });
    expect(modelLimits("event", 40, 3)).toEqual({
      passengers: 40,
      trishaws: null,
      pilots: 3,
    });
    expect(modelLimits("event", null).passengers).toBeNull();
  });
});

describe("rescheduleInput", () => {
  it("takes a wall-clock slot or the start and end of a drag", () => {
    expect(
      rescheduleInput.safeParse({
        date: "2026-10-27",
        start: "10:00",
        durationMinutes: 90,
      }).success,
    ).toBe(true);
    expect(
      rescheduleInput.safeParse({
        startsAt: "2026-10-27T10:00:00Z",
        endsAt: "2026-10-27T11:30:00Z",
      }).success,
    ).toBe(true);
    expect(
      rescheduleInput.safeParse({
        startsAt: "2026-10-27T10:00:00Z",
        endsAt: "2026-10-27T10:05:00Z",
      }).success,
    ).toBe(false);
  });
});

it("edits title, description and capacity within bounds", () => {
  expect(
    rideDetailsPatch.safeParse({
      title: "Sommerfest",
      description: "**Kuchen**",
      capacity: 12,
    }).success,
  ).toBe(true);
  expect(rideDetailsPatch.safeParse({ title: "x".repeat(121) }).success).toBe(
    false,
  );
  expect(rideDetailsPatch.safeParse({ capacity: 101 }).success).toBe(false);
  expect(rideDetailsPatch.safeParse({ capacity: 0 }).success).toBe(false);
});

it("turns a ride into an event with its title and capacity in one patch", () => {
  expect(
    rideDetailsPatch.parse({
      model: "event",
      title: " Sommerfest ",
      capacity: 8,
    }),
  ).toEqual({ model: "event", title: "Sommerfest", capacity: 8 });
});
