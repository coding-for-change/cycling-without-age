import type { Prisma } from "@/generated/prisma";
import { DomainError, isUniqueViolation } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import {
  decryptText,
  encryptText,
  generateDek,
  unwrapDekCached,
  wrapDek,
} from "@/lib/crypto/chat-cipher";
import { conversationChannel, publish, publishToUsers } from "@/lib/realtime";
import {
  CONVERSATION_PAGE_SIZE,
  EDIT_WINDOW_MS,
  GROUP_ANNOUNCEMENT_THRESHOLD,
  MAX_MESSAGE_CHARS,
  MESSAGE_PAGE_SIZE,
  createGroupInput,
  deleteMessageInput,
  editMessageInput,
  getOrCreateDirectInput,
  markReadInput,
  muteInput,
  sendMessageInput,
  systemMeta,
  toggleReactionInput,
} from "./schemas";
import type {
  ChatMessageView,
  ConversationSummary,
  CreateGroupInput,
  DeleteMessageInput,
  EditMessageInput,
  GetOrCreateDirectInput,
  MarkReadInput,
  MemberView,
  MuteInput,
  ReactionView,
  SendMessageInput,
  SystemMeta,
  ToggleReactionInput,
} from "./schemas";
import {
  deleteEmptyConversations,
  findConversationByDirectKey,
  findConversationById,
  findConversationWithCounts,
  findConversationsInScope,
  insertConversation,
  lockConversation,
  stampAnnouncementOnly,
  stampFrozenAt,
  stampLastMessage,
} from "./services/conversations";
import {
  countUnreadMemberships,
  deleteConversationMember,
  findContactUserIds,
  findConversationMember,
  findMemberUserIds,
  findMembersOfConversation,
  findMembershipOfUser,
  findMembershipsChangedSince,
  findMembershipsOfUser,
  stampLastRead,
  stampMutedUntil,
} from "./services/members";
import {
  deleteMessagesOlderThan,
  deleteReaction,
  findMessageByClientId,
  findMessageById,
  findMessages,
  findMessagesByIds,
  findReaction,
  findReactionsOfMessage,
  insertMessage,
  insertReaction,
  stampMessageDeleted,
  stampMessageEdited,
} from "./services/messages";

const CONTACT_LIMIT = 2000;
const MEMBER_VIEW_LIMIT = 200;
const PRUNE_BATCH = 1000;
const TYPING_WINDOW_MS = 5_000;
const EMPTY_BODY = new Uint8Array(0);

type ConversationRow = NonNullable<
  Awaited<ReturnType<typeof findConversationWithCounts>>
>;
type MembershipRow = NonNullable<
  Awaited<ReturnType<typeof findMembershipOfUser>>
>;
type MessageRow = Awaited<ReturnType<typeof findMessagesByIds>>[number];

const iso = (date: Date | null) => (date === null ? null : date.toISOString());

const buffer = (bytes: Uint8Array) => Buffer.from(bytes);

const dekOf = (conversation: { dek: Uint8Array; keyVersion: number }) =>
  unwrapDekCached(buffer(conversation.dek), conversation.keyVersion);

const bodyText = (
  message: { kind: string; body: Uint8Array; deletedAt: Date | null },
  dek: Buffer,
  conversationId: string,
) =>
  message.kind === "system" ||
  message.deletedAt !== null ||
  message.body.length === 0
    ? ""
    : decryptText(dek, buffer(message.body), conversationId);

const toReactions = (
  rows: { emoji: string; userId: string }[],
): ReactionView[] => {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const users = grouped.get(row.emoji);
    if (users) users.push(row.userId);
    else grouped.set(row.emoji, [row.userId]);
  }
  return [...grouped].map(([emoji, userIds]) => ({ emoji, userIds }));
};

