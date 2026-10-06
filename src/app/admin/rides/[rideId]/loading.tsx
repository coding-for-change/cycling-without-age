import { AdminPageShell } from "../../_components/admin-page";
import { DetailSkeleton } from "../../_components/detail-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <DetailSkeleton
        headerAction
        panels={["h-52", "h-60", "h-24", "h-24"]}
        sections={["list", "text", "text"]}
      />
    </AdminPageShell>
  );
}
