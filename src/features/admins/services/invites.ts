import { prisma } from "@/lib/prisma";
import type { AdminInviteKind, Prisma } from "@/generated/prisma";

const inviteSelect = {
  id: true,
  kind: true,
  countryId: true,
  userId: true,
  invitedByUserId: true,
  createdAt: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  user: { select: { name: true, email: true } },
  invitedBy: { select: { name: true } },
  country: { select: { name: true } },
} as const;

const open = (now: Date) => ({
  acceptedAt: null,
  revokedAt: null,
  expiresAt: { gt: now },
});

export const insertInvite = (
  data: {
    kind: AdminInviteKind;
    countryId: string | null;
    userId: string;
    invitedByUserId: string;
    expiresAt: Date;
  },
  db: Prisma.TransactionClient = prisma,
) => db.adminInvite.create({ data, select: { id: true } });

export const revokeOpenInvitesFor = (
  target: { kind: AdminInviteKind; userId: string; countryId: string | null },
  now: Date,
  db: Prisma.TransactionClient = prisma,
) =>
  db.adminInvite.updateMany({
    where: { ...target, acceptedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });

export const revokeOpenInvitesSentBy = (
  invitedByUserId: string,
  now: Date,
  db: Prisma.TransactionClient = prisma,
) =>
  db.adminInvite.updateMany({
    where: { invitedByUserId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });

export const findInviteById = (id: string) =>
  prisma.adminInvite.findUnique({ where: { id }, select: inviteSelect });

export const findOpenInvites = (
  where: { kind: AdminInviteKind; countryId?: { in: string[] } },
  now: Date,
) =>
  prisma.adminInvite.findMany({
    where: { ...where, ...open(now) },
    orderBy: { createdAt: "desc" },
    select: inviteSelect,
  });

export const findLatestOpenInviteOf = (userId: string, now: Date) =>
  prisma.adminInvite.findFirst({
    where: { userId, ...open(now) },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

export const findAcceptedInvitesOf = (
  kind: AdminInviteKind,
  userIds: string[],
) =>
  prisma.adminInvite.findMany({
    where: { kind, userId: { in: userIds }, acceptedAt: { not: null } },
    orderBy: { acceptedAt: "desc" },
    select: inviteSelect,
  });

export const claimOpenInvite = (
  id: string,
  userId: string,
  now: Date,
  db: Prisma.TransactionClient = prisma,
) =>
  db.adminInvite.updateMany({
    where: { id, userId, ...open(now) },
    data: { acceptedAt: now },
  });

export const releaseClaim = (id: string) =>
  prisma.adminInvite.updateMany({
    where: { id, acceptedAt: { not: null } },
    data: { acceptedAt: null },
  });

export const revokeOpenInvite = (
  id: string,
  kind: AdminInviteKind,
  now: Date,
) =>
  prisma.adminInvite.updateMany({
    where: { id, kind, acceptedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });
