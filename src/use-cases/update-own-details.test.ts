import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { updateOwnDetails } from "@/use-cases/update-own-details";

jest.mock("@/features/passengers", () => ({
  passengers: { updateOwnRiderDetails: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { updateOwnDetails: jest.fn() },
}));

const updateAccount = profile.updateOwnDetails as jest.Mock;
const updateRider = passengers.updateOwnRiderDetails as jest.Mock;

const USER = "user-pernille";
const BIRTH_DATE = new Date("1948-04-02");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("updateOwnDetails", () => {
  it("keeps a name edit on the account", async () => {
    await updateOwnDetails(USER, { name: "Pernille Holm" });

    expect(updateAccount).toHaveBeenCalledWith(USER, {
      name: "Pernille Holm",
    });
    expect(updateRider).not.toHaveBeenCalled();
  });

  // The rider row carries its own copy of these two, so an edit has to land twice.
  it("mirrors a birth date onto the rider row", async () => {
    await updateOwnDetails(USER, { birthDate: BIRTH_DATE });

    expect(updateAccount).toHaveBeenCalledWith(USER, {
      birthDate: BIRTH_DATE,
    });
    expect(updateRider).toHaveBeenCalledWith(USER, {
      birthDate: BIRTH_DATE,
      gender: undefined,
    });
  });

  it("mirrors a gender edit and carries both fields when both change", async () => {
    await updateOwnDetails(USER, { gender: "female" });
    expect(updateRider).toHaveBeenCalledWith(USER, {
      birthDate: undefined,
      gender: "female",
    });

    await updateOwnDetails(USER, { birthDate: BIRTH_DATE, gender: "male" });
    expect(updateRider).toHaveBeenLastCalledWith(USER, {
      birthDate: BIRTH_DATE,
      gender: "male",
    });
  });

  // The rider row is a mirror: it is only worth writing once the account took it.
  it("writes the account before the rider row", async () => {
    await updateOwnDetails(USER, { gender: "other" });

    expect(updateAccount.mock.invocationCallOrder[0]).toBeLessThan(
      updateRider.mock.invocationCallOrder[0],
    );
  });

  it("does not swallow a failed account write", async () => {
    updateAccount.mockRejectedValueOnce(new Error("db down"));

    await expect(
      updateOwnDetails(USER, { gender: "female" }),
    ).rejects.toThrow();
    expect(updateRider).not.toHaveBeenCalled();
  });
});
