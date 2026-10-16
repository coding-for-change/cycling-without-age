import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { rideRequests, RIDE_REQUEST_STATUSES } from "@/features/ride-requests";
import {
  requestedRiders,
  requestedRoute,
  requestedWhen,
} from "@/features/ride-requests/components/request-words";
import { calendarDate } from "@/lib/calendar";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { first, hrefWith } from "@/lib/search-params";
import { AdminPageHeader, AdminPageShell } from "../../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { ADMIN_LIFE } from "../../admin-viewer";
import { RideTabs, RideTabsSkeleton } from "../_components/ride-tabs";
import {
  RequestsTable,
  type RequestListRow,
} from "./_components/requests-table";
import { RequestStatusSwitch } from "./_components/request-status-switch";
import {
  RequestRowsSkeleton,
  RequestsHeaderSkeleton,
} from "./_components/requests-skeleton";

type PageProps = { searchParams: Promise<AdminSearchParams> };

const FILTERS = [...RIDE_REQUEST_STATUSES, "all"] as const;
type Filter = (typeof FILTERS)[number];

const filterOf = (value: string | undefined): Filter =>
  (FILTERS as readonly string[]).includes(value ?? "")
    ? (value as Filter)
    : "pending";

export default function RideRequestsPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<RequestsHeaderSkeleton />}>
        <RequestsHeader />
      </Suspense>
      <Suspense fallback={<RideTabsSkeleton />}>
        <RideTabs
          searchParams={searchParams}
          current="requests"
        />
      </Suspense>
      <Suspense fallback={<RequestRowsSkeleton />}>
        <RequestList searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function RequestsHeader() {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const dict = await getDictionary();
  return <AdminPageHeader title={dict.admin.pages.rides.title} />;
}

async function RequestList({ searchParams }: PageProps) {
  const [{ chapters, chapterIds }, params, dict, language, head] =
    await Promise.all([
      readActiveScope(searchParams, "rides"),
      searchParams,
      getDictionary(),
      getLocale(),
      headers(),
    ]);
  const filter = filterOf(first(params.status));
  const list = await rideRequests.listRequests(
    chapterIds,
    filter === "all" ? null : filter,
  );

  const strings = dict.admin.rideRequests;
  const notation = resolveLocale(head.get("accept-language"));
  const filterHref = (value: Filter) =>
    hrefWith("/admin/rides/requests", params, {
      status: value === "pending" ? null : value,
    });

  const rows: RequestListRow[] = list.map((request) => {
    const when = requestedWhen(request, notation, { short: true });
    const route = requestedRoute(request);
    return {
      id: request.id,
      href: hrefWith(`/admin/rides/requests/${request.id}`, params, {
        status: null,
      }),
      date: when.date,
      time: when.time,
      startsIso: request.requestedStartsAt.toISOString(),
      riders: requestedRiders(request).join(", "),
      model: [
        strings.models[
          request.model === "functional" ? "functional" : "pleasure"
        ],
        request.roundTrip ? strings.models.roundTrip : null,
      ]
        .filter(Boolean)
        .join(" · "),
      where: [route.from, route.to].filter(Boolean).join(" → "),
      asked: formatDate(
        calendarDate(request.createdAt, request.chapter.timeZone),
        notation,
      ),
      askedIso: request.createdAt.toISOString(),
      requester: request.requester?.name ?? strings.detail.someone,
      status: rideRequests.lapsed(request) ? "lapsed" : request.status,
      chapterName: request.chapter.name,
    };
  });

  return (
    <section className="flex flex-col gap-3">
      <RequestStatusSwitch
        value={filter}
        label={strings.filter.label}
        options={FILTERS.map((value) => ({
          value,
          label: value === "all" ? strings.filter.all : strings.statuses[value],
          href: filterHref(value),
        }))}
      />
      {rows.length ? (
        <RequestsTable
          rows={rows}
          showChapter={chapters.length > 1}
          strings={strings}
          table={dict.admin.table}
          locale={language}
        />
      ) : (
        <EmptyState icon={Inbox}>
          {filter === "pending" ? strings.empty.pending : strings.empty.other}
        </EmptyState>
      )}
    </section>
  );
}
