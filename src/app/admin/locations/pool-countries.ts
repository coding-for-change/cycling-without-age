import type { Dictionary } from "@/lib/i18n";
import type { AdminTab } from "../_components/admin-tabs";

type PoolLinks = { chapters: readonly { status: string }[] };

export const pendingRequests = (pool: PoolLinks) =>
  pool.chapters.filter((link) => link.status === "pending").length;

export const waitingRequests = (pools: readonly PoolLinks[]) =>
  pools.reduce((sum, pool) => sum + pendingRequests(pool), 0);

export const locationTabs = (
  labels: Dictionary["fleet"]["locations"]["tabs"],
  waiting: number,
): AdminTab[] => [
  { key: "locations", href: "/admin/locations", label: labels.locations },
  {
    key: "pools",
    href: "/admin/locations/pools",
    label: labels.pools,
    count: waiting,
  },
];
