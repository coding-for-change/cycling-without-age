import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { TabsSkeleton } from "../_components/admin-skeletons";
import { ReportsTabs } from "./_components/reports-tabs";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <AdminPageShell>
      <Suspense fallback={<ReportsHeaderSkeleton />}>
        <ReportsHeader />
      </Suspense>
      {children}
    </AdminPageShell>
  );
}

async function ReportsHeader() {
  const dict = await getDictionary();
  return (
    <>
      <AdminPageHeader title={dict.admin.pages.reports.title} />
      <ReportsTabs strings={dict.admin.reports.tabs} />
    </>
  );
}

function ReportsHeaderSkeleton() {
  return (
    <>
      <Skeleton className="h-9 w-36" />
      <TabsSkeleton widths={["w-14", "w-24"]} />
    </>
  );
}
