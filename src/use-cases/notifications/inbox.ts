import { getEmailStrings } from "@/emails/strings";
import { notifications } from "@/features/notifications";
import type { NotificationCategory } from "@/features/notifications";
import type { Locale } from "@/lib/i18n/locales";
import { findKind } from "./kinds";

export type InboxItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
  readAt: Date | null;
  seenAt: Date | null;
};

export async function listInbox(
  userId: string,
  locale: Locale,
): Promise<InboxItem[]> {
  const rows = await notifications.listInbox(userId);
  const strings = getEmailStrings(locale);

  return rows.flatMap((row) => {
    const kind = findKind(row.event.type);
    if (!kind) return [];

    const params = kind.payload.safeParse(row.payload);
    if (!params.success) return [];

    const message = kind.message(params.data, strings, locale);
    return [
      {
        id: row.id,
        category: kind.category,
        title: message.title ?? message.heading,
        body: message.body,
        href: row.href,
        createdAt: row.createdAt,
        readAt: row.readAt,
        seenAt: row.seenAt,
      },
    ];
  });
}
