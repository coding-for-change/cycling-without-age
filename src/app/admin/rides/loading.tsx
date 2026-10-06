import { AdminPageShell } from "../_components/admin-page";
import { RidesSkeleton } from "./_components/rides-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <RidesSkeleton />
    </AdminPageShell>
  );
}
