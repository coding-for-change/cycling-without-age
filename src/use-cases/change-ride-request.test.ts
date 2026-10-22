import { rideRequests, type RideRequestInput } from "@/features/ride-requests";
import { DomainError, domainCode } from "@/lib/domain-error";
import { changeRideRequest } from "./change-ride-request";
import { submitRideRequest } from "./submit-ride-request";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { getChangeable: jest.fn(), withdraw: jest.fn() },
}));
jest.mock("./submit-ride-request", () => ({ submitRideRequest: jest.fn() }));

const CARER = "carer";
const NOW = new Date("2026-10-05T08:00:00Z");
const INPUT = { model: "pleasure" } as unknown as RideRequestInput;

const getChangeable = rideRequests.getChangeable as jest.Mock;
const withdraw = rideRequests.withdraw as jest.Mock;
const submit = submitRideRequest as jest.Mock;

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

beforeEach(() => {
  jest.clearAllMocks();
  getChangeable.mockResolvedValue({ id: "request-old" });
  submit.mockResolvedValue({ id: "request-new", rideId: null });
  withdraw.mockResolvedValue(undefined);
});

describe("changeRideRequest", () => {
  it("checks the old request against the account before anything is sent", async () => {
    await changeRideRequest("request-old", INPUT, CARER, NOW);
    expect(getChangeable).toHaveBeenCalledWith("request-old", CARER, NOW);
  });

  it("refuses a request the account does not own, sending nothing", async () => {
    getChangeable.mockRejectedValue(new DomainError("unknownRequest"));
    expect(
      await codeOf(changeRideRequest("request-x", INPUT, CARER, NOW)),
    ).toBe("unknownRequest");
    expect(submit).not.toHaveBeenCalled();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("refuses a request that is no longer open", async () => {
    getChangeable.mockRejectedValue(new DomainError("requestNotPending"));
    expect(
      await codeOf(changeRideRequest("request-old", INPUT, CARER, NOW)),
    ).toBe("requestNotPending");
    expect(submit).not.toHaveBeenCalled();
  });

  it("sends the new request first, leaving the old one out of the limits, then withdraws the old one", async () => {
    const order: string[] = [];
    submit.mockImplementation(async () => {
      order.push("submit");
      return { id: "request-new", rideId: null };
    });
    withdraw.mockImplementation(async () => {
      order.push("withdraw");
    });
    const result = await changeRideRequest("request-old", INPUT, CARER, NOW);
    expect(order).toEqual(["submit", "withdraw"]);
    expect(submit).toHaveBeenCalledWith(INPUT, CARER, NOW, {
      replacesRequestIds: ["request-old"],
    });
    expect(withdraw).toHaveBeenCalledWith("request-old", CARER, NOW);
    expect(result).toEqual({
      id: "request-new",
      rideId: null,
      oldRequestKept: false,
    });
  });

  it("keeps the old request when the new one is refused", async () => {
    submit.mockRejectedValue(new DomainError("closedDate"));
    expect(
      await codeOf(changeRideRequest("request-old", INPUT, CARER, NOW)),
    ).toBe("closedDate");
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("keeps both and says so when the old one cannot be withdrawn", async () => {
    withdraw.mockRejectedValue(new DomainError("requestNotPending"));
    const result = await changeRideRequest("request-old", INPUT, CARER, NOW);
    expect(result).toEqual({
      id: "request-new",
      rideId: null,
      oldRequestKept: true,
    });
  });
});
