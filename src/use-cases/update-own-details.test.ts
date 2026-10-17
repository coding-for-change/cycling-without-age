import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { updateOwnDetails } from "@/use-cases/update-own-details";

jest.mock("@/features/passengers", () => ({
  passengers: { updateOwnRiderDetails: jest.fn(), getOwnPassenger: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { updateOwnDetails: jest.fn(), getProfile: jest.fn() },
}));

const updateAccount = profile.updateOwnDetails as jest.Mock;
const updateRider = passengers.updateOwnRiderDetails as jest.Mock;
const ownRider = passengers.getOwnPassenger as jest.Mock;
const account = profile.getProfile as jest.Mock;

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

  it("puts a first name together with the last name the rider row holds", async () => {
    ownRider.mockResolvedValue({ firstName: "Pernille", lastName: "Holm" });

    await updateOwnDetails(USER, { firstName: "Nille" });

    expect(updateAccount).toHaveBeenCalledWith(USER, { name: "Nille Holm" });
    expect(updateRider).toHaveBeenCalledWith(USER, {
      firstName: "Nille",
      lastName: "Holm",
    });
  });

  it("splits the account name when there is no rider row to read", async () => {
    ownRider.mockResolvedValue(null);
    account.mockResolvedValue({ name: "Pernille Marie Holm" });

    await updateOwnDetails(USER, { lastName: "Jensen" });

    expect(updateAccount).toHaveBeenCalledWith(USER, {
      name: "Pernille Marie Jensen",
    });
  });
});
