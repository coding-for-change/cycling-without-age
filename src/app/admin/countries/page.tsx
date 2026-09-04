import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  AdminPageBody,
  AdminPageFallback,
  AdminPageShell,
} from "../_components/admin-page";

export default function CountriesPage() {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Countries />
      </Suspense>
    </AdminPageShell>
  );
}

async function Countries() {
  await requireSuperAdmin();

  return <AdminPageBody page="countries" />;
}
