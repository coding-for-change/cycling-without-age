import { Suspense } from "react";
import { AdminPageFallback, AdminPageShell } from "../_components/admin-page";
import { MembersBody } from "./_components/members-body";

export default function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <MembersBody searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}
