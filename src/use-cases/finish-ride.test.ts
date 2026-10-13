import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { pickupView } from "./finish-ride";

jest.mock("@/features/chapters", () => ({
  chapters: { getSettings: jest.fn() },
}));
jest.mock("@/features/fleet", () => ({
  fleet: { getTrishaws: jest.fn(), listLocationsForChapters: jest.fn() },
}));
jest.mock("@/features/rides", () => ({ rides: {} }));

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
  (fleet.getTrishaws as jest.Mock).mockResolvedValue([
    { id: "trishaw-1", storageLocation: { id: "loc-1" } },
  ]);
  (fleet.listLocationsForChapters as jest.Mock).mockResolvedValue([
    { id: "loc-1", accessCode: "4711" },
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
