import { rides } from "@/features/rides/index";
import {
  addRideNoteAction,
  deleteRideAction,
  rescheduleRideAction,
  updateRideAction,
} from "@/features/rides/actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(async () => undefined),
  requireChapterAdmin: jest.fn(async () => ({ user: { id: "admin-1" } })),
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
