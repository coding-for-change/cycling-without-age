import {
  MAX_MANAGED_RIDERS,
  managedRiderInput,
  managedRiderPatch,
  ownRiderDetailsPatch,
  passengerInput,
} from "./schemas";
import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type {
  ManagedRiderInput,
  ManagedRiderPatchInput,
  OwnRiderDetailsPatchInput,
  PassengerInput,
} from "./schemas";
import {
  countPassengersInChapters,
  countPassengersManagedBy,
  countPassengersWithoutAccountManagedBy,
  countRosterEntriesOf,
  deletePassengerWithoutAccount,
  findPassengerById,
  findPassengerOfUser,
  findPassengersOfUsers,
  findPassengersByIds,
  findPassengersManagedBy,
  findPassengersOfChapters,
  findPassengerNames,
  findPassengersWithOtherAccountManagedBy,
  insertPassenger,
  insertPassengers,
  closeCareRequest,
  findCareRequest,
  findCareRequestPreview,
  findPendingCareRequest,
  findPendingCareRequestsOfChapters,
  findInvitedRidersOfChapters,
  insertCareRequest,
  insertPassengerIn,
  deletePassengerOfUser,
  setPassengerManagers,
  updatePassengerOfUser,
  updatePassengerWithoutAccount,
  upsertOwnPassenger,
} from "./services/passengers";

export const getOwnPassenger = (userId: string) => findPassengerOfUser(userId);
export const getPassenger = (id: string) => findPassengerById(id);
export const getPassengers = async (ids: string[]) =>
  ids.length ? findPassengersByIds(ids) : [];
export const listPassengersManagedBy = (userId: string) =>
  findPassengersManagedBy(userId);
export const listPassengersOfChapters = (chapterIds: string[]) =>
  findPassengersOfChapters(chapterIds);

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

export async function addPassenger(input: PassengerInput) {
  const data = passengerInput.parse(input);
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
  riders: ManagedRiderInput[],
) {
  const data = riders.map((rider) =>
    passengerInput.parse({
      ...rider,
      managedByUserId,
      chapterId,
      userId: null,
    }),
  );
  await assertCanTakeOn(managedByUserId, chapterId, data.length);
  return insertPassengers(
    data.map(({ pickup, ...rider }) => ({
      ...rider,
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

export const countRidersRemovedWith = (userId: string) =>
  countPassengersWithoutAccountManagedBy(userId);

export const removeOwnPassenger = (userId: string) =>
  deletePassengerOfUser(userId);

export async function handRidersToTheirOwnAccounts(managedByUserId: string) {
  const riders = await findPassengersWithOtherAccountManagedBy(managedByUserId);
  const changes = riders.flatMap((rider) =>
    rider.userId ? [{ id: rider.id, managedByUserId: rider.userId }] : [],
  );
  if (changes.length) await setPassengerManagers(changes);
  return changes.length;
}

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
    };
  });
}

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
