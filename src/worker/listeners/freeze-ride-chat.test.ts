import { chat } from "@/features/chat";
import type { DomainEvent } from "@/lib/events/catalog";
import { freezeRideChatListener } from "@/worker/listeners/freeze-ride-chat";

jest.mock("@/features/chat", () => ({
  chat: { freezeRideConversation: jest.fn() },
}));

const freeze = chat.freezeRideConversation as jest.Mock;
const scope = {
  rideId: "ride-1",
  chapterId: "chapter-muenchen",
  actorUserId: "pilot-1",
};

const run = (event: DomainEvent) =>
  freezeRideChatListener({ id: "event-1", event });

beforeEach(() => jest.clearAllMocks());

describe("freezeRideChatListener", () => {
  it("wraps up the chat of the ride whose roster closed", async () => {
    await run({ type: "ride.completed", ...scope, riders: 3, noShows: 1 });
    expect(freeze).toHaveBeenCalledWith("ride-1");
  });

  // The job fails, so the queue tries again, and the chat never stays open.
  it("lets a failed freeze fail the job", async () => {
    freeze.mockRejectedValue(new Error("db down"));
    await expect(
      run({ type: "ride.completed", ...scope, riders: 3, noShows: 1 }),
    ).rejects.toThrow("db down");
  });

  it("leaves the chat alone for a reopened ride", async () => {
    await run({ type: "ride.reopened", ...scope });
    expect(freeze).not.toHaveBeenCalled();
  });
});