const toMessageView = (row: MessageRow, dek: Buffer): ChatMessageView => {
  const meta = systemMeta.safeParse(row.meta);
  return {
    id: row.id,
    conversationId: row.conversationId,
    seq: row.seq,
    senderId: row.senderId,
    kind: row.kind,
    text: bodyText(row, dek, row.conversationId),
    meta: meta.success ? meta.data : null,
    replyTo: row.replyTo
      ? {
          id: row.replyTo.id,
          senderId: row.replyTo.senderId,
          text: bodyText(row.replyTo, dek, row.conversationId),
        }
      : null,
    clientId: row.clientId,
    editedAt: iso(row.editedAt),
    deletedAt: iso(row.deletedAt),
    createdAt: row.createdAt.toISOString(),
    reactions: toReactions(row.reactions),
  };
};

const loadLastMessages = async (conversations: ConversationRow[]) => {
  const ids = conversations
    .map((conversation) => conversation.lastMessageId)
    .filter((id): id is string => id !== null);
  const views = new Map<string, ChatMessageView>();
  if (ids.length === 0) return views;

  const deks = new Map(
    conversations.map((conversation) => [conversation.id, dekOf(conversation)]),
  );
  for (const row of await findMessagesByIds(ids)) {
    const dek = deks.get(row.conversationId);
    if (dek) views.set(row.conversationId, toMessageView(row, dek));
  }
  return views;
};

const toScopedSummary = (
  conversation: ConversationRow,
  viewerId: string | null,
  lastMessage: ChatMessageView | null,
): Omit<ConversationSummary, "me"> => ({
  id: conversation.id,
  kind: conversation.kind,
  origin: conversation.origin,
  title: conversation.title,
  chapterId: conversation.chapterId,
  announcementOnly: conversation.announcementOnly,
  frozenAt: iso(conversation.frozenAt),
  lastSeq: conversation.lastSeq,
  lastMessageAt: iso(conversation.lastMessageAt),
  otherUserId:
    viewerId !== null && conversation.kind === "direct"
      ? (conversation.members.find((member) => member.userId !== viewerId)
          ?.userId ?? null)
      : null,
  memberCount: conversation._count.members,
  lastMessage,
});

const toSummary = (
  membership: MembershipRow,
  lastMessage: ChatMessageView | null,
): ConversationSummary => ({
  ...toScopedSummary(membership.conversation, membership.userId, lastMessage),
  me: {
    role: membership.role,
    lastReadSeq: membership.lastReadSeq,
    mutedUntil: iso(membership.mutedUntil),
  },
});

const toSummaries = async (memberships: MembershipRow[]) => {
  const lastMessages = await loadLastMessages(
    memberships.map((membership) => membership.conversation),
  );
  return memberships.map((membership) =>
    toSummary(membership, lastMessages.get(membership.conversationId) ?? null),
  );
};

const toMemberView = (member: {
  userId: string;
  role: MemberView["role"];
  lastReadSeq: number;
  joinedAt: Date;
}): MemberView => ({
  userId: member.userId,
  role: member.role,
  lastReadSeq: member.lastReadSeq,
  joinedAt: member.joinedAt.toISOString(),
});

const requireConversation = async (
  conversationId: string,
  db?: Prisma.TransactionClient,
) => {
  const conversation = await findConversationById(conversationId, db);
  if (!conversation) throw new DomainError("unknownConversation");
  return conversation;
};

const requireMembership = async (
  conversationId: string,
  userId: string,
  db?: Prisma.TransactionClient,
) => {
  const membership = await findConversationMember(conversationId, userId, db);
  if (!membership) throw new DomainError("notMember");
  return membership;
};

const appendSystemMessage = async (
  conversation: { id: string; lastSeq: number },
  meta: SystemMeta,
  db: Prisma.TransactionClient,
) => {
  const seq = conversation.lastSeq + 1;
  const row = await insertMessage(
    {
      conversationId: conversation.id,
      seq,
      senderId: null,
      kind: "system",
      body: EMPTY_BODY,
      meta: meta as unknown as Prisma.InputJsonObject,
    },
    db,
  );
  await stampLastMessage(
    conversation.id,
    { lastSeq: seq, lastMessageId: row.id, lastMessageAt: row.createdAt },
    db,
  );
  return row;
};

