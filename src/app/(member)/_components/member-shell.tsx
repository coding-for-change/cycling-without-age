import { Suspense, type ReactNode } from "react";
import { CollapseSidebarOn } from "@/components/collapse-sidebar-on";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import type { MemberPerspective } from "../nav";
import { MemberChrome, MemberChromeFallback } from "./member-chrome";
import { MemberSidebar } from "./member-sidebar";
import { MemberSidebarSkeleton } from "./member-sidebar-skeleton";
import { MemberTabBar } from "./member-tab-bar";
import { TabBarSkeleton } from "./tab-bar-skeleton";

export function MemberShell({
  perspective,
  children,
}: {
  perspective: MemberPerspective;
  children: ReactNode;
}) {
  return (
    <SidebarProvider className="min-h-dvh">
      <Suspense fallback={null}>
        <CollapseSidebarOn prefix={`${PERSPECTIVE_HOME[perspective]}/chat`} />
      </Suspense>
      <Suspense fallback={<MemberSidebarSkeleton />}>
        <MemberSidebar perspective={perspective} />
      </Suspense>

      <SidebarInset className="bg-canvas pb-tabbar md:pb-0 md:peer-data-[variant=inset]:shadow-soft">
        <Suspense fallback={<MemberChromeFallback />}>
          <MemberChrome perspective={perspective} />
        </Suspense>
        {children}
      </SidebarInset>

      <Suspense fallback={<TabBarSkeleton />}>
        <MemberTabBar perspective={perspective} />
      </Suspense>
    </SidebarProvider>
  );
}
