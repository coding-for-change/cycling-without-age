import type { DomainEvent, EventType } from "@/lib/events/catalog";
import { syncRideChat, syncRiderChats } from "@/use-cases/ride-chat";
import { handlers } from "../handlers";
import { syncRideChatListener, syncsRideChat } from "./sync-ride-chat";

jest.mock("@/use-cases/ride-chat", () => ({
  syncRideChat: jest.fn(),
  syncRiderChats: jest.fn(),
}));

const handedOver: DomainEvent = {
  type: "rider.handedOver",
  passengerId: "managed-greta",
  chapterId: "chapter-muenchen",
  actorUserId: "user-admin",
  fromUserId: "user-old",
  toUserId: "user-new",
  invited: false,
};

const riderBooked: DomainEvent = {
  type: "ride.riderBooked",
  rideId: "ride-1",
  chapterId: "chapter-muenchen",
  actorUserId: "user-admin",
  passengerId: "managed-greta",
  pair: null,
  requestId: null,
};

const run = (event: DomainEvent) =>
  syncRideChatListener({ id: "event-1", event });

beforeEach(() => jest.clearAllMocks());

it.each<EventType>([
  "rider.handedOver",
  "ride.pilotAssigned",
  "ride.pilotUnassigned",
  "ride.riderBooked",
  "ride.riderRemoved",
])("keeps the ride chats in step after %s", (type) => {
  expect(syncsRideChat(type)).toBe(true);
  expect(handlers[type].syncRideChat).toBe(syncRideChatListener);
});

it("leaves the chats alone for an event that changes no roster", () => {
  expect(syncsRideChat("ride.scheduled")).toBe(false);
  expect(handlers["ride.scheduled"].syncRideChat).toBeUndefined();
});

it("moves a rider handed over to the chats of every ride they are on", async () => {
  await run(handedOver);
  expect(syncRiderChats).toHaveBeenCalledWith("managed-greta");
  expect(syncRideChat).not.toHaveBeenCalled();
});

it("syncs the chat of the ride whose roster changed", async () => {
  await run(riderBooked);
  expect(syncRideChat).toHaveBeenCalledWith("ride-1");
  expect(syncRiderChats).not.toHaveBeenCalled();
});
