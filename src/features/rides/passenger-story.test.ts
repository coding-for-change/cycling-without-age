import { storyForPassengers, type StoryLogEntry } from "./passenger-story";

const MINE = ["p-anna"];
const VIEWER = "user-manager";
const at = new Date("2026-10-13T10:00:00Z");

const entry = (
  type: StoryLogEntry["type"],
  payload: Record<string, unknown> | null,
  actorId: string | null = "user-admin",
): StoryLogEntry => ({
  id: `${type}-${actorId}`,
  type,
  payload,
  createdAt: at,
  actor: actorId ? { id: actorId, name: "Petra Huber" } : null,
});

it("credits the chapter, not the admin, for what an admin did", () => {
  const [scheduled] = storyForPassengers(
    [entry("scheduled", { startsAt: "a", endsAt: "b", trishawIds: ["t-1"] })],
    MINE,
    VIEWER,
  );
  expect(scheduled).toEqual({
    id: "scheduled-user-admin",
    createdAt: at,
    type: "scheduled",
    by: "chapter",
    returnLeg: false,
  });
  expect(JSON.stringify(scheduled)).not.toContain("Petra");
});

it("says 'you' when the viewer did it themselves", () => {
  const [booked] = storyForPassengers(
    [
      entry(
        "riderBooked",
        { passengerId: "p-anna", name: "Anna Bauer" },
        VIEWER,
      ),
    ],
    MINE,
    VIEWER,
  );
  expect(booked).toMatchObject({
    type: "riderBooked",
    by: "you",
    rider: "Anna Bauer",
  });
});

it("keeps other riders out of the story", () => {
  const story = storyForPassengers(
    [
      entry("riderBooked", { passengerId: "p-karl", name: "Karl Weber" }),
      entry("riderRemoved", { passengerId: "p-karl", name: "Karl Weber" }),
      entry("rosterReordered", {
        from: ["p-anna", "p-karl"],
        to: ["p-karl", "p-anna"],
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(story).toEqual([]);
});

it("drops internal notes and fleet changes", () => {
  const story = storyForPassengers(
    [
      entry("note", { text: "Rider is grumpy" }),
      entry("trishawsChanged", {
        added: [{ id: "t", name: "Isarwind" }],
        removed: [],
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(story).toEqual([]);
});

it("names the pilot and leaves out who put them on", () => {
  const [assigned, unassigned] = storyForPassengers(
    [
      entry("pilotAssigned", {
        userId: "u-max",
        role: "pilot",
        name: "Max Müller",
      }),
      entry(
        "pilotUnassigned",
        { userId: "u-max", role: "pilot", name: null },
        "u-max",
      ),
    ],
    MINE,
    VIEWER,
  );
  expect(assigned).toEqual({
    id: "pilotAssigned-user-admin",
    createdAt: at,
    type: "pilotAssigned",
    pilot: "Max Müller",
  });
  expect(unassigned).toMatchObject({ type: "pilotUnassigned", pilot: null });
});

it("shows a move with both windows", () => {
  const [moved] = storyForPassengers(
    [
      entry("rescheduled", {
        from: {
          startsAt: "2026-10-14T12:00:00.000Z",
          endsAt: "2026-10-14T13:00:00.000Z",
        },
        to: {
          startsAt: "2026-10-15T08:00:00.000Z",
          endsAt: "2026-10-15T09:00:00.000Z",
        },
        withLegOf: "ride-0",
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(moved).toEqual({
    id: "rescheduled-user-admin",
    createdAt: at,
    type: "rescheduled",
    by: "chapter",
    from: {
      startsAt: "2026-10-14T12:00:00.000Z",
      endsAt: "2026-10-14T13:00:00.000Z",
    },
    to: {
      startsAt: "2026-10-15T08:00:00.000Z",
      endsAt: "2026-10-15T09:00:00.000Z",
    },
    withLeg: true,
  });
});

it("keeps only the edits a rider cares about, once per thing", () => {
  const [edited] = storyForPassengers(
    [
      entry("edited", {
        fields: [
          "locationName",
          "locationAddress",
          "latitude",
          "capacity",
          "note",
        ],
        from: {
          locationName: "Sonnenhof",
          locationAddress: "Hofweg 1",
          capacity: 4,
        },
        to: {
          locationName: null,
          locationAddress: "Parkstraße 2",
          capacity: 6,
        },
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(edited).toEqual({
    id: "edited-user-admin",
    createdAt: at,
    type: "edited",
    by: "chapter",
    changes: [{ field: "location", from: null, to: null }],
  });
});

it("drops an edit that touched nothing a rider sees", () => {
  const story = storyForPassengers(
    [
      entry("edited", { fields: ["photos"] }),
      entry("edited", {
        fields: ["capacity", "requiredPilots", "note", "description"],
        from: { capacity: 4 },
        to: { capacity: 6 },
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(story).toEqual([]);
});

it("carries the reason and the note of a cancellation", () => {
  const [cancelled] = storyForPassengers(
    [entry("cancelled", { reasonCode: "weather", note: "Storm warning" })],
    MINE,
    VIEWER,
  );
  expect(cancelled).toMatchObject({
    type: "cancelled",
    by: "chapter",
    reasonCode: "weather",
    note: "Storm warning",
  });
});

it("ignores a reason code it does not know", () => {
  const [cancelled] = storyForPassengers(
    [entry("cancelled", { reasonCode: "<script>", note: null })],
    MINE,
    VIEWER,
  );
  expect(cancelled).toMatchObject({ reasonCode: null, note: null });
});

it("survives a malformed payload", () => {
  const story = storyForPassengers(
    [
      entry("rescheduled", null),
      entry("riderBooked", null),
      entry("edited", null),
    ],
    MINE,
    VIEWER,
  );
  expect(story).toEqual([
    expect.objectContaining({ type: "rescheduled", from: null, to: null }),
  ]);
});

it("never tells where a ride used to pick up or go", () => {
  const [edited] = storyForPassengers(
    [
      entry("edited", {
        fields: ["destinationAddress", "title"],
        from: { destinationAddress: "Karl's home, Hofweg 1", title: "Old" },
        to: { destinationAddress: "Praxis, Parkstraße 2", title: "New" },
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(edited).toMatchObject({
    changes: [
      { field: "destination", from: null, to: null },
      { field: "title", from: "Old", to: "New" },
    ],
  });
  expect(JSON.stringify(edited)).not.toContain("Hofweg");
});

it("keeps an earlier rider's door out of a later rider's story", () => {
  const story = storyForPassengers(
    [
      entry("edited", {
        fields: ["locationAddress"],
        from: { locationAddress: "Sonnenhof" },
        to: { locationAddress: "Karl Huber, Hofweg 1" },
      }),
      entry("edited", {
        fields: ["locationAddress"],
        from: { locationAddress: "Karl Huber, Hofweg 1" },
        to: { locationAddress: "Anna Bauer, Lindenweg 3" },
      }),
    ],
    MINE,
    VIEWER,
  );
  expect(story).toHaveLength(2);
  expect(JSON.stringify(story)).not.toContain("Hofweg");
  expect(JSON.stringify(story)).not.toContain("Lindenweg");
});
