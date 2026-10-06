import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import {
  returnWindow,
  rides,
  slotWindow,
  trishawWindowQuery,
  type RideScope,
  type ScheduleRideData,
  type TrishawWindowQuery,
} from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

type Window = { startsAt: Date; endsAt: Date };

async function chapterTimeZone(chapterId: string) {
  const chapter = await chapters.getChapter(chapterId);
  if (!chapter) throw new DomainError("unknownChapter");
  return chapter.timeZone;
}

async function assertRiders(passengerIds: string[], chapterId: string) {
  const found = await passengers.getPassengers(passengerIds);
  if (found.length !== passengerIds.length)
    throw new DomainError("unknownPassenger");
  if (found.some((passenger) => passenger.chapterId !== chapterId))
    throw new DomainError("riderNotInChapter");
}

async function assertPilots(userIds: string[], chapterId: string) {
  const roles = await membership.getMembersRoles(userIds, chapterId);
  if (userIds.some((userId) => !roles.get(userId)?.includes("pilot")))
    throw new DomainError("notPilot");
}

/**
 * The scheduling drawer speaks wall clock: a date and a start in the chapter's
 * zone, never the admin's own. A functional round trip becomes two windows,
 * the way back starting once the stay at the destination is over.
 */
export async function scheduleRideAt(
  form: ScheduleRideData,
  actorUserId: string | null,
) {
  const { slot, roundTrip, stayMinutes, ...ride } = form;
  const timeZone = await chapterTimeZone(ride.chapterId);
  await Promise.all([
    fleet.assertUsable(ride.trishawIds, ride.chapterId),
    assertRiders(ride.passengerIds, ride.chapterId),
    assertPilots(ride.pilotIds, ride.chapterId),
  ]);
  const outbound = slotWindow(slot, timeZone);
  return rides.scheduleRide(
    {
      ...ride,
      ...outbound,
      returnLeg:
        roundTrip && ride.model === "functional"
          ? returnWindow(outbound, stayMinutes)
          : undefined,
    },
    actorUserId,
  );
}

/**
 * Keeping a trishaw that was grounded after it was allocated is allowed — the
 * ride shows the warning — but allocating one that is grounded now is not.
 */
export async function allocateTrishaws(
  ride: RideScope,
  trishawIds: string[],
  actorUserId: string | null,
) {
  const kept = new Set(ride.trishawIds);
  await fleet.assertUsable(
    trishawIds.filter((id) => !kept.has(id)),
    ride.chapterId,
  );
  return rides.setRideTrishaws(ride.id, trishawIds, actorUserId);
}

/**
 * Every trishaw the chapter can reach, and whether another ride already holds
 * it for any of these windows.
 */
async function trishawChoices(
  chapterId: string,
  windows: Window[],
  exceptRideIds: string[] = [],
) {
  const trishaws = await fleet.listTrishaws([chapterId]);
  const booked = await rides.bookedTrishawIds(
    trishaws.map((trishaw) => trishaw.id),
    windows,
    exceptRideIds,
  );
  return {
    trishaws,
    busy: Object.fromEntries(trishaws.map((t) => [t.id, booked.has(t.id)])),
  };
}

export const trishawChoicesForRide = (
  ride: Window & { id: string; chapterId: string },
) => trishawChoices(ride.chapterId, [ride], [ride.id]);

/** What the scheduling drawer offers while the admin is still picking a time. */
export async function freeTrishawsInWindow(query: TrishawWindowQuery) {
  const { chapterId, slot, roundTrip, stayMinutes } =
    trishawWindowQuery.parse(query);
  const outbound = slotWindow(slot, await chapterTimeZone(chapterId));
  return trishawChoices(chapterId, [
    outbound,
    ...(roundTrip ? [returnWindow(outbound, stayMinutes)] : []),
  ]);
}
