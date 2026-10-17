import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { getDictionary } from "@/lib/i18n";
import { AdminPageHeader } from "../../_components/admin-page";
import { ADMIN_LIFE } from "../../admin-viewer";

export async function TrainingHeader({ action }: { action?: ReactNode }) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const dict = await getDictionary();

  return (
    <AdminPageHeader title={dict.admin.pages.training.title}>
      {action}
    </AdminPageHeader>
  );
}
