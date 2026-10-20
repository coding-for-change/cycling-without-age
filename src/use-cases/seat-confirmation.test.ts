import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { cancelOwnSeat, confirmOwnSeat } from "./seat-confirmation";

jest.mock("@/features/passengers", () => ({
  passengers: { listRidersOfAccount: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { confirmSeat: jest.fn(), cancelSeat: jest.fn() },
}));

const listRidersOfAccount = passengers.listRidersOfAccount as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  listRidersOfAccount.mockResolvedValue([{ id: "erna" }, { id: "self" }]);
  (rides.confirmSeat as jest.Mock).mockResolvedValue(true);
  (rides.cancelSeat as jest.Mock).mockResolvedValue(true);
});

describe("answering for a seat", () => {
  it("confirms a seat of a rider this account books for", async () => {
    expect(await confirmOwnSeat("ride-1", "erna", "carer-1")).toBe(true);
    expect(listRidersOfAccount).toHaveBeenCalledWith("carer-1");
    expect(rides.confirmSeat).toHaveBeenCalledWith("ride-1", "erna", "carer-1");
  });

  it("gives up the account's own seat", async () => {
    await cancelOwnSeat("ride-1", "self", "carer-1");
    expect(rides.cancelSeat).toHaveBeenCalledWith("ride-1", "self", "carer-1");
  });

  // Another family's rider on the same ride is not this account's to answer for.
  it("refuses a rider the account does not book for", async () => {
    const run = cancelOwnSeat("ride-1", "someone-else", "carer-1");
    await expect(run).rejects.toThrow();
    expect(domainCode(await run.catch((error) => error))).toBe(
      "unknownPassenger",
    );
    expect(rides.cancelSeat).not.toHaveBeenCalled();
  });

  it("confirms nothing for a rider the account does not book for", async () => {
    const refused = await confirmOwnSeat(
      "ride-1",
      "someone-else",
      "carer-1",
    ).catch((error) => error);
    expect(domainCode(refused)).toBe("unknownPassenger");
    expect(rides.confirmSeat).not.toHaveBeenCalled();
  });
});
