import { AdminPageShell } from "../../../../../_components/admin-page";
import { PreviewSkeleton } from "./_components/preview-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <PreviewSkeleton />
    </AdminPageShell>
  );
}
