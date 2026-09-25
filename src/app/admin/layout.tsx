import { Suspense, type ReactNode } from "react";
import { CollapseSidebarOn } from "@/components/collapse-sidebar-on";
import { NotificationBellSkeleton } from "@/components/notifications/notification-bell-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminChrome } from "./_components/admin-chrome";
import { AdminCommandBar } from "./_components/admin-command-bar";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminSidebarSkeleton } from "./_components/sidebar-skeleton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="min-h-dvh">
      <Suspense fallback={null}>
        <CollapseSidebarOn prefix="/admin/chat" />
      </Suspense>
      <Suspense fallback={<AdminSidebarSkeleton />}>
        <AdminSidebar />
      </Suspense>

      <SidebarInset className="bg-canvas md:peer-data-[variant=inset]:shadow-soft">
        <Suspense fallback={<ChromeFallback />}>
          <AdminChrome />
        </Suspense>
        {children}
      </SidebarInset>

      <Suspense fallback={null}>
        <AdminCommandBar />
      </Suspense>
    </SidebarProvider>
  );
}

function ChromeFallback() {
  return (
    <div className="flex min-h-16 shrink-0 items-center gap-3 px-4 pt-safe lg:px-6">
      <Skeleton className="-ml-2 size-9 rounded-md md:ml-0 md:size-7" />
      <Skeleton className="hidden h-4 w-32 md:block" />
      <div className="ml-auto flex items-center gap-2">
        <NotificationBellSkeleton className="size-9" />
        <Skeleton className="hidden h-9 w-20 rounded-full md:block" />
      </div>
    </div>
  );
}
