import { Suspense } from "react";
import {
  AdminPageFallback,
  AdminPageShell,
} from "../../_components/admin-page";
import { PersonBody } from "./_components/person-body";

export default function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <PersonBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}
