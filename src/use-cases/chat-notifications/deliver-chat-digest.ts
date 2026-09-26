import { createElement } from "react";
import { ChatDigestEmail } from "@/emails/chat-digest";
import type { ChatDigestGroup, ChatDigestMessage } from "@/emails/chat-digest";
import { getEmailStrings, resolveEmailLocale } from "@/emails/strings";
import { chat } from "@/features/chat";
import type { ChatMessageView } from "@/features/chat";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { APP_URL } from "@/lib/app-url";
import { formatTime, resolveLocale } from "@/lib/format";
import type { Locale as NotationLocale } from "@/lib/format";
import { isPhoneTempEmail } from "@/lib/identity";
import { sendMail } from "@/lib/mailer";
import { formatMessage } from "@/lib/i18n/format";
import { isMuted } from "./digest-window";
import { stripMarkdown } from "./preview";

const DIGEST_MESSAGE_LIMIT = 50;

// No account stores a time zone, so a digest reads the clock of its language's region.
const TIME_ZONE: Record<NotationLocale, string> = {
  "en-US": "America/New_York",
  "en-GB": "Europe/London",
  "de-DE": "Europe/Berlin",
  "da-DK": "Europe/Copenhagen",
};

export type ChatDigestJob = {
  recipientUserId: string;
  conversationId: string;
  windowStartedAt: string;
};

const groupBySender = (
  messages: ChatMessageView[],
  nameOf: (senderId: string | null) => string,
  timeOf: (iso: string) => string,
): ChatDigestGroup[] =>
  messages.reduce<ChatDigestGroup[]>((groups, message) => {
    const sender = nameOf(message.senderId);
    const line = {
      text: stripMarkdown(message.text),
      time: timeOf(message.createdAt),
    };
    const open = groups.at(-1);
    if (open && open.sender === sender) open.lines.push(line);
    else groups.push({ sender, lines: [line] });
    return groups;
  }, []);

const plainText = (message: ChatDigestMessage, href: string) =>
  [
    message.heading,
    message.intro,
    ...message.groups.map(({ sender, lines }) =>
      [sender, ...lines.map((line) => `${line.time} ${line.text}`)].join("\n"),
    ),
    message.more,
    `${message.cta}: ${href}`,
  ]
    .filter(Boolean)
    .join("\n\n");

export type ChatDigestOutcome =
  | "sent"
  | "left conversation"
  | "already read"
  | "muted"
  | "email disabled for chat"
  | "no email address"
  | "push available"
  | "nothing unread";

export async function deliverChatDigest({
  recipientUserId,
  conversationId,
}: ChatDigestJob): Promise<ChatDigestOutcome> {
  const conversation = await chat.getConversation(
    conversationId,
    recipientUserId,
  );
  if (!conversation) return "left conversation";
  if (conversation.lastSeq <= conversation.me.lastReadSeq)
    return "already read";
  if (isMuted(conversation.me.mutedUntil)) return "muted";

  const account = await profile.getProfile(recipientUserId);
  if (!account?.notifyChatEmail) return "email disabled for chat";
  if (!account.email || isPhoneTempEmail(account.email))
    return "no email address";

  if (account.notifyChatPush) {
    const tokens = await notifications.listDeviceTokens(recipientUserId);
    if (tokens.length > 0) return "push available";
  }

  const loaded = await chat.listMessages(conversationId, recipientUserId, {
    afterSeq: conversation.me.lastReadSeq,
    take: DIGEST_MESSAGE_LIMIT,
  });
  const unread = loaded.filter(
    (message) => message.kind === "text" && !message.deletedAt,
  );
  if (unread.length === 0) return "nothing unread";

  const locale = resolveEmailLocale(account.locale);
  const strings = getEmailStrings(locale).chatDigest;
  const notation = resolveLocale(account.locale);
  const timeZone = TIME_ZONE[notation];

  const profiles = await profile.getProfiles(
    [
      ...unread.map((message) => message.senderId),
      conversation.otherUserId,
    ].filter((userId): userId is string => userId !== null),
  );
  const names = new Map(profiles.map((person) => [person.id, person.name]));

  const title =
    conversation.title ??
    (conversation.otherUserId
      ? (names.get(conversation.otherUserId) ?? strings.someone)
      : strings.someone);

  const truncated = loaded.length === DIGEST_MESSAGE_LIMIT;
  const total = conversation.lastSeq - conversation.me.lastReadSeq;
  const count = truncated ? total : unread.length;
  const remaining = truncated ? total - unread.length : 0;

  const message: ChatDigestMessage = {
    subject:
      conversation.kind === "group"
        ? formatMessage(strings.subjectGroup, { count, title }, locale)
        : formatMessage(strings.subjectDirect, { name: title }, locale),
    preview: strings.preview,
    heading: strings.heading,
    intro: formatMessage(strings.intro, { count, title }, locale),
    cta: strings.cta,
    footer: strings.footer,
    groups: groupBySender(
      unread,
      (senderId) => (senderId ? names.get(senderId) : null) ?? strings.someone,
      (iso) => formatTime(iso, notation, timeZone),
    ),
    more:
      remaining > 0
        ? formatMessage(strings.more, { count: remaining }, locale)
        : null,
  };

  const href = `${APP_URL}/chat/${conversationId}`;
  await sendMail({
    to: account.email,
    subject: message.subject,
    text: plainText(message, href),
    react: createElement(ChatDigestEmail, { locale, message, href }),
  });
  return "sent";
}
