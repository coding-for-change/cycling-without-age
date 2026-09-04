import { Suspense, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminChrome } from "./_components/admin-chrome";
import { AdminCommandBar } from "./_components/admin-command-bar";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminSidebarSkeleton } from "./_components/sidebar-skeleton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="min-h-dvh">
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
    <div className="flex h-16 shrink-0 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] lg:px-6">
      <Skeleton className="size-7 rounded-md" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="ml-auto h-9 w-20 rounded-full" />
    </div>
  );
}
