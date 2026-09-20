import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type {
  ConversationKind,
  ConversationMemberRole,
  ConversationOrigin,
} from "../schemas";

const withCounts = {
  _count: { select: { members: true } },
  members: { take: 2, select: { userId: true } },
} as const;

export const findConversationById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.conversation.findUnique({ where: { id } });

export const findConversationWithCounts = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.conversation.findUnique({ where: { id }, include: withCounts });

export const findConversationByDirectKey = (
  directKey: string,
  db: Prisma.TransactionClient = prisma,
) => db.conversation.findUnique({ where: { directKey } });

export const findConversationsInScope = (
  {
    chapterIds,
    take,
    before,
  }: { chapterIds: string[] | null; take: number; before?: Date },
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversation.findMany({
    where: {
      ...(chapterIds ? { chapterId: { in: chapterIds } } : {}),
      ...(before ? { lastMessageAt: { lt: before } } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take,
    include: withCounts,
  });

export const insertConversation = (
  {
    members,
    dek,
    ...conversation
  }: {
    kind: ConversationKind;
    origin?: ConversationOrigin;
    title?: string | null;
    chapterId: string | null;
    createdByUserId: string;
    directKey?: string | null;
    dek: Uint8Array;
    keyVersion: number;
    announcementOnly?: boolean;
    members: { userId: string; role: ConversationMemberRole }[];
  },
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversation.create({
    data: {
      ...conversation,
      dek: Buffer.from(dek),
      members: { create: members },
    },
    include: withCounts,
  });

export const lockConversation = async (
  id: string,
  db: Prisma.TransactionClient,
) => {
  await db.$queryRaw`SELECT id FROM conversation WHERE id = ${id} FOR UPDATE`;
};

export const stampLastMessage = (
  id: string,
  data: { lastSeq: number; lastMessageId: string; lastMessageAt: Date },
  db: Prisma.TransactionClient = prisma,
) => db.conversation.update({ where: { id }, data, select: { id: true } });

export const stampAnnouncementOnly = (
  id: string,
  announcementOnly: boolean,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversation.update({
    where: { id },
    data: { announcementOnly },
    select: { id: true },
  });

export const stampFrozenAt = (
  id: string,
  frozenAt: Date | null,
  db: Prisma.TransactionClient = prisma,
) =>
  db.conversation.update({
    where: { id },
    data: { frozenAt },
    select: { id: true },
  });

export const deleteEmptyConversations = (
  db: Prisma.TransactionClient = prisma,
) => db.conversation.deleteMany({ where: { members: { none: {} } } });