const readSummary = async (conversationId: string, userId: string) => {
  const summary = await getConversation(conversationId, userId);
  if (!summary) throw new DomainError("notMember");
  return summary;
};

export async function getOrCreateDirect(input: GetOrCreateDirectInput) {
  const { userIds, chapterId, createdByUserId } =
    getOrCreateDirectInput.parse(input);
  const directKey = [...userIds].sort().join("_");

  const existing = await findConversationByDirectKey(directKey);
  if (existing) {
    return {
      conversation: await readSummary(existing.id, createdByUserId),
      created: false,
    };
  }

  const { wrapped, keyVersion } = wrapDek(generateDek());
  try {
    const created = await insertConversation({
      kind: "direct",
      chapterId,
      createdByUserId,
      directKey,
      dek: wrapped,
      keyVersion,
      members: userIds.map((userId) => ({ userId, role: "member" as const })),
    });
    await publishToUsers([...userIds], {
      type: "conversation.created",
      conversationId: created.id,
    });
    return {
      conversation: await readSummary(created.id, createdByUserId),
      created: true,
    };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findConversationByDirectKey(directKey);
    if (!raced) throw error;
    return {
      conversation: await readSummary(raced.id, createdByUserId),
      created: false,
    };
  }
}

export async function createGroup(input: CreateGroupInput) {
  const { title, chapterId, createdByUserId, memberUserIds } =
    createGroupInput.parse(input);
  const { wrapped, keyVersion } = wrapDek(generateDek());

  const created = await insertConversation({
    kind: "group",
    title,
    chapterId,
    createdByUserId,
    dek: wrapped,
    keyVersion,
    announcementOnly: memberUserIds.length + 1 > GROUP_ANNOUNCEMENT_THRESHOLD,
    members: [
      { userId: createdByUserId, role: "owner" as const },
      ...memberUserIds.map((userId) => ({ userId, role: "member" as const })),
    ],
  });

  await publishToUsers([createdByUserId, ...memberUserIds], {
    type: "conversation.created",
    conversationId: created.id,
  });
  return readSummary(created.id, createdByUserId);
}

export async function listConversations(
  userId: string,
  opts: { take?: number; before?: string } = {},
): Promise<ConversationSummary[]> {
  const memberships = await findMembershipsOfUser(userId, {
    take: opts.take ?? CONVERSATION_PAGE_SIZE,
    before: opts.before ? new Date(opts.before) : undefined,
  });
  return toSummaries(memberships);
}

export async function syncConversations(
  userId: string,
  since: string,
): Promise<ConversationSummary[]> {
  const memberships = await findMembershipsChangedSince(
    userId,
    new Date(since),
    CONVERSATION_PAGE_SIZE,
  );
  return toSummaries(memberships);
}

export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<ConversationSummary | null> {
  const membership = await findMembershipOfUser(conversationId, userId);
  if (!membership) return null;
  const [summary] = await toSummaries([membership]);
  return summary ?? null;
}

export const isMember = async (conversationId: string, userId: string) =>
  (await findConversationMember(conversationId, userId)) !== null;

export const listMembers = async (
  conversationId: string,
): Promise<MemberView[]> =>
  (await findMembersOfConversation(conversationId)).map(toMemberView);

export const listMemberUserIds = (conversationId: string) =>
  findMemberUserIds(conversationId);

export const listContactUserIds = (userId: string) =>
  findContactUserIds(userId, CONTACT_LIMIT);

export async function listMessages(
  conversationId: string,
  userId: string,
  opts: { beforeSeq?: number; afterSeq?: number; take?: number } = {},
): Promise<ChatMessageView[]> {
  const conversation = await requireConversation(conversationId);
  await requireMembership(conversationId, userId);

  const rows = await findMessages(conversationId, {
    beforeSeq: opts.beforeSeq,
    afterSeq: opts.afterSeq,
    take: opts.take ?? MESSAGE_PAGE_SIZE,
  });
  const dek = dekOf(conversation);
  return rows.map((row) => toMessageView(row, dek));
}

