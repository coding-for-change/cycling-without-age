import type { Envelope } from "@/lib/events/catalog";
import { moveHandedOverRequests } from "@/use-cases/move-handed-over-requests";

export async function moveHandedOverRequestsListener({ event }: Envelope) {
  if (event.type !== "rider.handedOver") return;
  await moveHandedOverRequests(event);
}
