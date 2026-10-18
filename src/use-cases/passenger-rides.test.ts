import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import {
  passengerRideView,
  passengerRiderIds,
  passengerRidesOverview,
  passengerRidesPage,
} from "@/use-cases/passenger-rides";

jest.mock("@/features/membership", () => ({
  membership: { listMembershipsOfUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    listPassengersManagedBy: jest.fn(),
    getOwnPassenger: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    listPassengerRidesPage: jest.fn(),
    getRideWithStoryForPassengers: jest.fn(),
    passengerYearInReview: jest.fn(async () => null),
  },
}));

const memberships = membership.listMembershipsOfUser as jest.Mock;
const managedBy = passengers.listPassengersManagedBy as jest.Mock;
const ownRider = passengers.getOwnPassenger as jest.Mock;
const listPage = rides.listPassengerRidesPage as jest.Mock;
const getView = rides.getRideWithStoryForPassengers as jest.Mock;

const EMPTY = { rides: [], nextCursor: null };

beforeEach(() => {
  jest.clearAllMocks();
  memberships.mockResolvedValue([
    { chapterId: "ch-muenchen", roles: ["passenger"] },
  ]);
  managedBy.mockResolvedValue([
    { id: "p-self", chapterId: "ch-muenchen" },
    { id: "p-mum", chapterId: "ch-muenchen" },
  ]);
  listPage.mockResolvedValue(EMPTY);
  ownRider.mockResolvedValue({ id: "p-self", chapterId: "ch-muenchen" });
});

it("reads the riders from the account, never from the request", async () => {
  await passengerRidesPage("user-1", { direction: "past", cursor: "1.x" });
  expect(managedBy).toHaveBeenCalledWith("user-1");
  expect(memberships).toHaveBeenCalledWith("user-1");
  expect(listPage).toHaveBeenCalledWith(["p-self", "p-mum"], {
    direction: "past",
    cursor: "1.x",
  });
});

it("forgets the riders of a chapter the account has left", async () => {
  managedBy.mockResolvedValue([
    { id: "p-self", chapterId: "ch-muenchen" },
    { id: "p-old", chapterId: "ch-hamburg" },
  ]);
  await expect(passengerRiderIds("user-1")).resolves.toEqual(["p-self"]);

  memberships.mockResolvedValue([]);
  await expect(passengerRiderIds("user-1")).resolves.toEqual([]);
});

it("counts the account's own rider when a caretaker manages it", async () => {
  managedBy.mockResolvedValue([]);
  ownRider.mockResolvedValue({ id: "p-self", chapterId: "ch-muenchen" });
  await expect(passengerRiderIds("user-1")).resolves.toEqual(["p-self"]);
});

it("opens with both directions and says how many riders there are", async () => {
  const overview = await passengerRidesOverview("user-1");
  expect(listPage).toHaveBeenCalledWith(["p-self", "p-mum"], {
    direction: "upcoming",
  });
  expect(listPage).toHaveBeenCalledWith(["p-self", "p-mum"], {
    direction: "past",
  });
  expect(overview).toEqual({
    upcoming: EMPTY,
    past: EMPTY,
    year: null,
    riderCount: 2,
  });
  expect(rides.passengerYearInReview).toHaveBeenCalledWith(["p-self", "p-mum"]);
});

it("shows a ride with its story to someone whose rider is on it", async () => {
  getView.mockResolvedValue({ ride: { id: "ride-1" }, story: [{ id: "l-1" }] });
  await expect(passengerRideView("user-1", "ride-1")).resolves.toEqual({
    ride: { id: "ride-1" },
    story: [{ id: "l-1" }],
    riderCount: 2,
  });
  expect(getView).toHaveBeenCalledWith("ride-1", ["p-self", "p-mum"], "user-1");
});

it("tells nothing about someone else's ride", async () => {
  getView.mockResolvedValue(null);
  await expect(passengerRideView("user-1", "ride-9")).resolves.toBeNull();
});
