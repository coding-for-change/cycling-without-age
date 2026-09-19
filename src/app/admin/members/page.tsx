import { Suspense } from "react";
import { AdminPageShell } from "../_components/admin-page";
import { MembersBody } from "./_components/members-body";
import { PageFallback } from "@/components/page-fallback";
import type { AdminSearchParams } from "../active-scope";

export default function MembersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <MembersBody searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}
