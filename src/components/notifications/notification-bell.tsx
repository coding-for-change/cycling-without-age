import { headers } from "next/headers";
import { getSession } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { listInbox, unseenCount } from "@/use-cases/notifications/inbox";
import { toInboxRow } from "./inbox-row";
import { NotificationBellMenu } from "./notification-bell-menu";

/**
 * Shared by the admin top bar, the pilot home and the passenger home, so it
 * carries its own session read: a guest browsing `/passenger` gets no bell at
 * all rather than an empty one.
 */
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
    unseenCount(session.user.id),
  ]);

  const now = new Date();
  const notation = resolveLocale(head.get("accept-language"));
  const rows = items.map((item) =>
    toInboxRow(item, { words: language, notation, now }),
  );

  // The menu keeps "seen" and "read" locally, because the actions do not
  // revalidate. This stamp is the server's own truth: identical data re-renders
  // keep those overrides, new data throws them away with the component.
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
      className={className}
    />
  );
}
