"use client";

import {
  createContext,
  use,
  useOptimistic,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ScopeArg } from "@/lib/commands";
import { cn } from "@/lib/utils";
import { isTrendMetric, type TrendMetric } from "../../_components/kpi-data";
import { hrefWith } from "../../_components/href-with";
import { useSwitchScope } from "../../_components/use-switch-scope";

type Patch = Record<string, string | null>;

type ReportNav = {
  pending: boolean;
  query: URLSearchParams;
  hrefFor: (patch: Patch) => string;
  navigate: (patch: Patch) => void;
  go: (href: string) => void;
  view: (href: string) => void;
  switchScope: (arg: ScopeArg) => void;
};

const ReportNavContext = createContext<ReportNav | null>(null);

export function ReportNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navPending, startTransition] = useTransition();
  const { switchScope, pending: scopePending } = useSwitchScope();
  const [search, setSearch] = useOptimistic(searchParams.toString());

  const hrefFor = (patch: Patch) => hrefWith(pathname, search, patch);

  const go = (href: string) =>
    startTransition(() => {
      setSearch(href.split("?")[1] ?? "");
      router.push(href, { scroll: false });
    });

  const navigate = (patch: Patch) => go(hrefFor(patch));

  const view = (href: string) => window.history.replaceState(null, "", href);

  return (
    <ReportNavContext
      value={{
        pending: navPending || scopePending,
        query: new URLSearchParams(search),
        hrefFor,
        navigate,
        go,
        view,
        switchScope,
      }}
    >
      {children}
    </ReportNavContext>
  );
}

export const useReportNav = () => use(ReportNavContext);

export function useReportMetric(): TrendMetric {
  const requested = useReportNav()?.query.get("metric");
  return isTrendMetric(requested) ? requested : "rides";
}

export function ReportLink({
  patch,
  href,
  view = false,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  patch?: Patch;
  href?: string;
  view?: boolean;
}) {
  const nav = useReportNav();
  const target = href ?? nav?.hrefFor(patch ?? {}) ?? "#";
  return (
    <Link
      {...props}
      href={target}
      scroll={false}
      onClick={(event) => {
        props.onClick?.(event);
        if (!nav || event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        if (view) nav.view(target);
        else nav.go(target);
      }}
    >
      {children}
    </Link>
  );
}

export function ReportDim({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pending = useReportNav()?.pending ?? false;
  return (
    <div
      aria-busy={pending}
      data-pending={pending || undefined}
      className={cn(
        "transition-opacity duration-200 data-pending:opacity-55 data-pending:delay-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
