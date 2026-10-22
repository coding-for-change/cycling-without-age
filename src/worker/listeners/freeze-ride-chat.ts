import { chat } from "@/features/chat";
import type { Envelope } from "@/lib/events/catalog";
import { freezeCancelledEventChat } from "@/use-cases/ride-chat";

export async function freezeRideChatListener({ event }: Envelope) {
  if (event.type === "ride.completed")
    await chat.freezeRideConversation(event.rideId);
  if (event.type === "ride.cancelled")
    await freezeCancelledEventChat(event.rideId);
}
