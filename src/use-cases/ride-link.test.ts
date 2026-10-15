import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { rideLinkFor } from "@/use-cases/ride-link";

jest.mock("@/features/passengers", () => ({
  passengers: { listRidersOfAccount: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { pilotCanOpen: jest.fn(), passengersCanOpen: jest.fn() },
}));

const forPilot = rides.pilotCanOpen as jest.Mock;
const forPassengers = rides.passengersCanOpen as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (passengers.listRidersOfAccount as jest.Mock).mockResolvedValue([
    { id: "erna" },
  ]);
  forPilot.mockResolvedValue(false);
  forPassengers.mockResolvedValue(false);
});

it("sends the ride's pilot to the pilot page", async () => {
  forPilot.mockResolvedValue(true);
  expect(await rideLinkFor("ride-1", "user-1")).toBe("/pilot/rides/ride-1");
});

it("sends whoever manages a rider on it to the passenger page", async () => {
  forPassengers.mockResolvedValue(true);
  expect(await rideLinkFor("ride-1", "user-1")).toBe("/passenger/rides/ride-1");
  expect(forPassengers).toHaveBeenCalledWith("ride-1", ["erna"]);
});

it("prefers the pilot page for a pilot who also manages a rider on it", async () => {
  forPilot.mockResolvedValue(true);
  forPassengers.mockResolvedValue(true);
  expect(await rideLinkFor("ride-1", "user-1")).toBe("/pilot/rides/ride-1");
});

it("has no own page for someone the ride doesn't concern", async () => {
  expect(await rideLinkFor("ride-1", "user-1")).toBeNull();
});
