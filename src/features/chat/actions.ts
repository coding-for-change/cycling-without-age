"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { syncInbox } from "@/use-cases/chat/chat-inbox";
import type { InboxItem } from "@/use-cases/chat/chat-inbox";
import {
  searchPeople,
  startDirectChatWithUser,
} from "@/use-cases/chat/start-direct-chat";
import { createGroupChat } from "@/use-cases/chat/create-group-chat";
import {
  GROUP_MAX_MEMBERS,
  GROUP_MIN_OTHER_MEMBERS,
  MUTE_FOREVER,
  chat,
  emoji,
  groupTitle,
} from "./index";
import type { ChatMessageView, ReactionView } from "./index";

export type ChatActionError =
  | "notMember"
  | "frozen"
  | "announcementOnly"
  | "tooLong"
  | "notSender"
  | "editWindowClosed"
  | "rateLimited"
  | "generic";

export type ChatActionResult =
  { ok: true } | { ok: false; error: ChatActionError };

const GENERIC = { ok: false, error: "generic" } as const;
const RATE_LIMITED = { ok: false, error: "rateLimited" } as const;

const failed = (error: unknown) =>
  actionFailure(error, {
    notMember: "notMember",
    unknownConversation: "notMember",
    notOwner: "notMember",
    frozen: "frozen",
    announcementOnly: "announcementOnly",
    tooLong: "tooLong",
    notSender: "notSender",
    editWindowClosed: "editWindowClosed",
  } as const);

const id = z.string().min(1).max(64);
const seq = z.number().int().min(0);

const sendInput = z.object({
  conversationId: id,
  text: z.string().min(1),
  clientId: z.string().min(1).max(64),
  replyToId: id.optional(),
});

export async function sendMessageAction(
  input: z.input<typeof sendInput>,
): Promise<
  { ok: true; message: ChatMessageView } | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = sendInput.safeParse(input);
  if (!parsed.success) return GENERIC;
  if (
    !withinRateLimit(`chat-send:${session.user.id}`, {
      max: 20,
      windowMs: 10_000,
    })
  )
    return RATE_LIMITED;

  try {
    const message = await chat.sendMessage({
      ...parsed.data,
      senderId: session.user.id,
    });
    return { ok: true, message };
  } catch (error) {
    return failed(error);
  }
}

const editInput = z.object({ messageId: id, text: z.string().min(1) });

export async function editMessageAction(
  input: z.input<typeof editInput>,
): Promise<
  { ok: true; message: ChatMessageView } | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = editInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    const message = await chat.editMessage({
      ...parsed.data,
      userId: session.user.id,
    });
    return { ok: true, message };
  } catch (error) {
    return failed(error);
  }
}

const messageInput = z.object({ messageId: id });

export async function deleteMessageAction(
  input: z.input<typeof messageInput>,
): Promise<
  { ok: true; message: ChatMessageView } | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = messageInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    const message = await chat.deleteMessage({
      messageId: parsed.data.messageId,
      userId: session.user.id,
    });
    return { ok: true, message };
  } catch (error) {
    return failed(error);
  }
}

const reactionInput = z.object({ messageId: id, emoji });

export async function toggleReactionAction(
  input: z.input<typeof reactionInput>,
): Promise<
  | { ok: true; reactions: ReactionView[] }
  | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = reactionInput.safeParse(input);
  if (!parsed.success) return GENERIC;
  if (
    !withinRateLimit(`chat-react:${session.user.id}`, {
      max: 30,
      windowMs: 10_000,
    })
  )
    return RATE_LIMITED;

  try {
    const reactions = await chat.toggleReaction({
      ...parsed.data,
      userId: session.user.id,
    });
    return { ok: true, reactions };
  } catch (error) {
    return failed(error);
  }
}

const markReadActionInput = z.object({ conversationId: id, seq });