export async function getMessage(
  messageId: string,
): Promise<ChatMessageView | null> {
  const row = await findMessageById(messageId);
  return row ? toMessageView(row, dekOf(row.conversation)) : null;
}

export async function sendMessage(
  input: SendMessageInput,
): Promise<ChatMessageView> {
  if (input.text.trim().length > MAX_MESSAGE_CHARS)
    throw new DomainError("tooLong");
  const { conversationId, senderId, text, clientId, replyToId } =
    sendMessageInput.parse(input);

  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversationId, senderId);
  if (conversation.frozenAt) throw new DomainError("frozen");
  if (conversation.announcementOnly && membership.role !== "owner")
    throw new DomainError("announcementOnly");

  const dek = dekOf(conversation);
  const seen = await findMessageByClientId(conversationId, senderId, clientId);
  if (seen) return toMessageView(seen, dek);

  const { message, created } = await transaction(async (tx, emit) => {
    await lockConversation(conversationId, tx);
    const locked = await requireConversation(conversationId, tx);

    const already = await findMessageByClientId(
      conversationId,
      senderId,
      clientId,
      tx,
    );
    if (already)
      return { message: toMessageView(already, dek), created: false };

    const reply = replyToId ? await findMessageById(replyToId, tx) : null;
    const seq = locked.lastSeq + 1;
    const row = await insertMessage(
      {
        conversationId,
        seq,
        senderId,
        kind: "text",
        body: encryptText(dek, text, conversationId),
        replyToId:
          reply && reply.conversationId === conversationId ? reply.id : null,
        clientId,
      },
      tx,
    );
    await stampLastMessage(
      conversationId,
      { lastSeq: seq, lastMessageId: row.id, lastMessageAt: row.createdAt },
      tx,
    );
    await emit({
      type: "chat.messageSent",
      conversationId,
      messageId: row.id,
      seq,
      actorUserId: senderId,
      chapterId: locked.chapterId,
    });
    return { message: toMessageView(row, dek), created: true };
  });

  if (created) {
    await publishToUsers(await findMemberUserIds(conversationId), {
      type: "message.created",
      conversationId,
      message,
    });
  }
  return message;
}

export async function editMessage(
  input: EditMessageInput,
): Promise<ChatMessageView> {
  if (input.text.trim().length > MAX_MESSAGE_CHARS)
    throw new DomainError("tooLong");
  const { messageId, userId, text } = editMessageInput.parse(input);

  const row = await findMessageById(messageId);
  if (!row) throw new DomainError("unknownConversation");
  if (row.senderId !== userId) throw new DomainError("notSender");
  if (row.deletedAt !== null) throw new DomainError("editWindowClosed");
  if (Date.now() - row.createdAt.getTime() > EDIT_WINDOW_MS)
    throw new DomainError("editWindowClosed");
  await requireMembership(row.conversationId, userId);

  const dek = dekOf(row.conversation);
  const updated = await stampMessageEdited(
    messageId,
    encryptText(dek, text, row.conversationId),
    new Date(),
  );
  const message = toMessageView(updated, dek);

  await publishToUsers(await findMemberUserIds(row.conversationId), {
    type: "message.updated",
    conversationId: row.conversationId,
    message,
  });
  return message;
}

export async function deleteMessage(
  input: DeleteMessageInput,
): Promise<ChatMessageView> {
  const { messageId, userId } = deleteMessageInput.parse(input);

  const row = await findMessageById(messageId);
  if (!row) throw new DomainError("unknownConversation");
  if (row.senderId !== userId) throw new DomainError("notSender");
  await requireMembership(row.conversationId, userId);

  const updated = await stampMessageDeleted(messageId, EMPTY_BODY, new Date());
  const message = toMessageView(updated, dekOf(row.conversation));

  await publishToUsers(await findMemberUserIds(row.conversationId), {
    type: "message.updated",
    conversationId: row.conversationId,
    message,
  });
  return message;
}

