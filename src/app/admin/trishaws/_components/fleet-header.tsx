import { Suspense, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { getDictionary } from "@/lib/i18n";
import { AdminPageHeader } from "../../_components/admin-page";
import { TabsSkeleton } from "../../_components/admin-skeletons";
import { ADMIN_LIFE, adminViewer } from "../../admin-viewer";
import { FleetTabs, type FleetTab } from "./fleet-tabs";
import { FLEET_TAB_WIDTHS } from "./trishaws-skeleton";

export async function FleetHeader({
  current,
  action,
}: {
  current: FleetTab;
  action: ReactNode;
}) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [viewer, dict] = await Promise.all([adminViewer(), getDictionary()]);
  const tabs = dict.fleet.trishaws.tabs;

  return (
    <>
      <AdminPageHeader
        title={
          current === "models" ? tabs.models : dict.admin.pages.bikes.title
        }
      >
        {action}
      </AdminPageHeader>
      <Suspense fallback={<TabsSkeleton widths={FLEET_TAB_WIDTHS} />}>
        <FleetTabs
          viewer={viewer}
          labels={tabs}
          current={current}
        />
      </Suspense>
      {current === "models" ? (
        <p className="-mt-2 text-sm text-ink-soft">{dict.fleet.types.body}</p>
      ) : null}
    </>
  );
}
