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

// ponytail: one row lock per chapter serialises every role change of that
// chapter. Fine at chapter scale; lock the member row instead if a chapter ever
// has enough concurrent admin edits to feel it.
export const withChapterLock = <T>(
  chapterId: string,
  fn: (db: Prisma.TransactionClient) => Promise<T>,
) =>
  prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM organization WHERE id = ${chapterId} FOR UPDATE`;
    return fn(tx);
  });
