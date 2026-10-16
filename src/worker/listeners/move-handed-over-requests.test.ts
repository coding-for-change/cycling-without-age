import { rideRequests } from "@/features/ride-requests";
import type { DomainEvent } from "@/lib/events/catalog";
import { handlers } from "../handlers";
import { moveHandedOverRequestsListener } from "./move-handed-over-requests";

jest.mock("@/features/ride-requests", () => ({
  rideRequests: { handOverOpenRequests: jest.fn() },
}));

const handOverOpenRequests = rideRequests.handOverOpenRequests as jest.Mock;

const handedOver: DomainEvent = {
  type: "rider.handedOver",
  passengerId: "managed-greta",
  chapterId: "chapter-muenchen",
  actorUserId: "user-admin",
  fromUserId: "user-old",
  toUserId: "user-new",
  invited: false,
};

const run = (event: DomainEvent) =>
  moveHandedOverRequestsListener({ id: "event-1", event });

beforeEach(() => jest.clearAllMocks());

it("moves the rider's open requests from the old manager to the new one", async () => {
  await run(handedOver);
  expect(handOverOpenRequests).toHaveBeenCalledWith(
    "managed-greta",
    "user-old",
    "user-new",
  );
});

it("lets a failure through, so the job is retried", async () => {
  handOverOpenRequests.mockRejectedValueOnce(new Error("connection lost"));
  await expect(run(handedOver)).rejects.toThrow("connection lost");
});

it("listens to hand-overs only", () => {
  expect(handlers["rider.handedOver"].moveRequests).toBe(
    moveHandedOverRequestsListener,
  );
  expect(handlers["ride.scheduled"].moveRequests).toBeUndefined();
});
