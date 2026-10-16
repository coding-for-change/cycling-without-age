import { passengers } from "@/features/passengers";
import { rideRequests } from "@/features/ride-requests";
import { moveHandedOverRequests } from "./move-handed-over-requests";

jest.mock("@/features/passengers", () => ({
  passengers: { getPassenger: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { handOverOpenRequests: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe("moveHandedOverRequests", () => {
  const event = {
    passengerId: "managed-greta",
    fromUserId: "user-old",
    toUserId: "user-new",
  };

  it("moves the open requests while the rider is still with the new manager", async () => {
    (passengers.getPassenger as jest.Mock).mockResolvedValue({
      id: "managed-greta",
      managedByUserId: "user-new",
    });
    await moveHandedOverRequests(event);
    expect(rideRequests.handOverOpenRequests).toHaveBeenCalledWith(
      "managed-greta",
      "user-old",
      "user-new",
    );
  });

  it("leaves the requests alone once the rider was handed on or back", async () => {
    (passengers.getPassenger as jest.Mock).mockResolvedValue({
      id: "managed-greta",
      managedByUserId: "user-old",
    });
    expect(await moveHandedOverRequests(event)).toBe(0);
    expect(rideRequests.handOverOpenRequests).not.toHaveBeenCalled();
  });
});
