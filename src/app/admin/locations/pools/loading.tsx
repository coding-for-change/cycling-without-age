import { AdminPageShell } from "../../_components/admin-page";
import { PoolsSkeleton } from "./_components/pools-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <PoolsSkeleton />
    </AdminPageShell>
  );
}
