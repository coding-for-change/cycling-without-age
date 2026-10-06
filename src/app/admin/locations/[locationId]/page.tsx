import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import type { AdminSearchParams } from "../../active-scope";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import { LocationBody } from "./_components/location-body";

export default function LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <LocationBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
