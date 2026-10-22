import { rides } from "@/features/rides/index";
import {
  addRideNoteAction,
  addWalkUpAction,
  completeRideAction,
  deleteRideAction,
  estimateRouteAction,
  reopenRideAction,
  removeWalkUpAction,
  rescheduleRideAction,
  setCheckedInAction,
  setPilotNoShowAction,
  submitDebriefAction,
  updateRideAction,
} from "@/features/rides/actions";
import { isChapterAdmin } from "@/lib/access";
import { requireAdminScope, requireChapterAdmin } from "@/lib/auth-guards";
import { cyclingRoute } from "@/lib/mapbox";
import { withinRateLimit } from "@/lib/rate-limit";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(async () => undefined),
  requireAuth: jest.fn(async () => ({ user: { id: "user-1" }, access: {} })),
  requireChapterAdmin: jest.fn(async () => ({ user: { id: "admin-1" } })),
}));
jest.mock("@/lib/access", () => ({ isChapterAdmin: jest.fn(() => false) }));
jest.mock("@/lib/rate-limit", () => ({ withinRateLimit: jest.fn(() => true) }));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: (email: string) => email,
  avatarSvg: () => "<svg />",
}));
jest.mock("@/lib/mapbox", () => ({ cyclingRoute: jest.fn() }));
jest.mock("@/lib/storage", () => ({
  commitUpload: jest.fn(),
  requestUpload: jest.fn(),
  uploadCommit: { safeParse: jest.fn() },
  uploadRequest: { safeParse: jest.fn() },
  withinUploadLimit: jest.fn(),
}));
jest.mock("@/use-cases/book-rider", () => ({ bookRider: jest.fn() }));
jest.mock("@/use-cases/schedule-ride", () => ({
  allocateTrishaws: jest.fn(),
  freeTrishawsInWindow: jest.fn(),
  scheduleRideAt: jest.fn(),
}));
jest.mock("@/use-cases/staff-ride", () => ({ staffRide: jest.fn() }));
jest.mock("@/features/rides/index", () => ({
  rides: {
    getRideScope: jest.fn(async (id: string) => ({
      id,
      chapterId: "chapter-muenchen",
    })),
    updateRideDetails: jest.fn(async () => ({})),
    deleteRide: jest.fn(async () => undefined),
    addRideNote: jest.fn(async () => ({})),
    getRide: jest.fn(async (id: string) => ({
      id,
      chapterId: "chapter-muenchen",
      chapter: { countryId: "country-de" },
    })),
    pilotCanRun: jest.fn(async () => false),
    setCheckedIn: jest.fn(async () => true),
    submitDebrief: jest.fn(async () => ({})),
    reopenRide: jest.fn(async () => true),
    addWalkUp: jest.fn(async () => "walk-up-1"),
    removeWalkUp: jest.fn(async () => true),
    setPilotNoShow: jest.fn(async () => true),
    rescheduleRide: jest.fn(async () => ({ changed: true })),
    closeRoster: jest.fn(async () => ({ riders: 2, noShows: 0 })),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe("ride actions that answer with nothing but ok", () => {
  it("still carry out the change they report", async () => {
    await expect(
      updateRideAction("ride-1", { model: "pleasure" }),
    ).resolves.toEqual({ ok: true });
    expect(rides.updateRideDetails).toHaveBeenCalledWith(
      "ride-1",
      { model: "pleasure" },
      "admin-1",
    );

    await expect(
      addRideNoteAction({ rideId: "ride-1", text: "Blanket on board" }),
    ).resolves.toEqual({ ok: true });
    expect(rides.addRideNote).toHaveBeenCalledWith(
      "ride-1",
      "Blanket on board",
      "admin-1",
    );

    await expect(deleteRideAction("ride-1")).resolves.toEqual({ ok: true });
    expect(rides.deleteRide).toHaveBeenCalledWith("ride-1", "admin-1");
  });

  it("moves the ride before reporting the save", async () => {
    await expect(
      rescheduleRideAction("ride-1", {
        startsAt: "2026-10-07T14:00:00.000Z",
        endsAt: "2026-10-07T16:00:00.000Z",
      }),
    ).resolves.toEqual({ ok: true });
    expect(rides.rescheduleRide).toHaveBeenCalledTimes(1);
  });
});

describe("who runs a ride on the day", () => {
  beforeEach(() => {
    (rides.pilotCanRun as jest.Mock).mockResolvedValue(false);
    (isChapterAdmin as jest.Mock).mockReturnValue(false);
  });

  const day = [
    {
      name: "check-in",
      run: () =>
        setCheckedInAction({
          rideId: "ride-1",
          entryId: "entry-1",
          checkedIn: true,
        }),
      facade: () => rides.setCheckedIn as jest.Mock,
      as: (call: unknown[]) => call[4],
    },
    {
      name: "walk-up",
      run: () => addWalkUpAction({ rideId: "ride-1", firstName: "Inge" }),
      facade: () => rides.addWalkUp as jest.Mock,
      as: (call: unknown[]) => call[2],
    },
    {
      name: "walk-up removal",
      run: () => removeWalkUpAction({ rideId: "ride-1", entryId: "entry-1" }),
      facade: () => rides.removeWalkUp as jest.Mock,
      as: (call: unknown[]) => call[3],
    },
    {
      name: "completion",
      run: () => completeRideAction("ride-1"),
      facade: () => rides.closeRoster as jest.Mock,
      as: (call: unknown[]) => call[2],
    },
    {
      name: "debrief",
      run: () => submitDebriefAction({ rideId: "ride-1", note: "Lovely" }),
      facade: () => rides.submitDebrief as jest.Mock,
      as: (call: unknown[]) => call[2],
    },
  ];

  describe.each(day)("$name", ({ run, facade, as }) => {
    it("lets the ride's own pilot act, as its pilot", async () => {
      (rides.pilotCanRun as jest.Mock).mockResolvedValue(true);
      await expect(run()).resolves.toMatchObject({ ok: true });
      expect(rides.pilotCanRun).toHaveBeenCalledWith("ride-1", "user-1");
      expect(requireChapterAdmin).not.toHaveBeenCalled();
      expect(as(facade().mock.calls[0])).toBe("pilot");
    });

    it("asks anyone else to be an admin of the ride's own chapter", async () => {
      await run();
      expect(isChapterAdmin).toHaveBeenCalledWith(
        {},
        "chapter-muenchen",
        "country-de",
      );
      expect(requireChapterAdmin).toHaveBeenCalledWith("chapter-muenchen");
      expect(as(facade().mock.calls[0])).toBe("admin");
    });

    it("stops at the admin guard for someone who is neither", async () => {
      (requireChapterAdmin as jest.Mock).mockRejectedValueOnce(
        new Error("NEXT_HTTP_ERROR_FALLBACK;403"),
      );
      await expect(run()).rejects.toThrow("403");
      expect(facade()).not.toHaveBeenCalled();
    });

    it("treats an admin who also pilots the ride as its admin", async () => {
      (isChapterAdmin as jest.Mock).mockReturnValue(true);
      (rides.pilotCanRun as jest.Mock).mockResolvedValue(true);
      await run();
      expect(requireChapterAdmin).toHaveBeenCalledWith("chapter-muenchen");
      expect(as(facade().mock.calls[0])).toBe("admin");
    });

    it("knows no ride that is not there", async () => {
      (rides.getRide as jest.Mock).mockResolvedValueOnce(null);
      await expect(run()).resolves.toEqual({
        ok: false,
        error: "unknownRide",
      });
      expect(facade()).not.toHaveBeenCalled();
    });
  });

  it("files the debrief under whoever wrote it", async () => {
    (rides.pilotCanRun as jest.Mock).mockResolvedValue(true);
    await submitDebriefAction({ rideId: "ride-1", note: "Lovely" });
    expect(rides.submitDebrief).toHaveBeenCalledWith(
      expect.objectContaining({ rideId: "ride-1", note: "Lovely" }),
      "user-1",
      "pilot",
    );
  });

  // Reopening and marking a no-show are the chapter's, never a pilot's.
  it.each([
    ["reopen", () => reopenRideAction("ride-1"), () => rides.reopenRide],
    [
      "no-show",
      () =>
        setPilotNoShowAction({
          rideId: "ride-1",
          userId: "pilot-2",
          noShow: true,
        }),
      () => rides.setPilotNoShow,
    ],
  ])("lets only an admin %s", async (_, run, facade) => {
    (rides.pilotCanRun as jest.Mock).mockResolvedValue(true);
    (requireChapterAdmin as jest.Mock).mockRejectedValueOnce(
      new Error("NEXT_HTTP_ERROR_FALLBACK;403"),
    );
    await expect(run()).rejects.toThrow("403");
    expect(facade()).not.toHaveBeenCalled();
    expect(rides.pilotCanRun).not.toHaveBeenCalled();
  });
});

describe("how often a ride day may be written", () => {
  const HOUR = 3_600_000;
  it.each([
    [
      "check-in",
      () =>
        setCheckedInAction({ rideId: "ride-1", entryId: "e", checkedIn: true }),
      () => rides.setCheckedIn,
      { max: 600, windowMs: HOUR },
    ],
    [
      "walk-up",
      () => addWalkUpAction({ rideId: "ride-1", firstName: "Inge" }),
      () => rides.addWalkUp,
      { max: 120, windowMs: HOUR },
    ],
    [
      "walk-up",
      () => removeWalkUpAction({ rideId: "ride-1", entryId: "e" }),
      () => rides.removeWalkUp,
      { max: 120, windowMs: HOUR },
    ],
    [
      "debrief",
      () => submitDebriefAction({ rideId: "ride-1" }),
      () => rides.submitDebrief,
      { max: 120, windowMs: HOUR },
    ],
  ])("slows %s down per person", async (scope, run, facade, limit) => {
    (withinRateLimit as jest.Mock).mockReturnValueOnce(false);
    await expect(run()).resolves.toEqual({ ok: false, error: "rateLimited" });
    expect(withinRateLimit).toHaveBeenCalledWith(`${scope}:user-1`, limit);
    expect(facade()).not.toHaveBeenCalled();
  });
});

describe("estimateRouteAction", () => {
  const FROM = { lat: 48.1374, lng: 11.5755 };
  const TO = { lat: 48.1642, lng: 11.6056 };

  beforeEach(() => {
    (requireAdminScope as jest.Mock).mockResolvedValueOnce({
      session: { user: { id: "admin-1" } },
    });
  });

  it("estimates at trishaw pace, not the cycling time", async () => {
    (cyclingRoute as jest.Mock).mockResolvedValue({
      path: [[11.5755, 48.1374]],
      distanceM: 4200,
      durationSec: 900,
    });
    await expect(estimateRouteAction({ from: FROM, to: TO })).resolves.toEqual({
      ok: true,
      route: { path: [[11.5755, 48.1374]], distanceM: 4200, durationSec: 1350 },
    });
  });

  it("passes on that no route was found", async () => {
    (cyclingRoute as jest.Mock).mockResolvedValue(null);
    await expect(estimateRouteAction({ from: FROM, to: TO })).resolves.toEqual({
      ok: true,
      route: null,
    });
  });
});
