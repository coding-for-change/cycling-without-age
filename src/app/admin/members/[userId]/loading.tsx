import { AdminPageShell } from "../../_components/admin-page";
import { PersonSkeleton } from "./_components/person-skeleton";

export default function Loading() {
  return (
    <AdminPageShell>
      <PersonSkeleton />
    </AdminPageShell>
  );
}
