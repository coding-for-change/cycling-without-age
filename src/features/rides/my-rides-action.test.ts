import { listMyRidesPageAction } from "@/features/rides/actions";
import { passengerRidesPage } from "@/use-cases/passenger-rides";

jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => ({ user: { id: "user-manager" } })),
  requireAdminScope: jest.fn(),
  requireChapterAdmin: jest.fn(),
}));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: (email: string) => email,
  avatarSvg: (seed: string) => `<svg data-seed="${seed}" />`,
}));
jest.mock("@/use-cases/passenger-rides", () => ({
  passengerRidesPage: jest.fn(),
}));

const page = passengerRidesPage as jest.Mock;

const ROW = {
  id: "ride-1",
  startsAt: new Date("2026-10-14T12:00:00Z"),
  endsAt: new Date("2026-10-14T13:00:00Z"),
  model: "event",
  status: "scheduled",
  title: "Sommerfest",
  locationName: "Sonnenhof",
  destinationName: null,
  chapter: { timeZone: "Europe/Berlin" },
  assignments: [
    {
      role: "pilot",
      user: { id: "u-max", name: "Max Müller", email: "max@cwa.local" },
    },
  ],
  roster: [
    { passenger: { id: "p-anna", firstName: "Anna", lastName: "Bauer" } },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  page.mockResolvedValue({ rides: [ROW], nextCursor: null });
});

it("pages the signed-in member's rides and nobody else's", async () => {
  await listMyRidesPageAction({
    direction: "upcoming",
    cursor: "1.x",
    passengerIds: ["p-stranger"],
    userId: "user-stranger",
  });
  expect(page).toHaveBeenCalledWith("user-manager", {
    direction: "upcoming",
    cursor: "1.x",
  });
});

it("keeps the page size its own, whatever the client asks for", async () => {
  await listMyRidesPageAction({ direction: "past", limit: 100 });
  expect(page).toHaveBeenCalledWith("user-manager", {
    direction: "past",
    cursor: undefined,
  });
});

it("hands the client no email, only the pilot's avatar", async () => {
  const result = await listMyRidesPageAction({ direction: "upcoming" });
  expect(result).toEqual({
    ok: true,
    nextCursor: null,
    rides: [
      expect.objectContaining({
        id: "ride-1",
        timeZone: "Europe/Berlin",
        pilots: [
          {
            id: "u-max",
            name: "Max Müller",
            avatar: '<svg data-seed="max@cwa.local" />',
          },
        ],
        riders: ["Anna Bauer"],
      }),
    ],
  });
  expect(JSON.stringify(result)).not.toContain('"email"');
});

it("refuses a direction it does not know", async () => {
  await expect(
    listMyRidesPageAction({ direction: "sideways" }),
  ).resolves.toEqual({ ok: false, error: "generic" });
  expect(page).not.toHaveBeenCalled();
});
