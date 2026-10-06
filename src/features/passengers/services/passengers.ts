import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const insertPassenger = (data: Prisma.PassengerUncheckedCreateInput) =>
  prisma.passenger.create({ data });

export const deletePassengerOfUser = (userId: string) =>
  prisma.passenger.deleteMany({ where: { userId } });

export const insertPassengers = (data: Prisma.PassengerCreateManyInput[]) =>
  prisma.passenger.createMany({ data });

export const upsertOwnPassenger = (
  userId: string,
  data: Omit<Prisma.PassengerUncheckedCreateInput, "userId">,
) =>
  prisma.passenger.upsert({
    where: { userId },
    create: { ...data, userId },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      gender: data.gender,
    },
  });

export const findPassengerById = (id: string) =>
  prisma.passenger.findUnique({
    where: { id },
    select: {
      id: true,
      chapterId: true,
      managedByUserId: true,
      userId: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      gender: true,
      residence: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

export const countRosterEntriesOf = async (id: string) =>
  (
    await prisma.passenger.findUnique({
      where: { id },
      select: { _count: { select: { rideRoster: true } } },
    })
  )?._count.rideRoster ?? 0;

export const updatePassengerWithoutAccount = (
  id: string,
  data: Prisma.PassengerUpdateManyMutationInput,
) => prisma.passenger.updateMany({ where: { id, userId: null }, data });

export const deletePassengerWithoutAccount = (id: string) =>
  prisma.passenger.deleteMany({ where: { id, userId: null } });

export const countPassengersWithoutAccountManagedBy = (
  managedByUserId: string,
) => prisma.passenger.count({ where: { managedByUserId, userId: null } });

export const findPassengersWithOtherAccountManagedBy = (
  managedByUserId: string,
) =>
  prisma.passenger.findMany({
    where: {
      managedByUserId,
      NOT: [{ userId: null }, { userId: managedByUserId }],
    },
    select: { id: true, userId: true },
  });

export const setPassengerManagers = (
  changes: { id: string; managedByUserId: string }[],
) =>
  prisma.$transaction(
    changes.map(({ id, managedByUserId }) =>
      prisma.passenger.update({ where: { id }, data: { managedByUserId } }),
    ),
  );

export const findPassengersByIds = (ids: string[]) =>
  prisma.passenger.findMany({
    where: { id: { in: ids } },
    select: { id: true, chapterId: true, firstName: true, lastName: true },
  });

export const findPassengerOfUser = (userId: string) =>
  prisma.passenger.findUnique({ where: { userId } });

export const findPassengersManagedBy = (managedByUserId: string) =>
  prisma.passenger.findMany({
    where: { managedByUserId },
    orderBy: { createdAt: "asc" },
  });

export const findPassengersOfChapters = (chapterIds: string[]) =>
  prisma.passenger.findMany({
    where: { chapterId: { in: chapterIds } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      gender: true,
      userId: true,
      chapterId: true,
      createdAt: true,
      managedByUserId: true,
      residence: true,
      address: true,
      latitude: true,
      longitude: true,
      chapter: { select: { name: true } },
      user: {
        select: {
          email: true,
          phoneNumber: true,
          image: true,
          residence: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
      managedBy: { select: { name: true, email: true, phoneNumber: true } },
    },
  });

export const countPassengersManagedBy = (managedByUserId: string) =>
  prisma.passenger.count({ where: { managedByUserId } });

export const updatePassengerOfUser = (
  userId: string,
  data: Prisma.PassengerUpdateManyMutationInput,
) => prisma.passenger.updateMany({ where: { userId }, data });

export const countPassengersInChapters = (chapterIds: string[]) =>
  prisma.passenger.count({ where: { chapterId: { in: chapterIds } } });

export const findPassengerNames = (ids: string[]) =>
  prisma.passenger.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true },
  });

export const insertCareRequest = (
  data: Prisma.CareRequestUncheckedCreateInput,
  db: Prisma.TransactionClient = prisma,
) => db.careRequest.create({ data, select: { id: true } });

export const findCareRequest = (id: string) =>
  prisma.careRequest.findUnique({ where: { id } });

export const findCareRequestPreview = (id: string) =>
  prisma.careRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      firstName: true,
      chapterId: true,
      caretakerUserId: true,
      requestedByUserId: true,
    },
  });

export const findPendingCareRequest = (where: {
  caretakerUserId: string;
  chapterId: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
}) =>
  prisma.careRequest.findFirst({
    where: { ...where, status: "pending" },
    select: { id: true },
  });

export const closeCareRequest = (
  id: string,
  caretakerUserId: string,
  data: Prisma.CareRequestUpdateManyMutationInput & { passengerId?: string },
  db: Prisma.TransactionClient = prisma,
) =>
  db.careRequest.updateMany({
    where: { id, caretakerUserId, status: "pending" },
    data,
  });

export const insertPassengerIn = (
  data: Prisma.PassengerUncheckedCreateInput,
  db: Prisma.TransactionClient,
) => db.passenger.create({ data, select: { id: true } });

export const findPendingCareRequestsOfChapters = (chapterIds: string[]) =>
  prisma.careRequest.findMany({
    where: { chapterId: { in: chapterIds }, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      helperName: true,
    },
  });

export const findInvitedRidersOfChapters = (chapterIds: string[]) =>
  prisma.passenger.findMany({
    where: {
      chapterId: { in: chapterIds },
      userId: null,
      managedBy: { claimedAt: null, createdByUserId: { not: null } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      managedBy: { select: { name: true } },
    },
  });

export const findPassengersOfUsers = (userIds: string[]) =>
  prisma.passenger.findMany({ where: { userId: { in: userIds } } });
