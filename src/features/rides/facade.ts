import { DomainError } from "@/lib/domain-error";
import {
  rideInput,
  trishawInput,
  type RideInput,
  type RideRole,
  type TrishawInput,
} from "./schemas";
import {
  countRosterEntries,
  deleteAssignment,
  deleteRosterEntry,
  findRideById,
  findRidesForPassengers,
  findRidesForPilot,
  findRidesInRange,
  insertRideReserving,
  updateRideById,
  updateRideReserving,
  upsertAssignment,
  upsertRosterEntry,
  type PilotRideRow,
  type RideCalendarRow,
} from "./services/rides";
import {
  findTrishawById,
  findTrishawsOfChapters,
  insertTrishaw,
  updateTrishawById,
  type TrishawRow,
} from "./services/trishaws";

export type { PilotRideRow, RideCalendarRow, TrishawRow };

export const listRidesInRange = (chapterIds: string[], from: Date, to: Date) =>
  chapterIds.length
    ? findRidesInRange(chapterIds, from, to)
    : Promise.resolve([]);

export const listRidesForPilot = (userId: string, from: Date, to: Date) =>
  findRidesForPilot(userId, from, to);

export const listRidesForPassengers = (
  passengerIds: string[],
  from: Date,
  to: Date,
) =>
  passengerIds.length
    ? findRidesForPassengers(passengerIds, from, to)
    : Promise.resolve([]);

export const getRide = (id: string) => findRideById(id);

export const listTrishaws = (chapterIds: string[]) =>
  chapterIds.length ? findTrishawsOfChapters(chapterIds) : Promise.resolve([]);

/**
 * Scheduling commits the equipment: lifecycle phase 2C reserves the trishaw for
 * the ride's window, after which it is "no longer available to others". A
 * cancelled ride releases it, which is why cancelled rides are excluded from the
 * conflict query rather than filtered here.
 */
/**
 * A chapter may schedule a trishaw it owns, and one parked at a storage site it
 * shares — a care home or depot can serve several chapters, and the bike lives
 * at the place rather than at the chapter. Ownership is still its own column,
 * because who bought the bike and who reports on it does not change because it
 * is parked somewhere shared.
 */
function reachableFrom(trishaw: TrishawRow, chapterId: string) {
  if (trishaw.chapterId === chapterId) return true;
  return (trishaw.storageLocation?.chapters ?? []).some(
    (link) => link.chapterId === chapterId,
  );
}

/**
 * Which chapters can reach a trishaw and whether it is roadworthy are stable
 * facts, so they are checked here. Whether its window is free is not — that
 * check has to happen inside the write's own transaction, or two schedulers
 * both pass it. See `insertRideReserving`.
 */
async function assertTrishawsUsable(trishawIds: string[], chapterId: string) {
  for (const trishawId of trishawIds) {
    const trishaw = await findTrishawById(trishawId);
    if (!trishaw) throw new DomainError("unknownTrishaw");
    if (!reachableFrom(trishaw, chapterId))
      throw new DomainError("trishawNotInChapter");
    if (trishaw.status !== "active")
      throw new DomainError("trishawUnavailable");
  }
}

export async function scheduleRide(input: RideInput) {
  const { trishawIds, ...data } = rideInput.parse(input);
  await assertTrishawsUsable(trishawIds, data.chapterId);
  const ride = await insertRideReserving(
    data,
    trishawIds,
    data.startsAt,
    data.endsAt,
  );
  if (!ride) throw new DomainError("trishawReserved");
  return ride;
}

export async function rescheduleRide(id: string, input: RideInput) {
  const existing = await findRideById(id);
  if (!existing) throw new DomainError("unknownRide");
  const { trishawIds, ...data } = rideInput.parse(input);
  await assertTrishawsUsable(trishawIds, data.chapterId);
  const ride = await updateRideReserving(
    id,
    data,
    trishawIds,
    data.startsAt,
    data.endsAt,
  );
  if (!ride) throw new DomainError("trishawReserved");
  return ride;
}

/**
 * Cancelling keeps the ride on the calendar — the glossary is explicit that a
 * cancellation "does not automatically remove the event from the Chapter
 * Operating Calendar" — but it does release the trishaw for the window.
 */
export async function cancelRide(id: string, reason?: string | null) {
  const existing = await findRideById(id);
  if (!existing) throw new DomainError("unknownRide");
  return updateRideById(id, {
    status: "cancelled",
    cancelledAt: new Date(),
    cancellationReason: reason?.trim() || null,
  });
}

export async function addTrishaw(input: TrishawInput) {
  const data = trishawInput.parse(input);
  return insertTrishaw({ ...data, type: data.type ?? null });
}

export async function setTrishawStatus(
  id: string,
  status: TrishawInput["status"],
) {
  const trishaw = await findTrishawById(id);
  if (!trishaw) throw new DomainError("unknownTrishaw");
  return updateTrishawById(id, { status });
}

/** Lifecycle phase 3 — a volunteer commits to a role on this ride. */
export async function assignVolunteer(
  rideId: string,
  userId: string,
  role: RideRole = "pilot",
) {
  if (!(await findRideById(rideId))) throw new DomainError("unknownRide");
  return upsertAssignment(rideId, userId, role);
}

export async function unassignVolunteer(
  rideId: string,
  userId: string,
  role: RideRole = "pilot",
) {
  return deleteAssignment(rideId, userId, role);
}

/**
 * Lifecycle phase 4 — a rider joins the Ride Roster. Two riders on one trip are
 * two rides for every statistic, so the roster is the counting unit.
 */
export async function bookRider(rideId: string, passengerId: string) {
  if (!(await findRideById(rideId))) throw new DomainError("unknownRide");
  const position = await countRosterEntries(rideId);
  return upsertRosterEntry(rideId, passengerId, position);
}

export const cancelBooking = (rideId: string, passengerId: string) =>
  deleteRosterEntry(rideId, passengerId);
