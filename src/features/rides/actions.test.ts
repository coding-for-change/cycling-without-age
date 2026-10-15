import { rides } from "@/features/rides/index";
import {
  rescheduleRideAction,
  updateRideAction,
} from "@/features/rides/actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(async () => ({})),
  requireChapterAdmin: jest.fn(async () => ({ user: { id: "admin-1" } })),
}));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: (email: string) => email,
  avatarSvg: () => "<svg />",
}));
jest.mock("@/lib/i18n", () => ({
  getDictionary: jest.fn(),
  getLocale: jest.fn(),
}));
jest.mock("@/lib/mapbox", () => ({ cyclingRoute: jest.fn() }));
jest.mock("@/lib/storage", () => ({}));
jest.mock("@/use-cases/book-rider", () => ({ bookRider: jest.fn() }));
jest.mock("@/use-cases/schedule-ride", () => ({}));
jest.mock("@/use-cases/staff-ride", () => ({ staffRide: jest.fn() }));
jest.mock("@/features/rides/index", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: {
    getRideScope: jest.fn(async (id: string) => ({
      id,
      chapterId: "chapter-1",
      trishawIds: [],
    })),
    updateRideDetails: jest.fn(async () => ({})),
    rescheduleRide: jest.fn(async () => ({ changed: true })),
  },
}));

const RIDE_ID = "cmux3eufq001o3howrxo5kn39";

beforeEach(() => jest.clearAllMocks());

describe("ride actions without a reply", () => {
  it("writes the details before reporting the save", async () => {
    await expect(
      updateRideAction(RIDE_ID, { title: "Englischer Garten" }),
    ).resolves.toEqual({ ok: true });
    expect(rides.updateRideDetails).toHaveBeenCalledWith(
      RIDE_ID,
      { title: "Englischer Garten" },
      "admin-1",
    );
  });

  it("moves the ride before reporting the save", async () => {
    await expect(
      rescheduleRideAction(RIDE_ID, {
        startsAt: "2026-10-07T14:00:00.000Z",
        endsAt: "2026-10-07T16:00:00.000Z",
      }),
    ).resolves.toEqual({ ok: true });
    expect(rides.rescheduleRide).toHaveBeenCalledTimes(1);
  });
});
