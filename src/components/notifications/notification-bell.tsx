import { headers } from "next/headers";
import { getSession } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { notifications } from "@/features/notifications";
import { listInbox } from "@/use-cases/notifications/inbox";
import { toInboxRow } from "./inbox-row";
import { NotificationBellMenu } from "./notification-bell-menu";

export async function NotificationBell({ className }: { className?: string }) {
  const session = await getSession();
  if (!session) return null;

  const [dict, language, head] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
  ]);

  const [items, unseen] = await Promise.all([
    listInbox(session.user.id, language),
    notifications.unseenCount(session.user.id),
  ]);

  const now = new Date();
  const notation = resolveLocale(head.get("accept-language"));
  const rows = items.map((item) =>
    toInboxRow(item, { words: language, notation, now }),
  );

  const stamp = [
    unseen,
    rows.length,
    rows[0]?.id ?? "",
    rows.filter((row) => row.unread).length,
  ].join(":");

  return (
    <NotificationBellMenu
      key={stamp}
      rows={rows}
      unseen={unseen}
      strings={dict.notifications}
      locale={language}
      className={className}
    />
  );
}
