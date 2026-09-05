import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email }, select: { id: true } });

export const findUserByPhone = (phoneNumber: string) =>
  prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } });

export async function createAuthUser({
  email,
  name,
  phoneNumber,
}: {
  email: string;
  name: string;
  phoneNumber?: string;
}) {
  const { user } = await auth.api.createUser({
    body: {
      email,
      name,
      data: {
        emailVerified: false,
        ...(phoneNumber ? { phoneNumber, phoneNumberVerified: false } : {}),
      },
    },
  });
  return user.id;
}

export type Provenance = {
  createdByUserId: string;
  helperName?: string;
  helperRelationship?: string;
  helperContact?: string;
  managesOthers?: boolean;
};

export const setProvenance = (userId: string, data: Provenance) =>
  prisma.user.update({ where: { id: userId }, data });

export const findProvenance = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { claimedAt: true, createdBy: { select: { name: true } } },
  });

export const markClaimed = (userId: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { claimedAt: new Date() },
  });
