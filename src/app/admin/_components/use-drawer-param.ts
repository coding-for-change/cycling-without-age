"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * A drawer's open state lives in the URL (`?new=1`, `?edit=<id>`) so a refresh
 * or a shared link reopens it. Reading and clearing those params is the same
 * everywhere, including keeping the rest of the query — an active scope
 * narrowing must survive opening and closing a drawer.
 */
export function useDrawerParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const withParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    return `${pathname}?${params.toString()}`;
  };

  return {
    creating: searchParams.get("new") === "1",
    editingId: searchParams.get("edit"),
    /** Opens the create drawer, keeping whatever narrowing the URL already has. */
    openHref: withParam("new", "1"),
    editHref: (id: string) => withParam("edit", id),
    /** No-op when no drawer is open, so closing twice costs one navigation. */
    close: () => {
      if (!searchParams.has("new") && !searchParams.has("edit")) return;
      go((params) => {
        params.delete("new");
        params.delete("edit");
      });
    },
    go,
  };
}
