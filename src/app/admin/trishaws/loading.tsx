import { AdminPageShell } from "../_components/admin-page";
import { TrishawsSkeleton } from "./_components/trishaws-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <TrishawsSkeleton />
    </AdminPageShell>
  );
}
