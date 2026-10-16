import type { Envelope, EventType } from "@/lib/events/catalog";
import { syncRideChat, syncRiderChats } from "@/use-cases/ride-chat";

const ROSTER_CHANGES: readonly EventType[] = [
  "ride.pilotAssigned",
  "ride.pilotUnassigned",
  "ride.riderBooked",
  "ride.riderRemoved",
  "rider.handedOver",
];

export const syncsRideChat = (type: EventType) => ROSTER_CHANGES.includes(type);

export async function syncRideChatListener({ event }: Envelope) {
  if (event.type === "rider.handedOver")
    return syncRiderChats(event.passengerId);
  if (!("rideId" in event)) return;
  await syncRideChat(event.rideId);
}
