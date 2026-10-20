import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";
import { finishRideView, pickupView } from "./finish-ride";

jest.mock("@/features/chapters", () => ({
  chapters: { getSettings: jest.fn() },
}));
jest.mock("@/features/fleet", () => ({
  fleet: { listTrishawPlaces: jest.fn(), listDamagesReportedOnRide: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    getFinishableRideForPilot: jest.fn(),
    getRideForPilot: jest.fn(),
    getDebrief: jest.fn(),
  },
}));

const ride = {
  chapterId: "chapter-1",
  status: "scheduled",
  startsAt: new Date("2026-09-08T08:00:00Z"),
  endsAt: new Date("2026-09-08T10:00:00Z"),
  trishaws: [{ trishaw: { id: "trishaw-1" } }],
};
const hoursBefore = (hours: number) =>
  new Date(ride.startsAt.getTime() - hours * 3_600_000);

beforeEach(() => {
  jest.clearAllMocks();
  (fleet.listTrishawPlaces as jest.Mock).mockResolvedValue([
    {
      trishaw: { id: "trishaw-1" },
      location: { id: "loc-1", accessCode: "4711" },
    },
  ]);
});

describe("pickupView", () => {
  it("opens a day before the ride", async () => {
    (chapters.getSettings as jest.Mock).mockResolvedValue({
      staffingCheckLeadHours: 48,
    });
    expect(await pickupView(ride, hoursBefore(25))).toBeNull();
    expect(await pickupView(ride, hoursBefore(23))).toHaveLength(1);
  });

  // A pilot who may still step back must not leave with the access code.
  it("opens no earlier than the pilot's last chance to step back", async () => {
    (chapters.getSettings as jest.Mock).mockResolvedValue({
      staffingCheckLeadHours: 12,
    });
    expect(await pickupView(ride, hoursBefore(13))).toBeNull();
    expect(await pickupView(ride, hoursBefore(11))).toHaveLength(1);
  });
});

describe("finishRideView", () => {
  it("gives the pilot the roster to close and their own debrief", async () => {
    (rides.getFinishableRideForPilot as jest.Mock).mockResolvedValue(ride);
    (rides.getRideForPilot as jest.Mock).mockResolvedValue({
      roster: [{ id: "entry-1", attendance: "checkedIn" }],
    });
    (rides.getDebrief as jest.Mock).mockResolvedValue({ note: "Lovely" });
    (chapters.getSettings as jest.Mock).mockResolvedValue({
      postRideInstructions: null,
    });
    (fleet.listDamagesReportedOnRide as jest.Mock).mockResolvedValue([]);
    const view = await finishRideView("ride-1", "pilot-1");
    expect(rides.getRideForPilot).toHaveBeenCalledWith("ride-1", "pilot-1");
    expect(rides.getDebrief).toHaveBeenCalledWith("ride-1", "pilot-1");
    expect(view).toMatchObject({
      roster: [{ id: "entry-1", attendance: "checkedIn" }],
      debrief: { note: "Lovely" },
    });
  });

  it("shows nothing to someone who is not the ride's pilot", async () => {
    (rides.getFinishableRideForPilot as jest.Mock).mockResolvedValue(null);
    expect(await finishRideView("ride-1", "someone")).toBeNull();
    expect(rides.getDebrief).not.toHaveBeenCalled();
  });
});
