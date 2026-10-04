"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptics } from "@/lib/native/haptics";
import { useKeyboardOpen } from "@/lib/native/keyboard";
import {
  hideNativeTabs,
  onTabSelect,
  setNativeTabs,
  type NativeTab,
} from "@/lib/native/navigation";
import { isSettlingFromSwipeBack } from "@/lib/native/swipe-back";
import {
  activeTabKey,
  isConversationPath,
  type MemberNavKey,
  type ResolvedMemberNavItem,
} from "../nav";

const SWIPE_SETTLE_MS = 650;

export function NativeTabBar({
  items,
  badges,
}: {
  items: ResolvedMemberNavItem[];
  badges?: Partial<Record<MemberNavKey, number>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  const narrow = useIsMobile();

  const selectedId = activeTabKey(pathname, items);
  const hidden = !narrow || keyboardOpen || isConversationPath(pathname);

  const tabs = useMemo<NativeTab[]>(
    () =>
      items
        .filter((item) => item.tab)
        .map(({ key, label, symbol }) => {
          const badge = badges?.[key] ?? 0;
          return {
            id: key,
            title: label,
            icon: { ios: { sfSymbol: symbol } },
            ...(badge > 0 ? { badge } : {}),
          };
        }),
    [items, badges],
  );

  const latest = useRef({ items, selectedId, pathname });
  useEffect(() => {
    latest.current = { items, selectedId, pathname };
  }, [items, selectedId, pathname]);

  useEffect(() => {
    const state = { tabs, selectedId, hidden };
    if (hidden || !isSettlingFromSwipeBack()) {
      void setNativeTabs(state);
      return;
    }
    const timer = setTimeout(() => void setNativeTabs(state), SWIPE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [tabs, selectedId, hidden]);

  useEffect(
    () =>
      onTabSelect((id) => {
        const {
          items: current,
          selectedId: active,
          pathname: at,
        } = latest.current;
        const target = current.find((item) => item.tab && item.key === id);
        if (!target || at === target.href) return;
        if (target.key === active) {
          router.push(target.href, { transitionTypes: ["pop"] });
          return;
        }
        haptics.tap();
        router.push(target.href, { transitionTypes: ["tab"] });
      }),
    [router],
  );

  useEffect(
    () => () => {
      void hideNativeTabs();
    },
    [],
  );

  return null;
}
