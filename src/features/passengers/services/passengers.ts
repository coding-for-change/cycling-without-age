import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const insertPassenger = (data: Prisma.PassengerUncheckedCreateInput) =>
  prisma.passenger.create({ data });

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

export const findPassengerOfUser = (userId: string) =>
  prisma.passenger.findUnique({ where: { userId } });

export const findPassengersManagedBy = (managedByUserId: string) =>
  prisma.passenger.findMany({
    where: { managedByUserId },
    orderBy: { createdAt: "asc" },
  });

export const findPassengersOfChapter = (chapterId: string) =>
  prisma.passenger.findMany({
    where: { chapterId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

export const countPassengersManagedBy = (managedByUserId: string) =>
  prisma.passenger.count({ where: { managedByUserId } });
