import { chat } from "@/features/chat";
import { rides } from "@/features/rides";
import { logger } from "@/lib/observability/logger";
import { completeRide } from "./complete-ride";

jest.mock("@/features/chat", () => ({
  chat: { freezeRideConversation: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { closeRoster: jest.fn() },
}));
jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));

const NOW = new Date("2026-10-16T12:00:00Z");
const closeRoster = rides.closeRoster as jest.Mock;
const freeze = chat.freezeRideConversation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  closeRoster.mockResolvedValue({ riders: 3, noShows: 1 });
  freeze.mockResolvedValue("conversation-1");
});

describe("completeRide", () => {
  it("closes the roster, then freezes the ride's chat", async () => {
    expect(await completeRide("ride-1", "pilot-1", "pilot", NOW)).toEqual({
      riders: 3,
      noShows: 1,
    });
    expect(closeRoster).toHaveBeenCalledWith("ride-1", "pilot-1", "pilot", NOW);
    expect(freeze).toHaveBeenCalledWith("ride-1");
    expect(closeRoster.mock.invocationCallOrder[0]).toBeLessThan(
      freeze.mock.invocationCallOrder[0],
    );
  });

  it("freezes nothing when the roster could not close", async () => {
    closeRoster.mockRejectedValue(new Error("rideNotStarted"));
    await expect(
      completeRide("ride-1", "pilot-1", "pilot", NOW),
    ).rejects.toThrow("rideNotStarted");
    expect(freeze).not.toHaveBeenCalled();
  });

  // The statistics moment stands even if the chat does not wrap up.
  it("keeps the closed roster when the chat fails to freeze", async () => {
    freeze.mockRejectedValue(new Error("redis down"));
    expect(await completeRide("ride-1", "admin-1", "admin", NOW)).toEqual({
      riders: 3,
      noShows: 1,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ ride_id: "ride-1" }),
      "ride chat freeze failed",
    );
  });

  // Its people may have kept chatting since the roster closed.
  it("leaves the chat alone on a second tap", async () => {
    closeRoster.mockResolvedValue(null);
    expect(await completeRide("ride-1", "pilot-1", "pilot", NOW)).toBeNull();
    expect(freeze).not.toHaveBeenCalled();
  });
});
