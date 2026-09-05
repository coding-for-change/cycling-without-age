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
      chapter: { select: { name: true } },
      user: { select: { email: true, phoneNumber: true, image: true } },
    },
  });

export const countPassengersManagedBy = (managedByUserId: string) =>
  prisma.passenger.count({ where: { managedByUserId } });
