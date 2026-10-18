import { AdminPageShell } from "../../../_components/admin-page";
import { DetailSkeleton } from "../../../_components/detail-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <DetailSkeleton />
    </AdminPageShell>
  );
}