export async function toggleReaction(
  input: ToggleReactionInput,
): Promise<ReactionView[]> {
  const { messageId, userId, emoji } = toggleReactionInput.parse(input);

  const row = await findMessageById(messageId);
  if (!row) throw new DomainError("unknownConversation");
  await requireMembership(row.conversationId, userId);

  if (await findReaction(messageId, userId, emoji))
    await deleteReaction(messageId, userId, emoji);
  else await insertReaction(messageId, userId, emoji);

  const reactions = toReactions(await findReactionsOfMessage(messageId));
  await publishToUsers(await findMemberUserIds(row.conversationId), {
    type: "reaction.changed",
    conversationId: row.conversationId,
    messageId,
    reactions,
  });
  return reactions;
}

export async function markRead(
  input: MarkReadInput,
): Promise<{ lastReadSeq: number }> {
  const { conversationId, userId, seq } = markReadInput.parse(input);
  const conversation = await requireConversation(conversationId);
  const membership = await requireMembership(conversationId, userId);

  const lastReadSeq = Math.min(
    Math.max(membership.lastReadSeq, seq),
    conversation.lastSeq,
  );
  if (lastReadSeq !== membership.lastReadSeq)
    await stampLastRead(conversationId, userId, lastReadSeq, new Date());

  await publish(conversationChannel(conversationId), {
    type: "read",
    conversationId,
    userId,
    seq: lastReadSeq,
  });
  return { lastReadSeq };
}

export async function setTyping({
  conversationId,
  userId,
  typing,
}: {
  conversationId: string;
  userId: string;
  typing: boolean;
}): Promise<void> {
  await requireMembership(conversationId, userId);
  await publish(conversationChannel(conversationId), {
    type: "typing",
    conversationId,
    userId,
    typing,
    until: new Date(Date.now() + TYPING_WINDOW_MS).toISOString(),
  });
}

export async function setMute(input: MuteInput): Promise<void> {
  const { conversationId, userId, until } = muteInput.parse(input);
  await requireMembership(conversationId, userId);
  await stampMutedUntil(
    conversationId,
    userId,
    until === null ? null : new Date(until),
  );
}

