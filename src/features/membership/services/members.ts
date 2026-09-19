import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const findMember = (
  userId: string,
  chapterId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.member.findUnique({
    where: { organizationId_userId: { organizationId: chapterId, userId } },
  });

export const findMembersOfUser = (
  userId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.member.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });

export const findMembersOfChapters = (
  chapterIds: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  db.member.findMany({
    where: { organizationId: { in: chapterIds } },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      organizationId: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
          image: true,
          phoneNumber: true,
        },
      },
    },
  });

export const findMembersMatchingName = (
  chapterIds: string[],
  query: string,
  { limit, excludeUserId }: { limit: number; excludeUserId: string },
  db: Prisma.TransactionClient = prisma,
) =>
  db.user.findMany({
    where: {
      id: { not: excludeUserId },
      name: { contains: query },
      members: { some: { organizationId: { in: chapterIds } } },
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      members: {
        where: { organizationId: { in: chapterIds } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { organizationId: true },
      },
    },
  });

export const findAdminMembersOfChapter = (
  chapterId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.member.findMany({
    where: { organizationId: chapterId, role: { contains: "admin" } },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
  });

export const upsertMemberRole = (
  userId: string,
  chapterId: string,
  role: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.member.upsert({
    where: { organizationId_userId: { organizationId: chapterId, userId } },
    create: { userId, organizationId: chapterId, role },
    update: { role },
  });

export const deleteMember = (
  userId: string,
  chapterId: string,
  db: Prisma.TransactionClient = prisma,
) => db.member.deleteMany({ where: { userId, organizationId: chapterId } });

export const withChapterLock = <T>(
  chapterId: string,
  fn: (db: Prisma.TransactionClient) => Promise<T>,
  db?: Prisma.TransactionClient,
) => {
  const locked = async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM organization WHERE id = ${chapterId} FOR UPDATE`;
    return fn(tx);
  };
  // Prisma cannot nest interactive transactions: a caller that already has one
  // hands it in, and the lock is taken inside it rather than beside it.
  return db ? locked(db) : prisma.$transaction(locked);
};
