"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
    openHref: withParam("new", "1"),
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
