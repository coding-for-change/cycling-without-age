import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../active-scope";
import { RideLocationBody } from "./_components/ride-location-body";

export default function RideLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <RideLocationBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
