import { prisma } from "@/lib/prisma";

export const findMember = (userId: string, chapterId: string) =>
  prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: chapterId, userId } },
  });

export const findMembersOfUser = (userId: string) =>
  prisma.member.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });

export const findMembersOfChapter = (chapterId: string) =>
  prisma.member.findMany({
    where: { organizationId: chapterId },
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
) =>
  prisma.member.upsert({
    where: { organizationId_userId: { organizationId: chapterId, userId } },
    create: { userId, organizationId: chapterId, role },
    update: { role },
  });

export const deleteMember = (userId: string, chapterId: string) =>
  prisma.member.deleteMany({ where: { userId, organizationId: chapterId } });
