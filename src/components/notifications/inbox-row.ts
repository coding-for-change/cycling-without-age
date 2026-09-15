import type { NotificationCategory } from "@/features/notifications";
import type { InboxItem } from "@/use-cases/notifications/inbox";
import {
  formatDate,
  formatRelativeTime,
  wordsLocale,
  type Locale,
} from "@/lib/format";

export type InboxRow = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  unread: boolean;
  dateTime: string;
  when: string;
  whenExact: string;
};

export function toInboxRow(
  item: InboxItem,
  { words, notation, now }: { words: string; notation: Locale; now: Date },
): InboxRow {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    body: item.body,
    href: item.href,
    unread: item.readAt === null,
    dateTime: item.createdAt.toISOString(),
    when: formatRelativeTime(item.createdAt, wordsLocale(words), now),
    whenExact: formatDate(item.createdAt, notation),
  };
}

const BADGE_CAP = 9;

export function formatBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > BADGE_CAP ? `${BADGE_CAP}+` : String(count);
}
