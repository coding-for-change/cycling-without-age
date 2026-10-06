import { AdminPageShell } from "../_components/admin-page";
import { PageHeaderSkeleton } from "../_components/admin-skeletons";
import { ReportsSkeleton } from "./_components/reports-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <PageHeaderSkeleton />
      <ReportsSkeleton />
    </AdminPageShell>
  );
}
