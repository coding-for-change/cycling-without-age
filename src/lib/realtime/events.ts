import { z } from "zod";

export const reactionView = z.object({
  emoji: z.string().min(1),
  userIds: z.array(z.string().min(1)),
});
export type ReactionView = z.infer<typeof reactionView>;

export const systemMeta = z.object({
  type: z.enum(["left", "continued", "announcementOn", "announcementOff"]),
  actorUserId: z.string().min(1).nullable(),
});
export type SystemMeta = z.infer<typeof systemMeta>;

export const replyPreview = z.object({
  id: z.string().min(1),
  senderId: z.string().min(1).nullable(),
  text: z.string(),
});
export type ReplyPreview = z.infer<typeof replyPreview>;

export const chatMessageView = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  seq: z.number().int(),
  senderId: z.string().min(1).nullable(),
  kind: z.enum(["text", "system"]),
  text: z.string(),
  meta: systemMeta.nullable(),
  replyTo: replyPreview.nullable(),
  clientId: z.string().min(1).nullable(),
  editedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  reactions: z.array(reactionView),
});
export type ChatMessageView = z.infer<typeof chatMessageView>;

export const conversationPatch = z
  .object({
    title: z.string().nullable(),
    announcementOnly: z.boolean(),
    frozenAt: z.string().nullable(),
    memberCount: z.number().int(),
  })
  .partial();
export type ConversationPatch = z.infer<typeof conversationPatch>;

export const realtimeEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message.created"),
    conversationId: z.string().min(1),
    message: chatMessageView,
  }),
  z.object({
    type: z.literal("message.updated"),
    conversationId: z.string().min(1),
    message: chatMessageView,
  }),
  z.object({
    type: z.literal("reaction.changed"),
    conversationId: z.string().min(1),
    messageId: z.string().min(1),
    reactions: z.array(reactionView),
  }),
  z.object({
    type: z.literal("conversation.updated"),
    conversationId: z.string().min(1),
    patch: conversationPatch,
  }),
  z.object({
    type: z.literal("conversation.created"),
    conversationId: z.string().min(1),
  }),
  z.object({
    type: z.literal("member.left"),
    conversationId: z.string().min(1),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal("read"),
    conversationId: z.string().min(1),
    userId: z.string().min(1),
    seq: z.number().int(),
  }),
  z.object({
    type: z.literal("typing"),
    conversationId: z.string().min(1),
    userId: z.string().min(1),
    typing: z.boolean(),
    until: z.string(),
  }),
  z.object({
    type: z.literal("presence"),
    userId: z.string().min(1),
    online: z.boolean(),
  }),
]);
export type RealtimeEvent = z.infer<typeof realtimeEvent>;
export type RealtimeEventType = RealtimeEvent["type"];

export const parseRealtimeEvent = (raw: unknown): RealtimeEvent | null => {
  const parsed = realtimeEvent.safeParse(raw);
  return parsed.success ? parsed.data : null;
};
