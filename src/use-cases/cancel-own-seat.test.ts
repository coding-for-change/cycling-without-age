import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { cancelOwnSeat } from "./cancel-own-seat";

jest.mock("@/features/passengers", () => ({
  passengers: { listRidersOfAccount: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { cancelSeat: jest.fn() },
}));

const listRidersOfAccount = passengers.listRidersOfAccount as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  listRidersOfAccount.mockResolvedValue([{ id: "erna" }, { id: "self" }]);
  (rides.cancelSeat as jest.Mock).mockResolvedValue(true);
});

describe("giving up a seat", () => {
  it("gives up a seat of a rider this account books for", async () => {
    expect(await cancelOwnSeat("ride-1", "erna", "carer-1")).toBe(true);
    expect(listRidersOfAccount).toHaveBeenCalledWith("carer-1");
    expect(rides.cancelSeat).toHaveBeenCalledWith("ride-1", "erna", "carer-1");
  });

  it("gives up the account's own seat", async () => {
    await cancelOwnSeat("ride-1", "self", "carer-1");
    expect(rides.cancelSeat).toHaveBeenCalledWith("ride-1", "self", "carer-1");
  });

  it("refuses a rider the account does not book for", async () => {
    const run = cancelOwnSeat("ride-1", "someone-else", "carer-1");
    await expect(run).rejects.toThrow();
    expect(domainCode(await run.catch((error) => error))).toBe(
      "unknownPassenger",
    );
    expect(rides.cancelSeat).not.toHaveBeenCalled();
  });
});
