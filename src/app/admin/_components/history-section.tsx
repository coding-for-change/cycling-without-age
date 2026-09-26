import type { Locale } from "@/lib/format";
import type { AdminSearchParams } from "../active-scope";
import {
  ActivityFeed,
  type FeedEvent,
  type HistoryLabels,
} from "../members/[userId]/_components/activity-feed";
import { DetailSection } from "./detail-page";
import { HistoryMore } from "./history-more";

export const historyTake = (shown: number) => shown + 1;

export function HistorySection({
  title,
  pathname,
  query,
  shown,
  events,
  viewerId,
  labels,
  empty,
  notation,
  words,
}: {
  title: string;
  pathname: string;
  query: AdminSearchParams;
  shown: number;
  events: FeedEvent[];
  viewerId: string;
  labels: HistoryLabels & { showMore: string };
  empty: string;
  notation: Locale;
  words: string;
}) {
  return (
    <DetailSection title={title}>
      <ActivityFeed
        events={events.slice(0, shown)}
        viewerId={viewerId}
        labels={labels}
        empty={empty}
        notation={notation}
        words={words}
      />
      <HistoryMore
        pathname={pathname}
        query={query}
        shown={shown}
        total={events.length}
        label={labels.showMore}
      />
    </DetailSection>
  );
}
