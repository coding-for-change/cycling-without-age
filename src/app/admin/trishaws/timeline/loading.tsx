import { AdminPageShell } from "../../_components/admin-page";
import { TimelineSkeleton } from "./_components/timeline-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <TimelineSkeleton />
    </AdminPageShell>
  );
}
