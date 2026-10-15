import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { logger } from "@/lib/observability/logger";
import {
  demandCheck,
  riderReminders,
  volunteerReminders,
} from "./ride-reminders";
import { rideSweep } from "./ride-sweep";

jest.mock("@/features/chapters", () => ({
  ...jest.requireActual("@/features/chapters/schemas"),
  chapters: { getSettingsOf: jest.fn() },
}));
jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    listChaptersDue: jest.fn(),
    listRidesDue: jest.fn(),
    sendReminder: jest.fn(),
    checkDemand: jest.fn(),
    listChaptersToCheck: jest.fn(),
    listStaffingCandidates: jest.fn(),
    checkStaffing: jest.fn(),
  },
}));

const NOW = new Date("2026-10-16T08:00:00Z");
const listChaptersDue = rides.listChaptersDue as jest.Mock;
const listRidesDue = rides.listRidesDue as jest.Mock;
const sendReminder = rides.sendReminder as jest.Mock;
const checkDemand = rides.checkDemand as jest.Mock;
const getSettingsOf = chapters.getSettingsOf as jest.Mock;

const settings = (overrides: Record<string, number>) => ({
  riderReminderLeadMinutes: 1440,
  volunteerReminderLeadMinutes: 1440,
  demandCheckLeadHours: 24,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  sendReminder.mockResolvedValue(true);
  checkDemand.mockResolvedValue(true);
  listChaptersDue.mockResolvedValue([]);
  (rides.listChaptersToCheck as jest.Mock).mockResolvedValue([]);
});

describe("the rider reminders", () => {
  it("reads each chapter's rides only inside its own lead", async () => {
    listChaptersDue.mockResolvedValue(["a", "b", "c"]);
    getSettingsOf.mockResolvedValue(
      new Map([
        ["a", settings({ riderReminderLeadMinutes: 30 })],
        ["b", settings({ riderReminderLeadMinutes: 2880 })],
        ["c", settings({ riderReminderLeadMinutes: 30 })],
      ]),
    );
    listRidesDue.mockImplementation(async (_marker, chapterIds: string[]) =>
      chapterIds.includes("a") ? [{ id: "soon" }] : [{ id: "later" }],
    );
    expect(await riderReminders(NOW)).toBe(2);
    expect(listChaptersDue).toHaveBeenCalledWith(
      "riderReminderSentAt",
      2880,
      NOW,
    );
    expect(listRidesDue.mock.calls).toEqual([
      ["riderReminderSentAt", ["a", "c"], 30, NOW, 50],
      ["riderReminderSentAt", ["b"], 2880, NOW, 49],
    ]);
    expect(sendReminder.mock.calls).toEqual([
      ["riderReminderSentAt", "soon", 30, NOW],
      ["riderReminderSentAt", "later", 2880, NOW],
    ]);
  });

  // The facade finds the stamp, or the ride cancelled, and says nothing.
  it("counts only the rides a reminder actually went out for", async () => {
    listChaptersDue.mockResolvedValue(["a"]);
    getSettingsOf.mockResolvedValue(new Map([["a", settings({})]]));
    listRidesDue.mockResolvedValue([{ id: "already" }, { id: "cancelled" }]);
    sendReminder.mockResolvedValue(false);
    expect(await riderReminders(NOW)).toBe(0);
  });

  it("passes over a ride that fails and reminds the rest", async () => {
    listChaptersDue.mockResolvedValue(["a"]);
    getSettingsOf.mockResolvedValue(new Map([["a", settings({})]]));
    listRidesDue.mockResolvedValue([{ id: "gone" }, { id: "ok" }]);
    sendReminder
      .mockRejectedValueOnce(new Error("unknownRide"))
      .mockResolvedValueOnce(true);
    expect(await riderReminders(NOW)).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ ride_id: "gone" }),
      "rider reminder failed",
    );
  });

  it("reads no settings when nothing is due", async () => {
    expect(await riderReminders(NOW)).toBe(0);
    expect(getSettingsOf).not.toHaveBeenCalled();
  });
});

describe("the pilots' reminder and the demand check", () => {
  it("reminds pilots by their own lead", async () => {
    listChaptersDue.mockResolvedValue(["a"]);
    getSettingsOf.mockResolvedValue(
      new Map([["a", settings({ volunteerReminderLeadMinutes: 120 })]]),
    );
    listRidesDue.mockResolvedValue([{ id: "ride" }]);
    await volunteerReminders(NOW);
    expect(listRidesDue).toHaveBeenCalledWith(
      "volunteerReminderSentAt",
      ["a"],
      120,
      NOW,
      50,
    );
    expect(sendReminder).toHaveBeenCalledWith(
      "volunteerReminderSentAt",
      "ride",
      120,
      NOW,
    );
  });

  it("checks demand in hours, read as minutes", async () => {
    listChaptersDue.mockResolvedValue(["a"]);
    getSettingsOf.mockResolvedValue(
      new Map([["a", settings({ demandCheckLeadHours: 2 })]]),
    );
    listRidesDue.mockResolvedValue([{ id: "ride" }]);
    expect(await demandCheck(NOW)).toBe(1);
    expect(listChaptersDue).toHaveBeenCalledWith("demandCheckedAt", 2880, NOW);
    expect(listRidesDue).toHaveBeenCalledWith(
      "demandCheckedAt",
      ["a"],
      120,
      NOW,
      50,
    );
    expect(checkDemand).toHaveBeenCalledWith("ride", 120, NOW);
  });
});

describe("the share of one run", () => {
  it("stops at 50 rides and leaves the next lead group to the next run", async () => {
    listChaptersDue.mockResolvedValue(["a", "b"]);
    getSettingsOf.mockResolvedValue(
      new Map([
        ["a", settings({ riderReminderLeadMinutes: 30 })],
        ["b", settings({ riderReminderLeadMinutes: 1440 })],
      ]),
    );
    listRidesDue.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({ id: `ride-${i}` })),
    );
    await riderReminders(NOW);
    expect(listRidesDue).toHaveBeenCalledTimes(1);
    expect(sendReminder).toHaveBeenCalledTimes(50);
  });
});

describe("rideSweep", () => {
  // A broken staffing check must not keep riders from their reminder.
  it("runs the other checks when one fails, then fails the run", async () => {
    (rides.listChaptersToCheck as jest.Mock).mockRejectedValue(
      new Error("db down"),
    );
    await expect(rideSweep(NOW)).rejects.toThrow("db down");
    expect(listChaptersDue).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "understaffed" }),
      "ride sweep failed",
    );
  });

  it("runs every check and reports each count", async () => {
    expect(await rideSweep(NOW)).toEqual({
      understaffed: 0,
      ridersReminded: 0,
      pilotsReminded: 0,
      noDemand: 0,
    });
    expect(listChaptersDue.mock.calls.map(([marker]) => marker)).toEqual([
      "riderReminderSentAt",
      "volunteerReminderSentAt",
      "demandCheckedAt",
    ]);
  });
});
