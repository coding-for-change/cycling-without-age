import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { logger } from "@/lib/observability/logger";
import { staffingCheck } from "./staffing-check";

jest.mock("@/features/chapters", () => ({
  ...jest.requireActual("@/features/chapters/schemas"),
  chapters: { getSettingsOf: jest.fn() },
}));
jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    listChaptersToCheck: jest.fn(),
    listStaffingCandidates: jest.fn(),
    checkStaffing: jest.fn(),
  },
}));

const NOW = new Date("2026-10-12T08:00:00Z");

beforeEach(() => {
  jest.clearAllMocks();
  (rides.checkStaffing as jest.Mock).mockResolvedValue(true);
});

describe("staffingCheck", () => {
  it("reads each chapter's rides only inside its own window", async () => {
    (rides.listChaptersToCheck as jest.Mock).mockResolvedValue(["a", "b", "c"]);
    (chapters.getSettingsOf as jest.Mock).mockResolvedValue(
      new Map([
        ["a", { staffingCheckLeadHours: 24 }],
        ["b", { staffingCheckLeadHours: 168 }],
        ["c", { staffingCheckLeadHours: 24 }],
      ]),
    );
    (rides.listStaffingCandidates as jest.Mock).mockImplementation(
      async (chapterIds: string[]) =>
        chapterIds.includes("a") ? [{ id: "soon-a" }] : [{ id: "later-b" }],
    );
    expect(await staffingCheck(NOW)).toBe(2);
    expect(rides.listChaptersToCheck).toHaveBeenCalledWith(168, NOW);
    expect((rides.listStaffingCandidates as jest.Mock).mock.calls).toEqual([
      [["a", "c"], 24, NOW, 50],
      [["b"], 168, NOW, 49],
    ]);
    expect(
      (rides.checkStaffing as jest.Mock).mock.calls.map(([id]) => id),
    ).toEqual(["soon-a", "later-b"]);
  });

  it("counts only the rides it actually flagged", async () => {
    (rides.listChaptersToCheck as jest.Mock).mockResolvedValue(["a"]);
    (chapters.getSettingsOf as jest.Mock).mockResolvedValue(
      new Map([["a", { staffingCheckLeadHours: 24 }]]),
    );
    (rides.listStaffingCandidates as jest.Mock).mockResolvedValue([
      { id: "checked" },
    ]);
    (rides.checkStaffing as jest.Mock).mockResolvedValue(false);
    expect(await staffingCheck(NOW)).toBe(0);
  });

  it("reads no settings when nothing is due", async () => {
    (rides.listChaptersToCheck as jest.Mock).mockResolvedValue([]);
    expect(await staffingCheck(NOW)).toBe(0);
    expect(chapters.getSettingsOf).not.toHaveBeenCalled();
    expect(rides.listStaffingCandidates).not.toHaveBeenCalled();
  });

  it("passes over a ride that fails and checks the rest", async () => {
    (rides.listChaptersToCheck as jest.Mock).mockResolvedValue(["a"]);
    (chapters.getSettingsOf as jest.Mock).mockResolvedValue(
      new Map([["a", { staffingCheckLeadHours: 24 }]]),
    );
    (rides.listStaffingCandidates as jest.Mock).mockResolvedValue([
      { id: "gone" },
      { id: "short" },
    ]);
    (rides.checkStaffing as jest.Mock)
      .mockRejectedValueOnce(new Error("unknownRide"))
      .mockResolvedValueOnce(true);
    expect(await staffingCheck(NOW)).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ ride_id: "gone" }),
      "staffing check failed",
    );
  });

  it("stops at the run's share and leaves the rest to the next run", async () => {
    (rides.listChaptersToCheck as jest.Mock).mockResolvedValue(["a", "b"]);
    (chapters.getSettingsOf as jest.Mock).mockResolvedValue(
      new Map([
        ["a", { staffingCheckLeadHours: 24 }],
        ["b", { staffingCheckLeadHours: 48 }],
      ]),
    );
    (rides.listStaffingCandidates as jest.Mock).mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({ id: `ride-${i}` })),
    );
    await staffingCheck(NOW);
    expect(rides.listStaffingCandidates).toHaveBeenCalledTimes(1);
    expect(rides.checkStaffing).toHaveBeenCalledTimes(50);
  });
});
