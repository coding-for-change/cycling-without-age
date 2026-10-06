import type { ReactNode } from "react";
import type { AdminSearchParams } from "../active-scope";
import { DetailSection } from "./detail-page";
import { HistoryMore } from "./history-more";

export const historyTake = (shown: number) => shown + 1;

export function HistorySection({
  title,
  composer,
  children,
  pathname,
  query,
  shown,
  total,
  showMoreLabel,
}: {
  title: string;
  composer?: ReactNode;
  children: ReactNode;
  pathname: string;
  query: AdminSearchParams;
  shown: number;
  total: number;
  showMoreLabel: string;
}) {
  return (
    <DetailSection title={title}>
      {composer}
      {children}
      <HistoryMore
        pathname={pathname}
        query={query}
        shown={shown}
        total={total}
        label={showMoreLabel}
      />
    </DetailSection>
  );
}
