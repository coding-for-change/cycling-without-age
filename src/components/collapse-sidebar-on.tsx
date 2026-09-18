"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

export function CollapseSidebarOn({ prefix }: { prefix: string }) {
  const pathname = usePathname();
  const { open, setOpen, isMobile } = useSidebar();
  const inside = pathname === prefix || pathname.startsWith(`${prefix}/`);
  const latestOpen = useRef(open);
  const remembered = useRef<boolean | null>(null);

  useEffect(() => {
    latestOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (isMobile) return;
    if (inside) {
      if (remembered.current !== null) return;
      remembered.current = latestOpen.current;
      setOpen(false);
      return;
    }
    if (remembered.current === null) return;
    setOpen(remembered.current);
    remembered.current = null;
  }, [inside, isMobile, setOpen]);

  return null;
}
