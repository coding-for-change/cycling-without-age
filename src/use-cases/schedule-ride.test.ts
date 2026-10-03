import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";
import {
  allocateTrishaws,
  freeTrishawsInWindow,
  scheduleRideAt,
} from "@/use-cases/schedule-ride";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/fleet", () => ({
  fleet: {
    assertUsable: jest.fn(),
    listTrishaws: jest.fn(),
    chapterIdsReaching: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: {
    getRide: jest.fn(),
    setRideTrishaws: jest.fn(),
    scheduleRide: jest.fn(),
    listRidesInRange: jest.fn(),
  },
}));

const assertUsable = fleet.assertUsable as jest.Mock;
const scheduleRide = rides.scheduleRide as jest.Mock;

const CHAPTER = "chapter-muenchen";
const ADMIN = "user-admin";

beforeEach(() => {
  jest.clearAllMocks();
  assertUsable.mockResolvedValue(undefined);
  (chapters.getChapter as jest.Mock).mockResolvedValue({
    id: CHAPTER,
    timeZone: "Europe/Berlin",
  });
  scheduleRide.mockResolvedValue({ id: "ride-new" });
  (rides.getRide as jest.Mock).mockResolvedValue({
    id: "ride-1",
    chapterId: CHAPTER,
    trishaws: [{ trishaw: { id: "grounded-since" } }],
  });
});

describe("allocateTrishaws", () => {
  it("checks only newly added trishaws, so a grounded one already on the ride can stay", async () => {
    await allocateTrishaws("ride-1", ["grounded-since", "new-one"], ADMIN);
    expect(assertUsable).toHaveBeenCalledWith(["new-one"], CHAPTER);
    expect(rides.setRideTrishaws).toHaveBeenCalledWith(
      "ride-1",
      ["grounded-since", "new-one"],
      ADMIN,
    );
  });

  it("stops before writing when a new trishaw is unusable", async () => {
    assertUsable.mockRejectedValue(new Error("trishawUnavailable"));
    await expect(
      allocateTrishaws("ride-1", ["new-one"], ADMIN),
    ).rejects.toThrow();
    expect(rides.setRideTrishaws).not.toHaveBeenCalled();
  });
});

describe("scheduleRideAt", () => {
  const form = {
    chapterId: CHAPTER,
    model: "functional" as const,
    slot: { date: "2026-10-27", start: "09:30", durationMinutes: 90 },
    locationName: "Sonnenhof",
    destinationName: "Dr. Weber",
    trishawIds: ["trishaw-1"],
  };

  // Late October is the first week of CET again; 09:30 Berlin is 08:30 UTC.
  it("reads the slot on the chapter's wall clock, not the server's", async () => {
    await scheduleRideAt(form, ADMIN);
    expect(scheduleRide).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: new Date("2026-10-27T08:30:00Z"),
        endsAt: new Date("2026-10-27T10:00:00Z"),
        returnLeg: undefined,
      }),
      ADMIN,
    );
  });

  it("books the way back after the stay, as long as the way there", async () => {
    await scheduleRideAt({ ...form, roundTrip: true, stayMinutes: 45 }, ADMIN);
    expect(scheduleRide.mock.calls[0][0].returnLeg).toEqual({
      startsAt: new Date("2026-10-27T10:45:00Z"),
      endsAt: new Date("2026-10-27T12:15:00Z"),
    });
  });

  it("gives an event or pleasure ride no destination and no way back", async () => {
    await scheduleRideAt(
      { ...form, model: "pleasure", roundTrip: true },
      ADMIN,
    );
    expect(scheduleRide.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        destinationName: null,
        returnLeg: undefined,
      }),
    );
  });

  it("asks the fleet whether the chapter may use the trishaws first", async () => {
    assertUsable.mockRejectedValue(new Error("trishawNotInChapter"));
    await expect(scheduleRideAt(form, ADMIN)).rejects.toThrow();
    expect(assertUsable).toHaveBeenCalledWith(["trishaw-1"], CHAPTER);
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("refuses a chapter that does not exist", async () => {
    (chapters.getChapter as jest.Mock).mockResolvedValue(null);
    await expect(scheduleRideAt(form, ADMIN)).rejects.toThrow("unknownChapter");
  });
});

describe("freeTrishawsInWindow", () => {
  const slot = { date: "2026-10-27", start: "09:30", durationMinutes: 60 };

  beforeEach(() => {
    (fleet.listTrishaws as jest.Mock).mockResolvedValue([
      { id: "free" },
      { id: "busy-there" },
      { id: "busy-back" },
    ]);
    (fleet.chapterIdsReaching as jest.Mock).mockReturnValue([CHAPTER]);
    (rides.listRidesInRange as jest.Mock).mockResolvedValue([
      {
        id: "a",
        status: "scheduled",
        startsAt: new Date("2026-10-27T08:00:00Z"),
        endsAt: new Date("2026-10-27T09:00:00Z"),
        trishaws: [{ trishaw: { id: "busy-there" } }],
      },
      {
        id: "b",
        status: "scheduled",
        startsAt: new Date("2026-10-27T10:30:00Z"),
        endsAt: new Date("2026-10-27T11:00:00Z"),
        trishaws: [{ trishaw: { id: "busy-back" } }],
      },
      {
        id: "c",
        status: "cancelled",
        startsAt: new Date("2026-10-27T08:00:00Z"),
        endsAt: new Date("2026-10-27T09:00:00Z"),
        trishaws: [{ trishaw: { id: "free" } }],
      },
    ]);
  });

  it("marks what another ride holds in the window, ignoring cancelled ones", async () => {
    const { busy } = await freeTrishawsInWindow({ chapterId: CHAPTER, slot });
    expect(busy).toEqual({
      free: false,
      "busy-there": true,
      "busy-back": false,
    });
  });

  it("also checks the way back of a round trip", async () => {
    const { busy } = await freeTrishawsInWindow({
      chapterId: CHAPTER,
      slot,
      roundTrip: true,
      stayMinutes: 30,
    });
    expect(busy["busy-back"]).toBe(true);
  });
});
