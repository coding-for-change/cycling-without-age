import {
  MAX_MANAGED_RIDERS,
  managedRiderInput,
  managedRiderPatch,
  newManagedRiderInput,
  ownRiderDetailsPatch,
  passengerInput,
  riderNeedsInput,
} from "./schemas";
import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type {
  ManagedRiderInput,
  ManagedRiderPatchInput,
  NewManagedRiderInput,
  OwnRiderDetailsPatchInput,
  PassengerInput,
  RiderNeedsInput,
} from "./schemas";
import {
  findBookingAccountsOfChapters,
  countPassengersInChapters,
  countPassengersManagedBy,
  countRosterEntriesOf,
  deletePassengerWithoutAccount,
  findPassengerById,
  findPassengerOfUser,
  findPassengersOfUsers,
  findPassengersByIds,
  findPassengersManagedBy,
  findPassengersOfAccount,
  findPassengersOfChapters,
  findPassengerNames,
  findPassengersWithOtherAccountManagedBy,
  insertPassenger,
  insertPassengers,
  closeCareRequest,
  declinePendingCareLinks,
  findCareRequest,
  findCareRequestPreview,
  findPendingCareLinks,
  findPendingCareRequest,
  linkPassengerManager,
  findPendingCareRequestsOfChapters,
  findInvitedRidersOfChapters,
  insertCareRequest,
  insertPassengerIn,
  deletePassengerOfUser,
  deletePassengersWithoutAccountManagedBy,
  moveRiderToManager,
  setPassengerManagers,
  updatePassengerNeeds,
  updatePassengerOfUser,
  updatePassengerWithoutAccount,
  upsertOwnPassenger,
} from "./services/passengers";

export const getOwnPassenger = (userId: string) => findPassengerOfUser(userId);
export const getPassenger = (id: string) => findPassengerById(id);
export const getPassengers = async (ids: string[]) =>
  ids.length ? findPassengersByIds(ids) : [];
/**
 * Every rider whose rides this account may read: the ones it manages, and
 * its own rider row when someone else manages it — a resident whose carer
 * books for them still sees their own rides.
 */
export const listRidersOfAccount = (userId: string) =>
  findPassengersOfAccount(userId);

export const listPassengersManagedBy = (userId: string) =>
  findPassengersManagedBy(userId);
export const listPassengersOfChapters = (chapterIds: string[]) =>
  findPassengersOfChapters(chapterIds);

/**
 * The accounts that book for these chapters' riders: whoever manages a rider,
 * which is the rider's own account when it books for itself.
 */
export const listBookingAccountsOfChapters = async (chapterIds: string[]) =>
  chapterIds.length
    ? (await findBookingAccountsOfChapters(chapterIds)).map(
        (rider) => rider.managedByUserId,
      )
    : [];

export type PassengerRow = Awaited<
  ReturnType<typeof findPassengersOfChapters>
>[number];

export const othersOf = <Rider extends { userId: string | null }>(
  riders: Rider[],
) => riders.filter((rider) => rider.userId === null);

async function assertCanTakeOn(
  caretakerUserId: string,
  chapterId: string,
  adding: number,
) {
  const managed = await findPassengersManagedBy(caretakerUserId);
  if (managed.some((rider) => rider.chapterId !== chapterId))
    throw new DomainError("passengerChapterMismatch");
  if (othersOf(managed).length + adding > MAX_MANAGED_RIDERS)
    throw new DomainError("tooManyRiders");
}

export async function addPassenger(
  input: PassengerInput,
  needs: RiderNeedsInput = {},
) {
  const data = passengerInput.parse(input);
  const riderNeeds = riderNeedsInput.parse(needs);
  const [existing] = await findPassengersManagedBy(data.managedByUserId);
  if (existing && existing.chapterId !== data.chapterId) {
    throw new DomainError("passengerChapterMismatch");
  }
  if (data.userId && (await findPassengerOfUser(data.userId))) {
    throw new DomainError("alreadyHasPassenger");
  }
  const { pickup, ...rider } = data;
  return insertPassenger({
    ...rider,
    ...riderNeeds,
    userId: rider.userId ?? null,
    ...pickupColumns(pickup),
  });
}

const pickupColumns = (pickup: PassengerInput["pickup"]) =>
  !pickup
    ? {}
    : pickup.residence === "careHome"
      ? {
          residence: "careHome" as const,
          address: null,
          latitude: null,
          longitude: null,
        }
      : {
          residence: "home" as const,
          address: pickup.address,
          latitude: pickup.latitude,
          longitude: pickup.longitude,
        };

