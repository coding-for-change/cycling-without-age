"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  Inbox,
  Mail,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isAppPath } from "@/lib/app-path";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  markInboxSeen,
  markNotificationRead,
} from "@/features/notifications/actions";
import { haptics } from "@/lib/native/haptics";
import type { Dictionary } from "@/lib/i18n";
import { cn, fill } from "@/lib/utils";
import { formatBadge, type InboxCategory, type InboxRow } from "./inbox-row";

const ICON: Record<InboxCategory, LucideIcon> = {
  application: ClipboardCheck,
  invitation: Mail,
  welcome: Sparkles,
  membership: Users,
};

/**
 * Local state, not `useOptimistic`: the actions deliberately do not revalidate,
 * so the props never change underneath and an optimistic value would snap back
 * the moment its transition ends. The server re-mounts this component through
 * `key` when the inbox itself changes.
 */
export function NotificationBellMenu({
  rows,
  unseen,
  strings,
  className,
}: {
  rows: InboxRow[];
  unseen: number;
  strings: Dictionary["notifications"];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [readIds, setReadIds] = useState<readonly string[]>([]);
  const [, startTransition] = useTransition();

  const shown = dismissed ? 0 : unseen;
  const badge = formatBadge(shown);
  const label =
    shown > 0 ? fill(strings.bellWithCount, { count: unseen }) : strings.bell;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next || dismissed || unseen === 0) return;
    setDismissed(true);
    startTransition(async () => {
      await markInboxSeen();
    });
  }

  function markRead(id: string) {
    setReadIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function handleRowClick(event: MouseEvent<HTMLAnchorElement>, row: InboxRow) {
    markRead(row.id);
    // A modifier click belongs to the browser — open the tab, still mark read.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      startTransition(async () => {
        await markNotificationRead(row.id);
      });
      return;
    }

    event.preventDefault();
    if (!isAppPath(row.href)) return;
    haptics.tap();
    setOpen(false);
    startTransition(async () => {
      // Read first, navigate second: the destination renders its own bell.
      await markNotificationRead(row.id);
      router.push(row.href);
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label}
          className={cn(
            "relative size-9 shrink-0 rounded-full border-line bg-canvas shadow-none hover:bg-grey-tint",
            className,
          )}
        >
          <Bell
            aria-hidden
            className="size-4"
          />
          {badge ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-xs leading-none font-semibold tabular-nums text-white"
            >
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      {/* Empty while nothing is new, so the region speaks only on a change
          and never doubles the button's own label. */}
      <span
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {shown > 0 ? label : ""}
      </span>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border-line p-0"
      >
        <h2 className="border-b border-line px-4 py-3 font-display text-sm font-bold">
          {strings.title}
        </h2>

        {rows.length === 0 ? (
          <Empty className="gap-4 px-5 py-10 md:p-10">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-mint-tint text-mint-deep"
              >
                <Inbox aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-base">
                {strings.empty.title}
              </EmptyTitle>
              <EmptyDescription className="text-2sm text-ink-soft">
                {strings.empty.body}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="max-h-[min(60svh,28rem)] divide-y divide-line overflow-y-auto">
            {rows.map((row) => {
              const Icon = ICON[row.category];
              const unread = row.unread && !readIds.includes(row.id);
              return (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    prefetch={false}
                    onClick={(event) => handleRowClick(event, row)}
                    className="flex gap-3 px-4 py-3 transition-colors outline-none hover:bg-canvas-deep focus-visible:bg-canvas-deep motion-reduce:transition-none"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint-tint">
                      <Icon
                        aria-hidden
                        className="size-4 text-mint-deep"
                      />
                      <span className="sr-only">
                        {strings.categories[row.category]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-2sm font-medium">
                          {row.title}
                        </span>
                        {unread ? (
                          <>
                            <span
                              aria-hidden
                              className="flex h-5 shrink-0 items-center"
                            >
                              <span className="size-2 rounded-full bg-mint-deep" />
                            </span>
                            <span className="sr-only">{strings.unread}</span>
                          </>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-2sm text-ink-soft">
                        {row.body}
                      </span>
                      <time
                        dateTime={row.dateTime}
                        title={row.whenExact}
                        className="mt-1 block text-2sm text-ink-faint"
                      >
                        {row.when}
                      </time>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
