import { passengers } from "@/features/passengers";
import {
  findPassengersManagedBy,
  insertPassenger,
  updatePassengerOfUser,
} from "@/features/passengers/services/passengers";

jest.mock("@/features/passengers/services/passengers", () => ({
  countPassengersManagedBy: jest.fn(),
  findPassengerOfUser: jest.fn(),
  findPassengersManagedBy: jest.fn(),
  findPassengersOfChapters: jest.fn(),
  insertPassenger: jest.fn(),
  updatePassengerOfUser: jest.fn(),
  upsertOwnPassenger: jest.fn(),
}));

const updateRow = updatePassengerOfUser as jest.Mock;

const USER = "user-pernille";

beforeEach(() => {
  jest.clearAllMocks();
  updateRow.mockResolvedValue({ count: 1 });
});

describe("updateOwnRiderDetails", () => {
  it("writes the patch onto the rider row this account books with", async () => {
    await passengers.updateOwnRiderDetails(USER, { gender: "female" });

    expect(updateRow).toHaveBeenCalledWith(USER, { gender: "female" });
  });

  it("coerces an ISO date string and carries both fields through", async () => {
    await passengers.updateOwnRiderDetails(USER, {
      birthDate: "1948-04-02",
      gender: "male",
    });

    expect(updateRow).toHaveBeenCalledWith(USER, {
      birthDate: new Date("1948-04-02"),
      gender: "male",
    });
  });

  it("writes nothing when the patch carries neither field", async () => {
    await expect(passengers.updateOwnRiderDetails(USER, {})).resolves.toEqual({
      count: 0,
    });
    await passengers.updateOwnRiderDetails(USER, {
      birthDate: undefined,
      gender: undefined,
    });

    expect(updateRow).not.toHaveBeenCalled();
  });

  it("refuses a birth date outside the plausible range", async () => {
    await expect(
      passengers.updateOwnRiderDetails(USER, { birthDate: "1899-04-02" }),
    ).rejects.toThrow();
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe("addPassenger", () => {
  it("writes the rider's needs in the same insert as the rider", async () => {
    (findPassengersManagedBy as jest.Mock).mockResolvedValue([]);

    await passengers.addPassenger(
      {
        chapterId: "chapter-aarhus",
        managedByUserId: USER,
        userId: null,
        firstName: "Pernille",
        lastName: "Holm",
        birthDate: new Date("1948-04-02"),
        gender: "female",
      },
      { needsWheelchairBike: true, note: "  ", rideLocationId: "loc-1" },
    );

    expect(insertPassenger).toHaveBeenCalledTimes(1);
    expect(insertPassenger).toHaveBeenCalledWith(
      expect.objectContaining({
        needsWheelchairBike: true,
        note: null,
        rideLocationId: "loc-1",
      }),
    );
  });
});