export async function addManagedPassengers(
  managedByUserId: string,
  chapterId: string,
  riders: NewManagedRiderInput[],
) {
  const data = riders.map((rider) => {
    const { needs, ...details } = newManagedRiderInput.parse(rider);
    return {
      rider: passengerInput.parse({
        ...details,
        managedByUserId,
        chapterId,
        userId: null,
      }),
      needs: riderNeedsInput.parse(needs ?? {}),
    };
  });
  await assertCanTakeOn(managedByUserId, chapterId, data.length);
  return insertPassengers(
    data.map(({ rider: { pickup, ...rider }, needs }) => ({
      ...rider,
      ...needs,
      userId: null,
      ...pickupColumns(pickup),
    })),
  );
}

export const countPassengers = (userId: string) =>
  countPassengersManagedBy(userId);

export async function saveOwnPassenger(input: PassengerInput) {
  const data = passengerInput.parse(input);
  if (!data.userId) throw new DomainError("notOwnAccount");

  const existing = await findPassengerOfUser(data.userId);
  if (!existing) return addPassenger(data);

  const { userId, firstName, lastName, birthDate, gender } = data;
  return upsertOwnPassenger(userId, {
    firstName,
    lastName,
    birthDate,
    gender,
    chapterId: existing.chapterId,
    managedByUserId: existing.managedByUserId,
  });
}

export async function updateOwnRiderDetails(
  userId: string,
  patch: OwnRiderDetailsPatchInput,
) {
  const { birthDate, gender } = ownRiderDetailsPatch.parse(patch);
  const data = {
    ...(birthDate === undefined ? {} : { birthDate }),
    ...(gender === undefined ? {} : { gender }),
  };
  if (Object.keys(data).length === 0) return { count: 0 };
  return updatePassengerOfUser(userId, data);
}

export async function updateManagedRider(
  passengerId: string,
  patch: ManagedRiderPatchInput,
) {
  const { firstName, lastName, birthDate, gender, pickup } =
    managedRiderPatch.parse(patch);
  const data = {
    ...(firstName === undefined ? {} : { firstName }),
    ...(lastName === undefined ? {} : { lastName }),
    ...(birthDate === undefined ? {} : { birthDate }),
    ...(gender === undefined ? {} : { gender }),
    ...pickupColumns(pickup),
  };
  if (Object.keys(data).length === 0) return;
  const { count } = await updatePassengerWithoutAccount(passengerId, data);
  if (count === 0) throw new DomainError("unknownPassenger");
}

export async function removeManagedRider(passengerId: string) {
  const { count } = await deletePassengerWithoutAccount(passengerId);
  if (count === 0) throw new DomainError("unknownPassenger");
}

export const countRiderBookings = (passengerId: string) =>
  countRosterEntriesOf(passengerId);

export async function removeOwnPassenger(userId: string) {
  const own = await findPassengerOfUser(userId);
  if (own) await declinePendingCareLinks(own.id);
  return deletePassengerOfUser(userId);
}

export async function handRidersToTheirOwnAccounts(managedByUserId: string) {
  const riders = await findPassengersWithOtherAccountManagedBy(managedByUserId);
  const changes = riders.flatMap((rider) =>
    rider.userId ? [{ id: rider.id, managedByUserId: rider.userId }] : [],
  );
  if (changes.length) await setPassengerManagers(changes);
  return changes.length;
}

/**
 * Moves a rider without an account of their own to another manager, who must
 * be able to take them on (same chapter, room for one more). Bookings, the
 * profile and the ride history stay with the rider.
 */
export async function handOverRider(
  passengerId: string,
  toUserId: string,
  actorUserId: string,
  { invited = false }: { invited?: boolean } = {},
) {
  const rider = await findPassengerById(passengerId);
  if (!rider || rider.userId) throw new DomainError("unknownPassenger");
  if (rider.managedByUserId === toUserId) throw new DomainError("sameManager");
  await assertCanTakeOn(toUserId, rider.chapterId, 1);
  return transaction(async (tx, emit) => {
    const { count } = await moveRiderToManager(
      passengerId,
      rider.managedByUserId,
      toUserId,
      tx,
    );
    if (count !== 1) throw new DomainError("unknownPassenger");
    await emit({
      type: "rider.handedOver",
      passengerId,
      chapterId: rider.chapterId,
      actorUserId,
      fromUserId: rider.managedByUserId,
      toUserId,
      invited,
    });
    return { chapterId: rider.chapterId, fromUserId: rider.managedByUserId };
  });
}

/** Removes, on purpose, the riders without an account this account looks after. */
export const removeRidersWithoutAccount = (
  managedByUserId: string,
  ids: string[],
) => deletePassengersWithoutAccountManagedBy(managedByUserId, ids);

export const countPassengersOfChapters = async (chapterIds: string[]) =>
  chapterIds.length ? countPassengersInChapters(chapterIds) : 0;

export const passengerNames = async (
  ids: string[],
): Promise<Record<string, string>> =>
  ids.length
    ? Object.fromEntries(
        (await findPassengerNames(ids)).map((p) => [
          p.id,
          `${p.firstName} ${p.lastName}`.trim(),
        ]),
      )
    : {};