export async function leaveGroup({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  const { message, memberIds } = await transaction(async (tx) => {
    await lockConversation(conversationId, tx);
    const conversation = await requireConversation(conversationId, tx);
    if (conversation.kind === "direct")
      throw new DomainError("cannotLeaveDirect");
    await requireMembership(conversationId, userId, tx);

    await deleteConversationMember(conversationId, userId, tx);
    const row = await appendSystemMessage(
      conversation,
      { type: "left", actorUserId: userId },
      tx,
    );
    return {
      message: toMessageView(row, dekOf(conversation)),
      memberIds: await findMemberUserIds(conversationId, tx),
    };
  });

  await publishToUsers(memberIds, {
    type: "message.created",
    conversationId,
    message,
  });
  await publishToUsers(memberIds, {
    type: "member.left",
    conversationId,
    userId,
  });
  await publishToUsers(memberIds, {
    type: "conversation.updated",
    conversationId,
    patch: { memberCount: memberIds.length },
  });
}

export async function setAnnouncementOnly({
  conversationId,
  userId,
  on,
}: {
  conversationId: string;
  userId: string;
  on: boolean;
}): Promise<void> {
  const { message, memberIds } = await transaction(async (tx) => {
    await lockConversation(conversationId, tx);
    const conversation = await requireConversation(conversationId, tx);
    const membership = await requireMembership(conversationId, userId, tx);
    if (membership.role !== "owner") throw new DomainError("notOwner");

    const memberIds = await findMemberUserIds(conversationId, tx);
    if (!on && memberIds.length > GROUP_ANNOUNCEMENT_THRESHOLD)
      throw new DomainError("aboveThreshold");

    await stampAnnouncementOnly(conversationId, on, tx);
    const row = await appendSystemMessage(
      conversation,
      { type: on ? "announcementOn" : "announcementOff", actorUserId: userId },
      tx,
    );
    return { message: toMessageView(row, dekOf(conversation)), memberIds };
  });

  await publishToUsers(memberIds, {
    type: "message.created",
    conversationId,
    message,
  });
  await publishToUsers(memberIds, {
    type: "conversation.updated",
    conversationId,
    patch: { announcementOnly: on },
  });
}

export async function freeze(conversationId: string): Promise<void> {
  const conversation = await requireConversation(conversationId);
  if (conversation.frozenAt) return;

  const frozenAt = new Date();
  await stampFrozenAt(conversationId, frozenAt);
  await publishToUsers(await findMemberUserIds(conversationId), {
    type: "conversation.updated",
    conversationId,
    patch: { frozenAt: frozenAt.toISOString() },
  });
}

export async function continueConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  const result = await transaction(async (tx) => {
    await lockConversation(conversationId, tx);
    const conversation = await requireConversation(conversationId, tx);
    await requireMembership(conversationId, userId, tx);
    if (!conversation.frozenAt) return null;

    await stampFrozenAt(conversationId, null, tx);
    const row = await appendSystemMessage(
      conversation,
      { type: "continued", actorUserId: userId },
      tx,
    );
    return {
      message: toMessageView(row, dekOf(conversation)),
      memberIds: await findMemberUserIds(conversationId, tx),
    };
  });
  if (!result) return;

  await publishToUsers(result.memberIds, {
    type: "message.created",
    conversationId,
    message: result.message,
  });
  await publishToUsers(result.memberIds, {
    type: "conversation.updated",
    conversationId,
    patch: { frozenAt: null },
  });
}

export const countUnreadConversations = (userId: string) =>
  countUnreadMemberships(userId, new Date());

export async function listConversationsInScope({
  chapterIds,
  take,
  before,
}: {
  chapterIds: string[] | "all";
  take?: number;
  before?: string;
}): Promise<Omit<ConversationSummary, "me">[]> {
  const conversations = await findConversationsInScope({
    chapterIds: chapterIds === "all" ? null : chapterIds,
    take: take ?? CONVERSATION_PAGE_SIZE,
    before: before ? new Date(before) : undefined,
  });
  const lastMessages = await loadLastMessages(conversations);
  return conversations.map((conversation) =>
    toScopedSummary(
      conversation,
      null,
      lastMessages.get(conversation.id) ?? null,
    ),
  );
}

export async function readConversationAsAdmin(
  conversationId: string,
  opts: { beforeSeq?: number; take?: number } = {},
): Promise<{
  conversation: Omit<ConversationSummary, "me">;
  members: MemberView[];
  messages: ChatMessageView[];
} | null> {
  const conversation = await findConversationWithCounts(conversationId);
  if (!conversation) return null;

  const dek = dekOf(conversation);
  const [lastMessages, members, rows] = await Promise.all([
    loadLastMessages([conversation]),
    findMembersOfConversation(conversationId),
    findMessages(conversationId, {
      beforeSeq: opts.beforeSeq,
      take: opts.take ?? MESSAGE_PAGE_SIZE,
    }),
  ]);

  return {
    conversation: toScopedSummary(
      conversation,
      null,
      lastMessages.get(conversation.id) ?? null,
    ),
    members: members.slice(0, MEMBER_VIEW_LIMIT).map(toMemberView),
    messages: rows.map((row) => toMessageView(row, dek)),
  };
}

export const pruneOldMessages = (olderThan: string, batch = PRUNE_BATCH) =>
  deleteMessagesOlderThan(new Date(olderThan), batch);

export const purgeEmptyConversations = async () =>
  (await deleteEmptyConversations()).count;
