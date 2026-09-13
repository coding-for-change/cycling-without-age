import { passengerInput } from "./schemas";
import { DomainError } from "@/lib/domain-error";
import type { PassengerInput } from "./schemas";
import {
  countPassengersManagedBy,
  findPassengerOfUser,
  findPassengersManagedBy,
  findPassengersOfChapters,
  insertPassenger,
  upsertOwnPassenger,
} from "./services/passengers";

export const getOwnPassenger = (userId: string) => findPassengerOfUser(userId);
export const listPassengersManagedBy = (userId: string) =>
  findPassengersManagedBy(userId);
export const listPassengersOfChapters = (chapterIds: string[]) =>
  findPassengersOfChapters(chapterIds);

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

  // `chapterId` from the input is dropped on purpose: the existing row's chapter
  // wins, because moving someone between chapters is leaving one, not editing a name.
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
