import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { DevicePlatform } from "../schemas";

/**
 * The token is the identity, not the (user, token) pair: FCM hands the same
 * token to whoever signs in on that device next, so a re-registration has to
 * move the row rather than add a second one and push to the previous owner.
 */
export const upsertDevice = (
  {
    userId,
    token,
    platform,
  }: {
    userId: string;
    token: string;
    platform: DevicePlatform;
  },
  db: Prisma.TransactionClient = prisma,
) =>
  db.device.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform, lastSeenAt: new Date() },
  });

export const deleteDeviceOfUser = (
  userId: string,
  token: string,
  db: Prisma.TransactionClient = prisma,
) => db.device.deleteMany({ where: { userId, token } });

export const findTokensOfUser = (
  userId: string,
  db: Prisma.TransactionClient = prisma,
) => db.device.findMany({ where: { userId }, select: { token: true } });

export const deleteDevicesByToken = (
  tokens: string[],
  db: Prisma.TransactionClient = prisma,
) => db.device.deleteMany({ where: { token: { in: tokens } } });

export const deleteDevicesNotSeenSince = (
  before: Date,
  db: Prisma.TransactionClient = prisma,
) => db.device.deleteMany({ where: { lastSeenAt: { lt: before } } });
