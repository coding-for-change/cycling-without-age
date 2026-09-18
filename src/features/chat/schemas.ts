import { z } from "zod";

export const MAX_MESSAGE_CHARS = 4000;

// Above 100 members a group turns into an announcement channel by itself, and
// the owner cannot switch that off again until it shrinks.
export const GROUP_ANNOUNCEMENT_THRESHOLD = 100;

export const GROUP_MAX_MEMBERS = 1000;
export const GROUP_MIN_OTHER_MEMBERS = 2;
export const CONVERSATION_PAGE_SIZE = 50;
export const MESSAGE_PAGE_SIZE = 50;
export const EDIT_WINDOW_MS = 15 * 60_000;
export const MUTE_FOREVER = "9999-12-31T00:00:00.000Z";

export const conversationKind = z.enum(["direct", "group"]);
export type ConversationKind = z.infer<typeof conversationKind>;

export const conversationOrigin = z.enum(["manual", "ride"]);
export type ConversationOrigin = z.infer<typeof conversationOrigin>;

export const conversationMemberRole = z.enum(["owner", "member"]);
export type ConversationMemberRole = z.infer<typeof conversationMemberRole>;

export const chatMessageKind = z.enum(["text", "system"]);
export type ChatMessageKind = z.infer<typeof chatMessageKind>;

export const systemMeta = z.object({
  type: z.enum(["left", "continued", "announcementOn", "announcementOff"]),
  actorUserId: z.string().nullable(),
});
export type SystemMeta = z.infer<typeof systemMeta>;

export type ReactionView = { emoji: string; userIds: string[] };

export type ChatMessageView = {
  id: string;
  conversationId: string;
  seq: number;
  senderId: string | null;
  kind: ChatMessageKind;
  text: string;
  meta: SystemMeta | null;
  replyTo: { id: string; senderId: string | null; text: string } | null;
  clientId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  reactions: ReactionView[];
};

export type ConversationSummary = {
  id: string;
  kind: ConversationKind;
  origin: ConversationOrigin;
  title: string | null;
  chapterId: string | null;
  announcementOnly: boolean;
  frozenAt: string | null;
  lastSeq: number;
  lastMessageAt: string | null;
  otherUserId: string | null;
  memberCount: number;
  lastMessage: ChatMessageView | null;
  me: {
    role: ConversationMemberRole;
    lastReadSeq: number;
    mutedUntil: string | null;
  };
};

export type MemberView = {
  userId: string;
  role: ConversationMemberRole;
  lastReadSeq: number;
  joinedAt: string;
};

const id = z.string().min(1).max(64);
const isoString = z.iso.datetime();

export const sendMessageInput = z.object({
  conversationId: id,
  senderId: id,
  text: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  clientId: z.string().min(1).max(64),
  replyToId: id.optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageInput>;

export const editMessageInput = z.object({
  messageId: id,
  userId: id,
  text: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
});
export type EditMessageInput = z.infer<typeof editMessageInput>;

export const deleteMessageInput = z.object({ messageId: id, userId: id });
export type DeleteMessageInput = z.infer<typeof deleteMessageInput>;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export const isSingleEmoji = (value: string) =>
  [...graphemes.segment(value)].length === 1 &&
  /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(value);

export const emoji = z
  .string()
  .min(1)
  .max(32)
  .refine(isSingleEmoji, "one emoji");

export const groupTitle = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(120));

export const toggleReactionInput = z.object({
  messageId: id,
  userId: id,
  emoji,
});
export type ToggleReactionInput = z.infer<typeof toggleReactionInput>;

export const markReadInput = z.object({
  conversationId: id,
  userId: id,
  seq: z.number().int().min(0),
});
export type MarkReadInput = z.infer<typeof markReadInput>;

export const muteInput = z.object({
  conversationId: id,
  userId: id,
  until: isoString.nullable(),
});
export type MuteInput = z.infer<typeof muteInput>;

export const createGroupInput = z
  .object({
    title: groupTitle,
    chapterId: id,
    createdByUserId: id,
    memberUserIds: z
      .array(id)
      .min(GROUP_MIN_OTHER_MEMBERS)
      .max(GROUP_MAX_MEMBERS)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "members must be unique",
      ),
  })
  .refine(
    ({ createdByUserId, memberUserIds }) =>
      !memberUserIds.includes(createdByUserId),
    "members must not include the creator",
  );
export type CreateGroupInput = z.infer<typeof createGroupInput>;

export const getOrCreateDirectInput = z
  .object({
    userIds: z.tuple([id, id]),
    chapterId: id.nullable(),
    createdByUserId: id,
  })
  .refine(({ userIds }) => userIds[0] !== userIds[1], "userIds must differ");
export type GetOrCreateDirectInput = z.infer<typeof getOrCreateDirectInput>;
