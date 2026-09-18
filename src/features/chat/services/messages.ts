import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { ChatMessageKind } from "../schemas";

const withContext = {
  reactions: {
    orderBy: { createdAt: "asc" },
    select: { userId: true, emoji: true },
  },
  replyTo: {
    select: {
      id: true,
      senderId: true,
      kind: true,
      body: true,
      deletedAt: true,
    },
  },
} as const;

export const findMessageById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatMessage.findUnique({
    where: { id },
    include: { ...withContext, conversation: true },
  });

export const findMessageByClientId = (
  conversationId: string,
  senderId: string,
  clientId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatMessage.findUnique({
    where: {
      conversationId_senderId_clientId: { conversationId, senderId, clientId },
    },
    include: withContext,
  });

export const findMessagesByIds = (
  ids: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatMessage.findMany({
    where: { id: { in: ids } },
    include: withContext,
  });

export const findMessages = async (
  conversationId: string,
  {
    beforeSeq,
    afterSeq,
    take,
  }: { beforeSeq?: number; afterSeq?: number; take: number },
  db: Prisma.TransactionClient = prisma,
) => {
  const newestFirst = afterSeq === undefined;
  const rows = await db.chatMessage.findMany({
    where: {
      conversationId,
      ...(beforeSeq === undefined ? {} : { seq: { lt: beforeSeq } }),
      ...(afterSeq === undefined ? {} : { seq: { gt: afterSeq } }),
    },
    orderBy: { seq: newestFirst ? "desc" : "asc" },
    take,
    include: withContext,
  });
  return newestFirst ? rows.reverse() : rows;
};

export const insertMessage = (
  {
    body,
    ...message
  }: {
    conversationId: string;
    seq: number;
    senderId: string | null;
    kind: ChatMessageKind;
    body: Uint8Array;
    meta?: Prisma.InputJsonValue;
    replyToId?: string | null;
    clientId?: string | null;
  },
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatMessage.create({
    data: { ...message, body: Buffer.from(body) },
    include: withContext,
  });

export const stampMessageEdited = (
  id: string,
  body: Uint8Array,
  editedAt: Date,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatMessage.update({
    where: { id },
    data: { body: Buffer.from(body), editedAt },
    include: withContext,
  });

export const stampMessageDeleted = (
  id: string,
  body: Uint8Array,
  deletedAt: Date,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatMessage.update({
    where: { id },
    data: { body: Buffer.from(body), deletedAt },
    include: withContext,
  });

export const deleteMessagesOlderThan = async (
  before: Date,
  take: number,
  db: Prisma.TransactionClient = prisma,
) => {
  const rows = await db.chatMessage.findMany({
    where: { createdAt: { lt: before } },
    select: { id: true },
    take,
  });
  if (rows.length === 0) return 0;

  const { count } = await db.chatMessage.deleteMany({
    where: { id: { in: rows.map((row) => row.id) } },
  });
  return count;
};

export const findReaction = (
  messageId: string,
  userId: string,
  emoji: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

export const insertReaction = (
  messageId: string,
  userId: string,
  emoji: string,
  db: Prisma.TransactionClient = prisma,
) => db.chatReaction.create({ data: { messageId, userId, emoji } });

export const deleteReaction = (
  messageId: string,
  userId: string,
  emoji: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatReaction.deleteMany({
    where: { messageId, userId, emoji },
  });

export const findReactionsOfMessage = (
  messageId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.chatReaction.findMany({
    where: { messageId },
    orderBy: { createdAt: "asc" },
    select: { userId: true, emoji: true },
  });
