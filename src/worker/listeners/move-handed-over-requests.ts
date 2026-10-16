import type { Envelope } from "@/lib/events/catalog";
import { moveHandedOverRequests } from "@/use-cases/hand-over-rider";

export async function moveHandedOverRequestsListener({ event }: Envelope) {
  if (event.type !== "rider.handedOver") return;
  await moveHandedOverRequests(event);
}
