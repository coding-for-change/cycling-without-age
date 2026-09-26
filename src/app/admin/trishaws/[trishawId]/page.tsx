import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import type { AdminSearchParams } from "../../active-scope";
import { TrishawBody } from "./_components/trishaw-body";
import { DetailSkeleton } from "../../_components/detail-skeleton";

export default function TrishawPage({
  params,
  searchParams,
}: {
  params: Promise<{ trishawId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <TrishawBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