export async function setRiderNeeds(
  passengerId: string,
  input: RiderNeedsInput,
) {
  const data = riderNeedsInput.parse(input);
  if (Object.keys(data).length === 0) return null;
  return updatePassengerNeeds(passengerId, data);
}

export async function getOwnRiderNeeds(userId: string) {
  const own = await findPassengerOfUser(userId);
  if (!own) return null;
  return { needsWheelchairBike: own.needsWheelchairBike, note: own.note };
}

export type OwnRiderNeeds = NonNullable<
  Awaited<ReturnType<typeof getOwnRiderNeeds>>
>;

export async function setOwnRiderNeeds(userId: string, input: RiderNeedsInput) {
  const own = await findPassengerOfUser(userId);
  if (!own) throw new DomainError("notFound");
  await setRiderNeeds(own.id, input);
}

async function riderManagedBy(passengerId: string, managerUserId: string) {
  const rider = (await findPassengersManagedBy(managerUserId)).find(
    (candidate) =>
      candidate.id === passengerId && candidate.userId !== managerUserId,
  );
  if (!rider) throw new DomainError("unknownPassenger");
  return rider;
}

export async function getManagedRiderNeeds(
  passengerId: string,
  managerUserId: string,
) {
  const rider = await riderManagedBy(passengerId, managerUserId);
  return { needsWheelchairBike: rider.needsWheelchairBike, note: rider.note };
}

export async function setManagedRiderNeeds(
  passengerId: string,
  managerUserId: string,
  input: RiderNeedsInput,
) {
  const rider = await riderManagedBy(passengerId, managerUserId);
  await setRiderNeeds(rider.id, input);
  return { chapterId: rider.chapterId };
}

export async function requestCare(input: {
  chapterId: string;
  caretakerUserId: string;
  requestedByUserId: string;
  rider: ManagedRiderInput;
  relationship?: string;
  helperName?: string;
}) {
  const { pickup, ...rider } = managedRiderInput.parse(input.rider);
  const scope = {
    caretakerUserId: input.caretakerUserId,
    chapterId: input.chapterId,
    firstName: rider.firstName,
    lastName: rider.lastName,
    birthDate: rider.birthDate,
  };
  const open = await findPendingCareRequest(scope);
  if (open) return open;

  return transaction(async (tx, emit) => {
    const request = await insertCareRequest(
      {
        ...scope,
        gender: rider.gender,
        requestedByUserId: input.requestedByUserId,
        relationship: input.relationship ?? null,
        helperName: input.helperName?.trim() || null,
        ...pickupColumns(pickup),
      },
      tx,
    );
    await emit({
      type: "care.requested",
      requestId: request.id,
      chapterId: input.chapterId,
      userId: input.caretakerUserId,
      actorUserId: input.requestedByUserId,
    });
    return request;
  });
}

export const getCareRequest = (id: string) => findCareRequest(id);

export const getCareRequestPreview = (id: string) => findCareRequestPreview(id);

export type CareRequestRow = NonNullable<
  Awaited<ReturnType<typeof findCareRequest>>
>;

export async function acceptCareRequest(id: string, caretakerUserId: string) {
  const request = await findCareRequest(id);
  if (
    !request ||
    request.caretakerUserId !== caretakerUserId ||
    request.status !== "pending"
  )
    throw new DomainError("notFound");

  if (request.passengerId) return acceptCareLink(request, caretakerUserId);

  await assertCanTakeOn(caretakerUserId, request.chapterId, 1);

  return transaction(async (tx, emit) => {
    const passenger = await insertPassengerIn(
      {
        chapterId: request.chapterId,
        managedByUserId: caretakerUserId,
        userId: null,
        firstName: request.firstName,
        lastName: request.lastName,
        birthDate: request.birthDate,
        gender: request.gender,
        residence: request.residence,
        address: request.address,
        latitude: request.latitude,
        longitude: request.longitude,
      },
      tx,
    );
    const { count } = await closeCareRequest(
      id,
      caretakerUserId,
      { status: "accepted", decidedAt: new Date(), passengerId: passenger.id },
      tx,
    );
    if (count !== 1) throw new DomainError("notFound");
    await emit({
      type: "care.decided",
      requestId: id,
      chapterId: request.chapterId,
      actorUserId: caretakerUserId,
      requestedByUserId: request.requestedByUserId,
      accepted: true,
    });
    return {
      passengerId: passenger.id,
      relationship: request.relationship,
      chapterId: request.chapterId,
      riderUserId: null,
    };
  });
}

