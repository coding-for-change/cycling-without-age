import { Suspense } from "react";
import { forbidden } from "next/navigation";
import { requireAdminScope } from "@/lib/auth-guards";
import {
  AdminPageBody,
  AdminPageFallback,
  AdminPageShell,
} from "../_components/admin-page";

export default function ChaptersPage() {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Chapters />
      </Suspense>
    </AdminPageShell>
  );
}

async function Chapters() {
  const { scope } = await requireAdminScope();
  if (!scope.canSeeChapters) forbidden();

  return <AdminPageBody page="chapters" />;
}
