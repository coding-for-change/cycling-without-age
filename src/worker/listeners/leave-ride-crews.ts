import type { Envelope } from "@/lib/events/catalog";
import { leaveRideCrews } from "@/use-cases/leave-ride-crews";

export async function leaveRideCrewsListener({ event }: Envelope) {
  if (event.type === "member.roleChanged") await leaveRideCrews(event);
}
