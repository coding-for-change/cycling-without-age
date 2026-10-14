import { rides } from "@/features/rides/index";
import {
  addRideNoteAction,
  deleteRideAction,
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
});
