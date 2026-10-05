import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import {
  returnWindow,
  rides,
  scheduleRideForm,
  slotWindow,
  trishawWindowQuery,
  type RideInput,
  type ScheduleRideForm,
  type TrishawWindowQuery,
} from "@/features/rides";
import { DomainError } from "@/lib/domain-error";

type Window = { startsAt: Date; endsAt: Date };

async function chapterTimeZone(chapterId: string) {
  const chapter = await chapters.getChapter(chapterId);
  if (!chapter) throw new DomainError("unknownChapter");
  return chapter.timeZone;
}

export async function scheduleRide(
  input: RideInput,
  actorUserId: string | null,
) {
  await fleet.assertUsable(input.trishawIds ?? [], input.chapterId);
  return rides.scheduleRide(input, actorUserId);
}

/**
 * The scheduling drawer speaks wall clock: a date and a start in the chapter's
 * zone, never the admin's own. A functional round trip becomes two windows,
 * the way back starting once the stay at the destination is over.
 */
export async function scheduleRideAt(
  form: ScheduleRideForm,
  actorUserId: string,
) {
  const { slot, roundTrip, stayMinutes, ...ride } =
    scheduleRideForm.parse(form);
  const outbound = slotWindow(slot, await chapterTimeZone(ride.chapterId));
  return scheduleRide(
    {
      ...ride,
      ...outbound,
      ...(ride.model === "functional"
        ? {}
        : {
            destinationName: null,
            destinationAddress: null,
            destinationLatitude: null,
            destinationLongitude: null,
          }),
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
  ride: {
    id: string;
    chapterId: string;
    trishaws: { trishaw: { id: string } }[];
  },
  trishawIds: string[],
  actorUserId: string | null,
) {
  const kept = new Set(ride.trishaws.map(({ trishaw }) => trishaw.id));
  await fleet.assertUsable(
    trishawIds.filter((id) => !kept.has(id)),
    ride.chapterId,
  );
  return rides.setRideTrishaws(ride.id, trishawIds, actorUserId);
}

/**
 * Every trishaw the chapter can reach, and whether another ride already holds
 * it for any of these windows. Pool trishaws are shared, so the rides of every
 * chapter reaching them count.
 */
async function trishawChoices(
  chapterId: string,
  windows: Window[],
  exceptRideIds: string[] = [],
) {
  const trishaws = await fleet.listTrishaws([chapterId]);
  const sharing = [...new Set(trishaws.flatMap(fleet.chapterIdsReaching))];
  const from = new Date(Math.min(...windows.map((w) => w.startsAt.getTime())));
  const to = new Date(Math.max(...windows.map((w) => w.endsAt.getTime())));
  const except = new Set(exceptRideIds);
  const overlapping = (await rides.listRidesInRange(sharing, from, to)).filter(
    (other) =>
      !except.has(other.id) &&
      other.status !== "cancelled" &&
      windows.some(
        (window) =>
          other.startsAt < window.endsAt && other.endsAt > window.startsAt,
      ),
  );
  const booked = new Set(
    overlapping.flatMap((other) => other.trishaws.map((t) => t.trishaw.id)),
  );
  return {
    trishaws,
    busy: Object.fromEntries(trishaws.map((t) => [t.id, booked.has(t.id)])),
  };
}

export async function allocationChoices(rideId: string) {
  const ride = await rides.getRide(rideId);
  if (!ride) return null;
  return { ride, ...(await trishawChoices(ride.chapterId, [ride], [ride.id])) };
}

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
