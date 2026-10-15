import { rideRequests } from "@/features/ride-requests";
import { DomainError } from "@/lib/domain-error";
import type { DomainEvent } from "@/lib/events/catalog";
import { linkRideRequestListener } from "./link-ride-request";

jest.mock("@/features/ride-requests", () => ({
  rideRequests: { markScheduled: jest.fn() },
}));

const markScheduled = rideRequests.markScheduled as jest.Mock;

const scheduled = (requestId: string | null): DomainEvent => ({
  type: "ride.scheduled",
  rideId: "ride-1",
  chapterId: "chapter-muenchen",
  actorUserId: "user-admin",
  returnLegId: "ride-2",
  requestId,
});

const run = (event: DomainEvent) =>
  linkRideRequestListener({ id: "event-1", event });

beforeEach(() => jest.clearAllMocks());

it("links the request a ride was scheduled from", async () => {
  await run(scheduled("request-1"));
  expect(markScheduled).toHaveBeenCalledWith(
    "request-1",
    { id: "ride-1", returnLegId: "ride-2" },
    "user-admin",
  );
});

it("leaves a ride scheduled without a request alone", async () => {
  await run(scheduled(null));
  expect(markScheduled).not.toHaveBeenCalled();
});

it("has nothing to do for a request handed back or decided otherwise", async () => {
  markScheduled.mockRejectedValueOnce(new DomainError("requestNotPending"));
  await expect(run(scheduled("request-1"))).resolves.toBeUndefined();
});

it("lets anything else fail, so the job is retried", async () => {
  markScheduled.mockRejectedValueOnce(new Error("connection lost"));
  await expect(run(scheduled("request-1"))).rejects.toThrow("connection lost");
});
