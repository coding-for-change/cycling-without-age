import {
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
