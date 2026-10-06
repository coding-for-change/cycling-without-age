import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../active-scope";
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
      <Suspense
        fallback={
          <DetailSkeleton
            headerAction
            panels={["h-52", "h-60", "h-24", "h-24"]}
            sections={["list", "text", "text"]}
          />
        }
      >
        <RideBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
