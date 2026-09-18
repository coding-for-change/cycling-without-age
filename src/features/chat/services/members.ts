import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const withConversation = {
  conversation: {
    include: {
      _count: { select: { members: true } },
      members: { take: 2, select: { userId: true } },
    },
  },
} as const;

export const findConversationMember = (
  conversationId: string,
  userId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

export const findMembershipOfUser = (
  conversationId: string,
  userId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: withConversation,
  });

export const findMembershipsOfUser = (
  userId: string,
  { take, before }: { take: number; before?: Date },
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.findMany({
    where: {
      userId,
      ...(before ? { conversation: { lastMessageAt: { lt: before } } } : {}),
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take,
    include: withConversation,
  });

export const findMembershipsChangedSince = (
  userId: string,
  since: Date,
  take: number,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.findMany({
    where: { userId, conversation: { updatedAt: { gt: since } } },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take,
    include: withConversation,
  });

export const findMembersOfConversation = (
  conversationId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.findMany({
    where: { conversationId },
    orderBy: { joinedAt: "asc" },
    select: {
      userId: true,
      role: true,
      lastReadSeq: true,
      joinedAt: true,
    },
  });

export const findMemberUserIds = async (
  conversationId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  (
    await db.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    })
  ).map((member) => member.userId);

export const findContactUserIds = async (
  userId: string,
  take: number,
  db: Prisma.TransactionClient = prisma,
) => {
  const mine = await db.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  if (mine.length === 0) return [];

  const others = await db.conversationMember.findMany({
    where: {
      conversationId: { in: mine.map((row) => row.conversationId) },
      userId: { not: userId },
    },
    select: { userId: true },
    distinct: ["userId"],
    take,
  });
  return others.map((member) => member.userId);
};

export const stampLastRead = (
  conversationId: string,
  userId: string,
  lastReadSeq: number,
  lastReadAt: Date,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadSeq, lastReadAt },
    select: { lastReadSeq: true },
  });

export const stampMutedUntil = (
  conversationId: string,
  userId: string,
  mutedUntil: Date | null,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { mutedUntil },
    select: { mutedUntil: true },
  });

export const deleteConversationMember = (
  conversationId: string,
  userId: string,
  db: Prisma.TransactionClient = prisma,
) => db.conversationMember.deleteMany({ where: { conversationId, userId } });

export const countUnreadMemberships = async (
  userId: string,
  now: Date,
  db: Prisma.TransactionClient = prisma,
) => {
  const rows = await db.$queryRaw<{ unread: bigint }[]>`
    SELECT COUNT(*) AS unread
    FROM conversation_member m
    JOIN conversation c ON c.id = m.conversationId
    WHERE m.userId = ${userId}
      AND c.lastSeq > m.lastReadSeq
      AND (m.mutedUntil IS NULL OR m.mutedUntil < ${now})`;
  return Number(rows[0]?.unread ?? 0);
};
