import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../active-scope";
import { TrishawAllocation } from "../_components/trishaw-allocation";
import { RideBody } from "./_components/ride-body";

export default function RidePage({
  params,
  searchParams,
}: {
  params: Promise<{ rideId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <RideBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
      <Suspense fallback={null}>
        <TrishawAllocation
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
