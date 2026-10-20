import { chat } from "@/features/chat";
import type { Envelope } from "@/lib/events/catalog";

export async function freezeRideChatListener({ event }: Envelope) {
  if (event.type === "ride.completed")
    await chat.freezeRideConversation(event.rideId);
}
