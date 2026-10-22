import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";

export async function loadUpcomingEvents(userId: string) {
  return rides.listAnnouncedEvents(
    await passengers.listRidersOfAccount(userId),
  );
}
