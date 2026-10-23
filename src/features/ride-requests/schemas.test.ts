import { rideRequestInput, type RideRequestInput } from "./schemas";

const HOME = {
  name: "Lindenweg 3",
  address: null,
  latitude: null,
  longitude: null,
};

const DOCTOR = {
  name: "Hausarzt Dr. Weber",
  address: "Marienplatz 1",
  latitude: 48.13,
  longitude: 11.57,
};

const request = (overrides: Partial<RideRequestInput> = {}) => ({
  passengerIds: ["mother"],
  model: "pleasure" as const,
  pickup: HOME,
  window: { date: "2026-10-08", startMinute: 600, endMinute: 660 },
  ...overrides,
});

const issuesOf = (input: object) => {
  const result = rideRequestInput.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
};

const pathsOf = (input: object) => [
  ...new Set(issuesOf(input).map((issue) => issue.path)),
];

const windowOf = (
  startMinute: number,
  endMinute: number,
  date = "2026-10-08",
) => request({ window: { date, startMinute, endMinute } });

describe("rideRequestInput", () => {
  it("takes a ride out for one rider from a place picked up", () => {
    expect(issuesOf(request())).toEqual([]);
  });

  describe("the riders", () => {
    it("refuses the same rider twice in one request", () => {
      expect(issuesOf(request({ passengerIds: ["mother", "mother"] }))).toEqual(
        [{ path: "passengerIds", message: "duplicateId" }],
      );
    });

    it("takes two riders and refuses a third", () => {
      expect(issuesOf(request({ passengerIds: ["mother", "father"] }))).toEqual(
        [],
      );
      expect(
        pathsOf(request({ passengerIds: ["mother", "father", "aunt"] })),
      ).toEqual(["passengerIds"]);
    });

    it("needs at least one rider", () => {
      expect(pathsOf(request({ passengerIds: [] }))).toEqual(["passengerIds"]);
    });
  });

  describe("the places", () => {
    it("needs a place to be picked up", () => {
      expect(issuesOf(request({ pickup: null }))).toEqual([
        { path: "pickup", message: "pickupRequired" },
      ]);
    });

    it("needs a destination to get somewhere, but not for a ride out", () => {
      expect(issuesOf(request({ model: "functional" }))).toEqual([
        { path: "destination", message: "destinationRequired" },
      ]);
      expect(
        issuesOf(request({ model: "functional", destination: DOCTOR })),
      ).toEqual([]);
    });
  });

  describe("the window", () => {
    it("takes a window from the shortest ride to the longest", () => {
      expect(issuesOf(windowOf(600, 615))).toEqual([]);
      expect(issuesOf(windowOf(480, 1200))).toEqual([]);
    });

    it.each([
      ["shorter than the shortest ride", 600, 614],
      ["longer than the longest ride", 480, 1201],
      ["ending before it starts", 660, 600],
      ["ending as it starts", 600, 600],
    ])("refuses a window %s", (_, startMinute, endMinute) => {
      expect(issuesOf(windowOf(startMinute, endMinute))).toEqual([
        { path: "window.endMinute", message: "invalidWindow" },
      ]);
    });

    it("runs up to the next midnight and no further", () => {
      expect(issuesOf(windowOf(1380, 1440))).toEqual([]);
      expect(pathsOf(windowOf(1380, 1441))).toContain("window.endMinute");
    });

    it.each([
      "2026-02-30",
      "2026-13-01",
      "2026-04-31",
      "2026-10-8",
      "8.10.2026",
    ])("refuses the date %s", (date) => {
      expect(pathsOf(windowOf(600, 660, date))).toEqual(["window.date"]);
    });

    it("takes the 29th of February in a leap year only", () => {
      expect(issuesOf(windowOf(600, 660, "2028-02-29"))).toEqual([]);
      expect(pathsOf(windowOf(600, 660, "2026-02-29"))).toEqual([
        "window.date",
      ]);
    });
  });

  describe("what it fills in", () => {
    it("asks for the way back unless told otherwise", () => {
      expect(rideRequestInput.parse(request()).roundTrip).toBe(true);
      expect(
        rideRequestInput.parse(request({ roundTrip: false })).roundTrip,
      ).toBe(false);
    });

    it("leaves out what was not chosen and a note of only spaces", () => {
      expect(rideRequestInput.parse(request({ note: "   " }))).toMatchObject({
        destination: null,
        note: null,
      });
    });
  });
});
