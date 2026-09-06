import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const findProfile = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      locale: true,
      birthDate: true,
      gender: true,
      residence: true,
      address: true,
      latitude: true,
      longitude: true,
      managesOthers: true,
      notifyEmail: true,
      notifyPush: true,
      consentSafetyAt: true,
      consentDataAt: true,
      passkeyPromptedAt: true,
      pilotNextStepsSeenAt: true,
      welcomeEmailSentAt: true,
      _count: { select: { passkeys: true, passengers: true } },
    },
  });

export const updateProfile = (userId: string, data: Prisma.UserUpdateInput) =>
  prisma.user.update({ where: { id: userId }, data });
