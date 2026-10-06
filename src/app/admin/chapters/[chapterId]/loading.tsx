import { AdminPageShell } from "../../_components/admin-page";
import { DetailSkeleton } from "../../_components/detail-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <DetailSkeleton
        panels={["h-28", "h-24", "h-56"]}
        sections={["text", "text"]}
      />
    </AdminPageShell>
  );
}
