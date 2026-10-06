import { Suspense } from "react";
import { AdminPageShell } from "../../../_components/admin-page";
import type { AdminSearchParams } from "../../../active-scope";
import { DetailSkeleton } from "../../../_components/detail-skeleton";
import { TypeBody } from "./_components/type-body";

export default function TypePage({
  params,
  searchParams,
}: {
  params: Promise<{ typeId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <TypeBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
