import { AdminPageShell } from "../_components/admin-page";
import { RideLocationsSkeleton } from "./_components/ride-locations-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <RideLocationsSkeleton />
    </AdminPageShell>
  );
}
