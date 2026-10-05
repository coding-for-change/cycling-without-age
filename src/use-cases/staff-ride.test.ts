import { membership } from "@/features/membership";
import { rides } from "@/features/rides";
import { staffRide } from "@/use-cases/staff-ride";

jest.mock("@/features/membership", () => ({
  membership: { getMemberRoles: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { assignVolunteer: jest.fn() },
}));

const RIDE = { id: "ride-1", chapterId: "chapter-muenchen" };

const getMemberRoles = membership.getMemberRoles as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("puts a pilot of the ride's chapter on the ride", async () => {
  getMemberRoles.mockResolvedValue(["pilot"]);
  await staffRide(RIDE, "user-pilot", "user-admin");
  expect(getMemberRoles).toHaveBeenCalledWith("user-pilot", "chapter-muenchen");
  expect(rides.assignVolunteer).toHaveBeenCalledWith(
    "ride-1",
    "user-pilot",
    "user-admin",
  );
});

// Being the chapter's admin is not being its pilot.
it("refuses someone who is not a pilot there", async () => {
  getMemberRoles.mockResolvedValue(["admin", "passenger"]);
  await expect(staffRide(RIDE, "user-admin", "user-admin")).rejects.toThrow(
    "notPilot",
  );
  expect(rides.assignVolunteer).not.toHaveBeenCalled();
});
