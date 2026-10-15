import { Suspense } from "react";
import { AdminPageShell } from "../../../_components/admin-page";
import { DetailSkeleton } from "../../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../../active-scope";
import { RequestBody } from "./_components/request-body";

export default function RideRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <RequestBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
