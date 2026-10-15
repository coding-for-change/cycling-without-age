import { ownRiderDetailsPatch, passengerInput } from "./schemas";
import { DomainError } from "@/lib/domain-error";
import type { OwnRiderDetailsPatchInput, PassengerInput } from "./schemas";
import {
  findBookingAccountsOfChapters,
  countPassengersInChapters,
  countPassengersManagedBy,
  findPassengerById,
  findPassengerOfUser,
  findPassengersByIds,
  findPassengersManagedBy,
  findPassengersOfAccount,
  findPassengersOfChapters,
  findPassengerNames,
  insertPassenger,
  updatePassengerOfUser,
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

export async function addPassenger(input: PassengerInput) {
  const data = passengerInput.parse(input);
  const [existing] = await findPassengersManagedBy(data.managedByUserId);
  if (existing && existing.chapterId !== data.chapterId) {
    throw new DomainError("passengerChapterMismatch");
  }
  if (data.userId && (await findPassengerOfUser(data.userId))) {
    throw new DomainError("alreadyHasPassenger");
  }
  return insertPassenger({ ...data, userId: data.userId ?? null });
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
