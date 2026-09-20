import { prisma } from "@/lib/prisma";
import type { DevicePlatform } from "../schemas";

export const upsertDevice = ({
  userId,
  token,
  platform,
}: {
  userId: string;
  token: string;
  platform: DevicePlatform;
}) =>
  prisma.device.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform, lastSeenAt: new Date() },
  });

export const deleteDeviceOfUser = (userId: string, token: string) =>
  prisma.device.deleteMany({ where: { userId, token } });

export const findTokensOfUser = (userId: string) =>
  prisma.device.findMany({ where: { userId }, select: { token: true } });

export const deleteDevicesByToken = (tokens: string[]) =>
  prisma.device.deleteMany({ where: { token: { in: tokens } } });

export const deleteDevicesNotSeenSince = (before: Date) =>
  prisma.device.deleteMany({ where: { lastSeenAt: { lt: before } } });
