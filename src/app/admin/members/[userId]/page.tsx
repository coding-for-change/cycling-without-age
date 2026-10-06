import { Suspense } from "react";
import { AdminPageShell } from "../../_components/admin-page";
import { PersonBody } from "./_components/person-body";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import type { AdminSearchParams } from "../../active-scope";

export default function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <PersonBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
