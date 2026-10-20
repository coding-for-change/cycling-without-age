import { requireAuth } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { cancelOwnSeat, confirmOwnSeat } from "@/use-cases/seat-confirmation";
import { cancelSeatAction, confirmSeatAction } from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => ({ user: { id: "carer-1" } })),
}));
jest.mock("@/lib/rate-limit", () => ({ withinRateLimit: jest.fn(() => true) }));
jest.mock("@/use-cases/book-event-seat", () => ({ bookEventSeats: jest.fn() }));
jest.mock("@/use-cases/seat-confirmation", () => ({
  confirmOwnSeat: jest.fn(async () => true),
  cancelOwnSeat: jest.fn(async () => true),
}));

const seat = { rideId: "ride-1", passengerId: "passenger-1" };

beforeEach(() => jest.clearAllMocks());

describe.each([
  ["confirm", confirmSeatAction, confirmOwnSeat],
  ["cancel", cancelSeatAction, cancelOwnSeat],
])("the %s answer", (_, action, useCase) => {
  it("answers for the signed-in account, never one the client names", async () => {
    await expect(action({ ...seat, userId: "someone-else" })).resolves.toEqual({
      ok: true,
      changed: true,
    });
    expect(useCase).toHaveBeenCalledWith("ride-1", "passenger-1", "carer-1");
  });

  it("refuses malformed input before asking who is signed in", async () => {
    await expect(action({ rideId: "ride-1" })).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it("slows down a flood, with room for a carer's every rider", async () => {
    await action(seat);
    expect(withinRateLimit).toHaveBeenCalledWith("seat-answer:carer-1", {
      max: 60,
      windowMs: 3_600_000,
    });
    jest.clearAllMocks();
    (withinRateLimit as jest.Mock).mockReturnValueOnce(false);
    await expect(action(seat)).resolves.toEqual({
      ok: false,
      error: "rateLimited",
    });
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each(["rideFull", "pleasureLimit", "rideClosed", "unknownPassenger"])(
    "says %s in words the page knows",
    async (code) => {
      (useCase as jest.Mock).mockRejectedValueOnce(
        new DomainError(code as "rideFull"),
      );
      await expect(action(seat)).resolves.toEqual({ ok: false, error: code });
    },
  );
});
