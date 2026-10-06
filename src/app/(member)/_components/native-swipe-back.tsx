"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setSwipeBackEnabled } from "@/lib/native/swipe-back";
import { isDrillDown, type MemberNavItem } from "../nav";

export function NativeSwipeBack({ items }: { items: MemberNavItem[] }) {
  const pathname = usePathname();
  const enabled = isDrillDown(pathname, items);

  useEffect(() => {
    void setSwipeBackEnabled(enabled);
  }, [enabled]);

  useEffect(
    () => () => {
      void setSwipeBackEnabled(false);
    },
    [],
  );

  return null;
}
