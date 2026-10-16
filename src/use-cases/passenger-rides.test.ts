import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import {
  passengerRideView,
  passengerRidesOverview,
  passengerRidesPage,
} from "@/use-cases/passenger-rides";

jest.mock("@/features/passengers", () => ({
  passengers: { listPassengersManagedBy: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: {
    listPassengerRidesPage: jest.fn(),
    getRideForPassengers: jest.fn(),
    listRideStoryForPassengers: jest.fn(),
  },
}));

const managedBy = passengers.listPassengersManagedBy as jest.Mock;
const listPage = rides.listPassengerRidesPage as jest.Mock;
const getRide = rides.getRideForPassengers as jest.Mock;
const listStory = rides.listRideStoryForPassengers as jest.Mock;

const EMPTY = { rides: [], nextCursor: null };

beforeEach(() => {
  jest.clearAllMocks();
  managedBy.mockResolvedValue([{ id: "p-self" }, { id: "p-mum" }]);
  listPage.mockResolvedValue(EMPTY);
});

it("reads the riders from the account, never from the request", async () => {
  await passengerRidesPage("user-1", { direction: "past", cursor: "1.x" });
  expect(managedBy).toHaveBeenCalledWith("user-1");
  expect(listPage).toHaveBeenCalledWith(["p-self", "p-mum"], {
    direction: "past",
    cursor: "1.x",
  });
});

it("opens with both directions and says how many riders there are", async () => {
  const overview = await passengerRidesOverview("user-1");
  expect(listPage).toHaveBeenCalledWith(["p-self", "p-mum"], {
    direction: "upcoming",
  });
  expect(listPage).toHaveBeenCalledWith(["p-self", "p-mum"], {
    direction: "past",
  });
  expect(overview).toEqual({ upcoming: EMPTY, past: EMPTY, riderCount: 2 });
});

it("shows a ride with its story to someone whose rider is on it", async () => {
  getRide.mockResolvedValue({ id: "ride-1" });
  listStory.mockResolvedValue([{ id: "log-1" }]);
  await expect(passengerRideView("user-1", "ride-1")).resolves.toEqual({
    ride: { id: "ride-1" },
    story: [{ id: "log-1" }],
    riderCount: 2,
  });
  expect(getRide).toHaveBeenCalledWith("ride-1", ["p-self", "p-mum"]);
  expect(listStory).toHaveBeenCalledWith(
    "ride-1",
    ["p-self", "p-mum"],
    "user-1",
  );
});

it("tells nothing, not even the story, about someone else's ride", async () => {
  getRide.mockResolvedValue(null);
  await expect(passengerRideView("user-1", "ride-9")).resolves.toBeNull();
  expect(listStory).not.toHaveBeenCalled();
});
