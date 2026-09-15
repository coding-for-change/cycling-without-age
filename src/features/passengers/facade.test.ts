import { passengers } from "@/features/passengers";
import { updatePassengerOfUser } from "@/features/passengers/services/passengers";

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