export async function markReadAction(
  input: z.input<typeof markReadActionInput>,
): Promise<
  { ok: true; lastReadSeq: number } | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = markReadActionInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    const { lastReadSeq } = await chat.markRead({
      ...parsed.data,
      userId: session.user.id,
    });
    return { ok: true, lastReadSeq };
  } catch (error) {
    return failed(error);
  }
}

const typingInput = z.object({ conversationId: id, typing: z.boolean() });

export async function typingAction(
  input: z.input<typeof typingInput>,
): Promise<ChatActionResult> {
  const session = await requireAuth();
  const parsed = typingInput.safeParse(input);
  if (!parsed.success) return GENERIC;
  if (
    !withinRateLimit(`chat-typing:${session.user.id}`, {
      max: 1,
      windowMs: 2_000,
    })
  )
    return { ok: true };

  try {
    await chat.setTyping({ ...parsed.data, userId: session.user.id });
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

const mutePreset = z.enum(["8h", "1w", "forever"]).nullable();
const muteActionInput = z.object({ conversationId: id, preset: mutePreset });

const MUTE_MS: Record<"8h" | "1w", number> = {
  "8h": 8 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
};

const muteUntil = (preset: z.infer<typeof mutePreset>) => {
  if (preset === null) return null;
  if (preset === "forever") return MUTE_FOREVER;
  return new Date(Date.now() + MUTE_MS[preset]).toISOString();
};

export async function setMuteAction(
  input: z.input<typeof muteActionInput>,
): Promise<
  | { ok: true; mutedUntil: string | null }
  | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = muteActionInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  const until = muteUntil(parsed.data.preset);
  try {
    await chat.setMute({
      conversationId: parsed.data.conversationId,
      userId: session.user.id,
      until,
    });
    return { ok: true, mutedUntil: until };
  } catch (error) {
    return failed(error);
  }
}

const conversationInput = z.object({ conversationId: id });

export async function leaveGroupAction(
  input: z.input<typeof conversationInput>,
): Promise<ChatActionResult> {
  const session = await requireAuth();
  const parsed = conversationInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    await chat.leaveGroup({
      conversationId: parsed.data.conversationId,
      userId: session.user.id,
    });
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

const announcementInput = z.object({ conversationId: id, on: z.boolean() });

export async function setAnnouncementOnlyAction(
  input: z.input<typeof announcementInput>,
): Promise<ChatActionResult> {
  const session = await requireAuth();
  const parsed = announcementInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    await chat.setAnnouncementOnly({ ...parsed.data, userId: session.user.id });
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function continueConversationAction(
  input: z.input<typeof conversationInput>,
): Promise<ChatActionResult> {
  const session = await requireAuth();
  const parsed = conversationInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    await chat.continueConversation({
      conversationId: parsed.data.conversationId,
      userId: session.user.id,
    });
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

const loadMessagesInput = z.object({
  conversationId: id,
  beforeSeq: seq.optional(),
  afterSeq: seq.optional(),
});

export async function loadMessagesAction(
  input: z.input<typeof loadMessagesInput>,
): Promise<
  | { ok: true; messages: ChatMessageView[] }
  | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = loadMessagesInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    const messages = await chat.listMessages(
      parsed.data.conversationId,
      session.user.id,
      { beforeSeq: parsed.data.beforeSeq, afterSeq: parsed.data.afterSeq },
    );
    return { ok: true, messages };
  } catch (error) {
    return failed(error);
  }
}

const syncInboxInput = z.object({ since: z.iso.datetime() });

export async function syncInboxAction(
  input: z.input<typeof syncInboxInput>,
): Promise<
  | { ok: true; conversations: InboxItem[] }
  | { ok: false; error: ChatActionError }
> {
  const session = await requireAuth();
  const parsed = syncInboxInput.safeParse(input);
  if (!parsed.success) return GENERIC;

  try {
    const conversations = await syncInbox(session.user.id, parsed.data.since);
    return { ok: true, conversations };
  } catch (error) {
    return failed(error);
  }
}

export type PeopleSearchError = "rateLimited" | "generic";

export type PersonSuggestion = {
  userId: string;
  name: string;
  avatarSvg: string;
  subtitle: string | null;
};

const searchInput = z.object({ query: z.string().trim().min(1).max(191) });

export async function searchPeopleAction(
  input: z.input<typeof searchInput>,
): Promise<
  | { ok: true; people: PersonSuggestion[] }
  | { ok: false; error: PeopleSearchError }
> {
  const session = await requireAuth();
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return { ok: true, people: [] };
  if (
    !withinRateLimit(`chat-search:${session.user.id}`, {
      max: 60,
      windowMs: 60_000,
    })
  )
    return RATE_LIMITED;

  try {
    const people = await searchPeople({
      viewerUserId: session.user.id,
      viewerAccess: session.access,
      query: parsed.data.query,
    });
    return {
      ok: true,
      people: people.map((person) => ({
        userId: person.userId,
        name: person.name,
        avatarSvg: avatarSvg(avatarSeed(person.email)),
        subtitle: person.chapterName,
      })),
    };
  } catch {
    return GENERIC;
  }
}

export type StartDirectChatError =
  "notFound" | "notReachable" | "self" | "rateLimited" | "generic";

const startDirectInput = z.object({ userId: id });

const startFailed = (error: unknown) =>
  actionFailure(error, {
    notFound: "notFound",
    notReachable: "notReachable",
    self: "self",
  } as const);

export async function startDirectChatAction(
  input: z.input<typeof startDirectInput>,
): Promise<
  | { ok: true; conversationId: string }
  | { ok: false; error: StartDirectChatError }
> {
  const session = await requireAuth();
  const parsed = startDirectInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "notFound" };
  if (
    !withinRateLimit(`chat-start:${session.user.id}`, {
      max: 20,
      windowMs: 3_600_000,
    })
  )
    return RATE_LIMITED;

  try {
    const { conversationId } = await startDirectChatWithUser({
      viewerUserId: session.user.id,
      viewerAccess: session.access,
      targetUserId: parsed.data.userId,
    });
    return { ok: true, conversationId };
  } catch (error) {
    return startFailed(error);
  }
}

export type CreateGroupChatError =
  "notReachable" | "tooFew" | "tooMany" | "rateLimited" | "generic";

const createGroupActionInput = z.object({
  title: groupTitle,
  chapterId: id,
  memberUserIds: z
    .array(id)
    .min(1)
    .max(GROUP_MAX_MEMBERS + 1),
});

export async function createGroupChatAction(
  input: z.input<typeof createGroupActionInput>,
): Promise<
  | { ok: true; conversationId: string }
  | { ok: false; error: CreateGroupChatError }
> {
  const session = await requireAuth();
  const parsed = createGroupActionInput.safeParse(input);
  if (!parsed.success) return GENERIC;
  if (
    !withinRateLimit(`chat-group:${session.user.id}`, {
      max: 5,
      windowMs: 3_600_000,
    })
  )
    return RATE_LIMITED;

  const memberUserIds = [...new Set(parsed.data.memberUserIds)].filter(
    (userId) => userId !== session.user.id,
  );
  if (memberUserIds.length < GROUP_MIN_OTHER_MEMBERS)
    return { ok: false, error: "tooFew" };
  if (memberUserIds.length > GROUP_MAX_MEMBERS)
    return { ok: false, error: "tooMany" };

  try {
    const { conversationId } = await createGroupChat({
      viewerUserId: session.user.id,
      viewerAccess: session.access,
      title: parsed.data.title,
      chapterId: parsed.data.chapterId,
      memberUserIds,
    });
    return { ok: true, conversationId };
  } catch (error) {
    return actionFailure(error, {
      notReachable: "notReachable",
      notMember: "notReachable",
      notChapterMember: "notReachable",
    } as const);
  }
}
