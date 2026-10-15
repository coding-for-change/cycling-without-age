import { rides } from "@/features/rides/index";
import {
  addRideNoteAction,
  completeRideAction,
  deleteRideAction,
  reopenRideAction,
  rescheduleRideAction,
  setCheckedInAction,
  submitDebriefAction,
  updateRideAction,
} from "@/features/rides/actions";
import { isChapterAdmin } from "@/lib/access";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { completeRide } from "@/use-cases/complete-ride";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(async () => undefined),
  requireAuth: jest.fn(async () => ({ user: { id: "user-1" }, access: {} })),
  requireChapterAdmin: jest.fn(async () => ({ user: { id: "admin-1" } })),
}));
jest.mock("@/lib/access", () => ({ isChapterAdmin: jest.fn(() => false) }));
jest.mock("@/use-cases/complete-ride", () => ({
  completeRide: jest.fn(async () => ({ riders: 2, noShows: 0 })),
}));
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
    pilotCanOpen: jest.fn(async () => false),
    setCheckedIn: jest.fn(async () => true),
    submitDebrief: jest.fn(async () => ({})),
    reopenRide: jest.fn(async () => true),
    rescheduleRide: jest.fn(async () => ({ changed: true })),
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
  const checkIn = () =>
    setCheckedInAction({
      rideId: "ride-1",
      entryId: "entry-1",
      checkedIn: true,
    });

  it("lets the ride's own pilot check riders in, as its pilot", async () => {
    (rides.pilotCanOpen as jest.Mock).mockResolvedValueOnce(true);
    await expect(checkIn()).resolves.toEqual({ ok: true, changed: true });
    expect(rides.pilotCanOpen).toHaveBeenCalledWith("ride-1", "user-1");
    expect(requireChapterAdmin).not.toHaveBeenCalled();
    expect(rides.setCheckedIn).toHaveBeenCalledWith(
      "ride-1",
      "entry-1",
      true,
      "user-1",
      "pilot",
    );
  });

  it("asks anyone else to be an admin of the ride's own chapter", async () => {
    await checkIn();
    expect(requireChapterAdmin).toHaveBeenCalledWith("chapter-muenchen");
    expect(rides.setCheckedIn).toHaveBeenCalledWith(
      "ride-1",
      "entry-1",
      true,
      "user-1",
      "admin",
    );
  });

  it("stops at the admin guard for someone who is neither", async () => {
    (requireChapterAdmin as jest.Mock).mockRejectedValueOnce(
      new Error("NEXT_HTTP_ERROR_FALLBACK;403"),
    );
    await expect(completeRideAction("ride-1")).rejects.toThrow("403");
    expect(completeRide).not.toHaveBeenCalled();
  });

  it("treats an admin who also pilots the ride as its admin", async () => {
    (isChapterAdmin as jest.Mock).mockReturnValueOnce(true);
    (rides.pilotCanOpen as jest.Mock).mockResolvedValue(true);
    await completeRideAction("ride-1");
    expect(requireChapterAdmin).toHaveBeenCalledWith("chapter-muenchen");
    expect(completeRide).toHaveBeenCalledWith("ride-1", "user-1", "admin");
    (rides.pilotCanOpen as jest.Mock).mockResolvedValue(false);
  });

  it("files the debrief under whoever wrote it", async () => {
    (rides.pilotCanOpen as jest.Mock).mockResolvedValueOnce(true);
    expect(
      await submitDebriefAction({ rideId: "ride-1", donationCents: 500 }),
    ).toEqual({ ok: true });
    expect(rides.submitDebrief).toHaveBeenCalledWith(
      expect.objectContaining({ rideId: "ride-1", donationCents: 500 }),
      "user-1",
    );
  });

  it("knows no ride that is not there", async () => {
    (rides.getRide as jest.Mock).mockResolvedValueOnce(null);
    await expect(checkIn()).resolves.toEqual({
      ok: false,
      error: "unknownRide",
    });
  });

  // Reopening is never the pilot's: only the chapter's admins.
  it("reopens only through the admin guard", async () => {
    (rides.pilotCanOpen as jest.Mock).mockResolvedValue(true);
    await reopenRideAction("ride-1");
    expect(requireChapterAdmin).toHaveBeenCalledWith("chapter-muenchen");
    expect(rides.reopenRide).toHaveBeenCalledWith("ride-1", "admin-1");
    expect(rides.pilotCanOpen).not.toHaveBeenCalled();
    (rides.pilotCanOpen as jest.Mock).mockResolvedValue(false);
  });
});
