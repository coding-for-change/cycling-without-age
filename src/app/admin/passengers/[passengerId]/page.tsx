import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../active-scope";
import { PassengerBody } from "./_components/passenger-body";

export default function PassengerPage({
  params,
  searchParams,
}: {
  params: Promise<{ passengerId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <PassengerBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
