import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { staffingCheck } from "./staffing-check";

jest.mock("@/features/chapters", () => ({
  ...jest.requireActual("@/features/chapters/schemas"),
  chapters: { getSettingsOf: jest.fn() },
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
      [["a", "c"], 24, NOW],
      [["b"], 168, NOW],
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
});
