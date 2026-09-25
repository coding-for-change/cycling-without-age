import { AdminPageShell } from "../_components/admin-page";
import { LocationsSkeleton } from "./_components/locations-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <LocationsSkeleton />
    </AdminPageShell>
  );
}
