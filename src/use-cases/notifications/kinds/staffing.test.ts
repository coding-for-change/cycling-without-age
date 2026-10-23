import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { rideAnnounced, rideOpened } from "./staffing";

jest.mock("@/features/chapters", () => ({
  chapters: { getSettings: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listPilotMembers: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { listBookingAccountsOfChapters: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: {
    getRideFacts: jest.fn(),
    getOpenRideForPilot: jest.fn(),
    listRideParticipants: jest.fn(),
  },
}));

const CHAPTER = "chapter-muenchen";
const scope = { rideId: "ride-1", chapterId: CHAPTER };

const opened = (exceptUserId: string | null = null) => ({
  type: "ride.opened" as const,
  ...scope,
  actorUserId: "admin-1",
  pair: null,
  exceptUserId,
});

const announced = {
  type: "ride.announced" as const,
  ...scope,
  actorUserId: "admin-1",
};

const selfService = (on: boolean) =>
  (chapters.getSettings as jest.Mock).mockResolvedValue({
    pilotsMaySelfAssign: on,
  });
const stillShort = (short: boolean) =>
  (rides.getOpenRideForPilot as jest.Mock).mockResolvedValue(
    short ? { id: "ride-1" } : null,
  );

beforeEach(() => {
  jest.clearAllMocks();
  selfService(true);
  stillShort(true);
  (rides.getRideFacts as jest.Mock).mockResolvedValue({ title: "Ausfahrt" });
  (membership.listPilotMembers as jest.Mock).mockResolvedValue([
    { userId: "pilot-on", chapterId: CHAPTER },
    { userId: "pilot-free", chapterId: CHAPTER },
    { userId: "pilot-left", chapterId: CHAPTER },
    { userId: "admin-1", chapterId: CHAPTER },
  ]);
  (rides.listRideParticipants as jest.Mock).mockResolvedValue({
    chapterId: CHAPTER,
    pilotUserIds: ["pilot-on"],
    riderAccountUserIds: [],
  });
  (passengers.listBookingAccountsOfChapters as jest.Mock).mockResolvedValue([
    "carer-1",
  ]);
});

describe("a ride that needs a pilot", () => {
  it("asks the chapter's pilots who are not on it", async () => {
    expect(await rideOpened.recipients(opened())).toEqual([
      "pilot-free",
      "pilot-left",
    ]);
  });

  it("does not ask the pilot back whose leaving reopened it", async () => {
    expect(await rideOpened.recipients(opened("pilot-left"))).toEqual([
      "pilot-free",
    ]);
  });

  it("tells nobody once the gap was filled before the message went out", async () => {
    stillShort(false);
    expect(await rideOpened.recipients(opened())).toEqual([]);
  });

  it("tells nobody where the chapter puts its pilots on rides itself", async () => {
    selfService(false);
    expect(await rideOpened.recipients(opened())).toEqual([]);
  });
});

describe("an announced event", () => {
  it("reaches pilots as pilots once it no longer waits on them", async () => {
    stillShort(false);
    expect(await rideAnnounced.recipients(announced)).toEqual([
      "carer-1",
      { userId: "pilot-free", audience: "pilot" },
      { userId: "pilot-left", audience: "pilot" },
    ]);
  });

  it("leaves pilots to the open-ride message while it still needs them", async () => {
    expect(await rideAnnounced.recipients(announced)).toEqual(["carer-1"]);
  });

  it("reaches pilots when the chapter does not let them sign up", async () => {
    selfService(false);
    expect(await rideAnnounced.recipients(announced)).toEqual([
      "carer-1",
      { userId: "pilot-free", audience: "pilot" },
      { userId: "pilot-left", audience: "pilot" },
    ]);
  });

  it("reads as a booking to someone who both books and pilots", async () => {
    stillShort(false);
    (passengers.listBookingAccountsOfChapters as jest.Mock).mockResolvedValue([
      "pilot-free",
    ]);
    expect(await rideAnnounced.recipients(announced)).toEqual([
      "pilot-free",
      { userId: "pilot-left", audience: "pilot" },
    ]);
  });

  it("sends pilots to their own view of the event", () => {
    expect(rideAnnounced.href(announced, "pilot")).toBe("/pilot/rides/ride-1");
    expect(rideAnnounced.href(announced)).toBe("/passenger/rides/ride-1");
  });
});
