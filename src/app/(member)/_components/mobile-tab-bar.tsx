"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatBadge } from "@/features/chat/components/chat-badge";
import { ICONS } from "@/components/icons";
import { haptics } from "@/lib/native/haptics";
import { useKeyboardOpen } from "@/lib/native/keyboard";
import { cn } from "@/lib/utils";
import {
  activeTabKey,
  isConversationPath,
  type MemberNavKey,
  type ResolvedMemberNavItem,
} from "../nav";

type Intent = { key: MemberNavKey; from: string };

export function MobileTabBar({
  items,
  label,
  badges,
}: {
  items: ResolvedMemberNavItem[];
  label: string;
  badges?: Partial<Record<MemberNavKey, number>>;
}) {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  const [intent, setIntent] = useState<Intent | null>(null);

  const tabs = items.filter((item) => item.tab);
  const settled = activeTabKey(pathname, items);
  const active = intent && intent.from === pathname ? intent.key : settled;
  const activeIndex = tabs.findIndex((item) => item.key === active);

  if (keyboardOpen || isConversationPath(pathname)) return null;

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="relative h-(--tabbar-h) w-full max-w-md rounded-full border border-line bg-canvas/80 p-1 shadow-lift backdrop-blur-md">
        {activeIndex >= 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-mint-deep transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem) / ${tabs.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        ) : null}
        <ul className="relative flex h-full items-stretch">
          {tabs.map(({ key, href, label: itemLabel, icon }) => {
            const Icon = ICONS[icon];
            const current = key === active;

            return (
              <li
                key={key}
                className="min-w-0 flex-1"
              >
                <Link
                  href={href}
                  aria-current={key === settled ? "page" : undefined}
                  onClick={() => {
                    if (current) return;
                    haptics.tap();
                    setIntent({ key, from: pathname });
                  }}
                  className={cn(
                    "flex h-full min-h-11 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-full px-2 text-xs font-medium transition-colors duration-300 motion-reduce:transition-none",
                    current ? "text-white" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <span className="relative flex">
                    <Icon
                      aria-hidden
                      className="size-5"
                    />
                    <ChatBadge
                      count={badges?.[key] ?? 0}
                      className="absolute -top-1.5 -right-2.5 h-4 min-w-4 bg-red px-1"
                    />
                  </span>
                  <span className="max-w-full truncate">{itemLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
