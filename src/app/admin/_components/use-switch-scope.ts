"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ScopeArg } from "@/lib/commands";
import { setAdminScope } from "../actions";

export function useSwitchScope() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const switchScope = (arg: ScopeArg) =>
    startTransition(async () => {
      await setAdminScope(arg);
      if (!searchParams.has("chapter") && !searchParams.has("country")) return;

      const rest = new URLSearchParams(searchParams);
      rest.delete("chapter");
      rest.delete("country");
      const query = rest.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    });

  return { switchScope };
}