async function acceptCareLink(
  request: CareRequestRow,
  caretakerUserId: string,
) {
  const rider = request.passengerId
    ? await findPassengerById(request.passengerId)
    : null;
  if (
    !rider?.userId ||
    rider.managedByUserId !== rider.userId ||
    rider.chapterId !== request.chapterId
  )
    throw new DomainError("notFound");
  const riderUserId = rider.userId;

  await assertCanTakeOn(caretakerUserId, request.chapterId, 1);

  return transaction(async (tx, emit) => {
    const linked = await linkPassengerManager(
      rider.id,
      riderUserId,
      caretakerUserId,
      tx,
    );
    if (linked.count !== 1) throw new DomainError("notFound");
    const { count } = await closeCareRequest(
      request.id,
      caretakerUserId,
      { status: "accepted", decidedAt: new Date() },
      tx,
    );
    if (count !== 1) throw new DomainError("notFound");
    await declinePendingCareLinks(rider.id, tx);
    await emit({
      type: "care.decided",
      requestId: request.id,
      chapterId: request.chapterId,
      actorUserId: caretakerUserId,
      requestedByUserId: request.requestedByUserId,
      accepted: true,
    });
    await emit({
      type: "care.linked",
      requestId: request.id,
      chapterId: request.chapterId,
      userId: riderUserId,
      actorUserId: caretakerUserId,
      passengerId: rider.id,
    });
    return {
      passengerId: rider.id,
      relationship: request.relationship,
      chapterId: request.chapterId,
      riderUserId,
    };
  });
}

/**
 * An admin asks someone with an account to look after a rider who already
 * rides with an account of their own. Nothing changes until that person
 * accepts; then they book for the rider, who keeps their own account.
 */
export async function requestCareLink(input: {
  passengerId: string;
  caretakerUserId: string;
  requestedByUserId: string;
}) {
  const rider = await findPassengerById(input.passengerId);
  if (!rider?.userId || rider.managedByUserId !== rider.userId)
    throw new DomainError("unknownPassenger");
  if (rider.userId === input.caretakerUserId)
    throw new DomainError("sameManager");

  const open = (await findPendingCareLinks(rider.id)).find(
    (link) => link.caretakerUserId === input.caretakerUserId,
  );
  if (open) return { id: open.id, chapterId: rider.chapterId };

  await assertCanTakeOn(input.caretakerUserId, rider.chapterId, 1);

  return transaction(async (tx, emit) => {
    const request = await insertCareRequest(
      {
        chapterId: rider.chapterId,
        caretakerUserId: input.caretakerUserId,
        requestedByUserId: input.requestedByUserId,
        passengerId: rider.id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        birthDate: rider.birthDate,
        gender: rider.gender,
      },
      tx,
    );
    await emit({
      type: "care.requested",
      requestId: request.id,
      chapterId: rider.chapterId,
      userId: input.caretakerUserId,
      actorUserId: input.requestedByUserId,
    });
    return { id: request.id, chapterId: rider.chapterId };
  });
}

export const listPendingCareLinks = (passengerId: string) =>
  findPendingCareLinks(passengerId);

export async function declineCareRequest(id: string, caretakerUserId: string) {
  const request = await findCareRequest(id);
  if (!request || request.caretakerUserId !== caretakerUserId)
    throw new DomainError("notFound");

  return transaction(async (tx, emit) => {
    const { count } = await closeCareRequest(
      id,
      caretakerUserId,
      { status: "declined", decidedAt: new Date() },
      tx,
    );
    if (count !== 1) throw new DomainError("notFound");
    await emit({
      type: "care.decided",
      requestId: id,
      chapterId: request.chapterId,
      actorUserId: caretakerUserId,
      requestedByUserId: request.requestedByUserId,
      accepted: false,
    });
  });
}

export const announceCareInvite = (event: {
  chapterId: string;
  userId: string;
  actorUserId: string;
  passengerId: string;
}) =>
  transaction(async (_tx, emit) => {
    await emit({ type: "care.invited", ...event });
  });

export type WaitingRider = {
  id: string;
  firstName: string;
  lastName: string;
  helperName: string;
  createdAt: Date;
};

export async function listWaitingRiders(
  chapterIds: string[],
): Promise<WaitingRider[]> {
  if (!chapterIds.length) return [];
  const [requests, invited] = await Promise.all([
    findPendingCareRequestsOfChapters(chapterIds),
    findInvitedRidersOfChapters(chapterIds),
  ]);
  return [
    ...requests.map((request) => ({
      id: request.id,
      firstName: request.firstName,
      lastName: request.lastName,
      helperName: request.helperName ?? "",
      createdAt: request.createdAt,
    })),
    ...invited.map((rider) => ({
      id: rider.id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      helperName: rider.managedBy.name,
      createdAt: rider.createdAt,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export const getOwnPassengers = async (userIds: string[]) =>
  userIds.length ? findPassengersOfUsers([...new Set(userIds)]) : [];
