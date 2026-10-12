import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { staffingCheck } from "./staffing-check";

jest.mock("@/features/chapters", () => ({
  ...jest.requireActual("@/features/chapters/schemas"),
  chapters: { getSettingsOf: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { listStaffingCandidates: jest.fn(), checkStaffing: jest.fn() },
}));

const NOW = new Date("2026-10-12T08:00:00Z");
const hoursAhead = (hours: number) =>
  new Date(NOW.getTime() + hours * 60 * 60 * 1000);

beforeEach(() => {
  jest.clearAllMocks();
  (rides.checkStaffing as jest.Mock).mockResolvedValue(true);
});

describe("staffingCheck", () => {
  it("checks each ride against its own chapter's window", async () => {
    (rides.listStaffingCandidates as jest.Mock).mockResolvedValue([
      { id: "soon-a", chapterId: "a", startsAt: hoursAhead(20) },
      { id: "later-a", chapterId: "a", startsAt: hoursAhead(30) },
      { id: "later-b", chapterId: "b", startsAt: hoursAhead(30) },
    ]);
    (chapters.getSettingsOf as jest.Mock).mockResolvedValue(
      new Map([
        ["a", { staffingCheckLeadHours: 24 }],
        ["b", { staffingCheckLeadHours: 48 }],
      ]),
    );
    expect(await staffingCheck(NOW)).toBe(2);
    expect(
      (rides.checkStaffing as jest.Mock).mock.calls.map(([id]) => id),
    ).toEqual(["soon-a", "later-b"]);
    expect(rides.listStaffingCandidates).toHaveBeenCalledWith(168, NOW);
  });

  it("counts only the rides it actually flagged", async () => {
    (rides.listStaffingCandidates as jest.Mock).mockResolvedValue([
      { id: "checked", chapterId: "a", startsAt: hoursAhead(1) },
    ]);
    (chapters.getSettingsOf as jest.Mock).mockResolvedValue(
      new Map([["a", { staffingCheckLeadHours: 24 }]]),
    );
    (rides.checkStaffing as jest.Mock).mockResolvedValue(false);
    expect(await staffingCheck(NOW)).toBe(0);
  });

  it("reads no settings when nothing is due", async () => {
    (rides.listStaffingCandidates as jest.Mock).mockResolvedValue([]);
    expect(await staffingCheck(NOW)).toBe(0);
    expect(chapters.getSettingsOf).not.toHaveBeenCalled();
  });
});
