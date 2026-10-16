import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  CalendarCheck2,
  CalendarX2,
  Clock,
  Flag,
  Hourglass,
  Inbox,
  Mail,
  MapPin,
  Phone,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { rideRequests, type RideRequestRow } from "@/features/ride-requests";
import {
  requestedRiders,
  placeLine,
  requestedRoute,
  requestedWhen,
} from "@/features/ride-requests/components/request-words";
import { id as requestId } from "@/features/ride-requests/schemas";
import { rides } from "@/features/rides";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { bookingRefusal } from "@/lib/booking-windows";
import {
  formatRelativeTime,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { isPhoneTempEmail } from "@/lib/identity";
import { adminPersonHref } from "@/lib/profile-routes";
import { hrefWith } from "@/lib/search-params";
import {
  BackLink,
  DETAIL_TITLE,
  DetailHeader,
  DetailLayout,
  DetailList,
  DetailListRow,
  DetailMediaIcon,
  DetailMeta,
  DetailSection,
  MetaBadge,
} from "../../../../_components/detail-page";
import { SidePanel } from "../../../../_components/side-panel";
import {
  TimelineBubble,
  TimelineEntry,
  TimelineHeadline,
  TimelineList,
} from "../../../../_components/timeline";
import {
  readActiveScope,
  scopeQuery as scopeQueryOf,
  type AdminSearchParams,
} from "../../../../active-scope";
import { DeclineRequest } from "./decline-request";

const HOUR_MS = 60 * 60 * 1000;

const STATUS_ICON: Record<RideRequestRow["status"], LucideIcon> = {
  pending: Hourglass,
  scheduled: CalendarCheck2,
  declined: CalendarX2,
  withdrawn: Undo2,
};

type Strings = Dictionary["admin"]["rideRequests"];

async function conflictsOf(
  request: RideRequestRow,
  strings: Strings,
  words: Locale,
  now: Date,
) {
  const [{ hours, policy }, around] = await Promise.all([
    chapters.getBookingPolicy(request.chapterId, now),
    rides.listRidesInRange(
      [request.chapterId],
      request.requestedStartsAt,
      request.requestedEndsAt,
    ),
  ]);
  const copy = strings.detail.conflict;
  const refusal = bookingRefusal(
    { startsAt: request.requestedStartsAt, endsAt: request.requestedEndsAt },
    hours,
    policy,
    request.chapter.timeZone,
    now,
  );
  const others = around.filter(
    (ride) => ride.status !== "cancelled" && ride.id !== request.rideId,
  ).length;
  return [
    refusal === "leadTime"
      ? formatMessage(
          copy.shortNotice,
          {
            hours: Math.max(
              0,
              Math.floor(
                (request.requestedStartsAt.getTime() - now.getTime()) / HOUR_MS,
              ),
            ),
          },
          words,
        )
      : refusal
        ? copy[refusal]
        : null,
    others ? formatMessage(copy.ridesThen, { count: others }, words) : null,
  ].filter((line): line is string => line !== null);
}

export async function RequestBody({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ scope, scopeQuery, session }, { requestId: id }] = await Promise.all(
    [readActiveScope(searchParams, "rides"), params],
  );
  if (!requestId.safeParse(id).success) notFound();

  const request = await rideRequests.getRequest(id);
  if (!request || !scope.chapters.some((c) => c.id === request.chapterId))
    notFound();
  await requireChapterAdmin(request.chapterId);

  const now = new Date();
  const outcome = request.status === "pending" ? null : request.status;
  const pending = outcome === null;
  const isLapsed = rideRequests.lapsed(request, now);
  const [dict, language, head] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const strings = dict.admin.rideRequests;
  const detail = strings.detail;
  const words = wordsLocale(language);
  const conflicts =
    pending && !isLapsed ? await conflictsOf(request, strings, words, now) : [];
  const notation = resolveLocale(head.get("accept-language"));
  const when = requestedWhen(request, notation);
  const route = requestedRoute(request);
  const riders = requestedRiders(request);
  const requester = request.requester;
  const requesterName = requester?.name ?? detail.someone;
  const email =
    requester?.email && !isPhoneTempEmail(requester.email)
      ? requester.email
      : null;
  const home = scope.chapters.find(
    (chapter) => chapter.id === request.chapterId,
  );
  const backHref = `/admin/rides/requests${scopeQuery}`;
  const scheduleHref = hrefWith(
    "/admin/rides",
    home ? scopeQueryOf({ kind: "chapter", chapter: home }) : scopeQuery,
    { new: "1", request: request.id },
  );
  const rideHref = request.rideId
    ? hrefWith(`/admin/rides/${request.rideId}`, scopeQuery, {})
    : null;
  const nameOf = (person: { id: string; name: string } | null) => ({
    self: person?.id === session.user.id ? "yes" : "no",
    name: person?.name ?? detail.someone,
  });

  const model =
    strings.models[request.model === "functional" ? "functional" : "pleasure"];

  return (
    <>
      <BackLink
        href={backHref}
        label={detail.back}
      />
      <DetailLayout
        header={
          <DetailHeader
            media={
              <DetailMediaIcon
                icon={STATUS_ICON[request.status]}
                tone={pending ? "mint" : "deep"}
              />
            }
            title={<span className={DETAIL_TITLE}>{riders.join(", ")}</span>}
          >
            <DetailMeta>
              <MetaBadge>
                {strings.statuses[isLapsed ? "lapsed" : request.status]}
              </MetaBadge>
              <span>{`${when.date}, ${when.time}`}</span>
              <span>
                {formatMessage(
                  detail.asked,
                  {
                    when: formatRelativeTime(request.createdAt, words, now),
                    name: requesterName,
                  },
                  words,
                )}
              </span>
            </DetailMeta>
          </DetailHeader>
        }
        sidebar={
          <>
            <SidePanel title={detail.decision}>
              {outcome === null ? (
                <div className="grid gap-2">
                  <Button
                    asChild
                    variant="brand"
                    className="w-full"
                  >
                    <Link href={scheduleHref}>{detail.schedule}</Link>
                  </Button>
                  <DeclineRequest
                    requestId={request.id}
                    name={requesterName}
                    language={language}
                    labels={{ ...strings.decline, open: detail.decline }}
                    errors={{ ...dict.common.errors, ...strings.errors }}
                  />
                  <p className="text-xs text-pretty text-ink-soft">
                    {isLapsed ? detail.lapsed : detail.pendingHint}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 text-2sm">
                  <p>
                    {formatMessage(
                      detail.decided[outcome],
                      {
                        when: request.decidedAt
                          ? formatRelativeTime(request.decidedAt, words, now)
                          : "",
                      },
                      words,
                    )}
                  </p>
                  {request.status === "scheduled" ? (
                    rideHref ? (
                      <>
                        {request.ride?.status === "cancelled" ? (
                          <p className="text-ink-soft">
                            {detail.rideCancelled}
                          </p>
                        ) : null}
                        <Button
                          asChild
                          variant="outline"
                          className="w-full"
                        >
                          <Link href={rideHref}>{detail.seeRide}</Link>
                        </Button>
                      </>
                    ) : (
                      <p className="text-ink-soft">{detail.rideGone}</p>
                    )
                  ) : null}
                </div>
              )}
            </SidePanel>
            {pending && !isLapsed ? (
              <SidePanel title={detail.conflicts}>
                {conflicts.length ? (
                  <ul className="grid gap-2 text-2sm">
                    {conflicts.map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2"
                      >
                        <TriangleAlert
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-red-ink"
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-2sm text-ink-soft">{detail.noConflicts}</p>
                )}
              </SidePanel>
            ) : null}
            <SidePanel title={detail.requester}>
              <div className="grid gap-2 text-2sm">
                {requester ? (
                  <Link
                    href={hrefWith(
                      adminPersonHref({ kind: "user", id: requester.id }),
                      scopeQuery,
                      {},
                    )}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {requester.name}
                  </Link>
                ) : (
                  <span className="text-ink-soft">{detail.someone}</span>
                )}
                {requester?.phoneNumber ? (
                  <a
                    href={`tel:${requester.phoneNumber}`}
                    className="flex items-center gap-2 underline-offset-4 hover:underline"
                  >
                    <Phone
                      aria-hidden
                      className="size-4 text-ink-soft"
                    />
                    {requester.phoneNumber}
                  </a>
                ) : requester ? (
                  <span className="text-ink-soft">{detail.noPhone}</span>
                ) : null}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="flex min-w-0 items-center gap-2 underline-offset-4 hover:underline"
                  >
                    <Mail
                      aria-hidden
                      className="size-4 shrink-0 text-ink-soft"
                    />
                    <span className="truncate">{email}</span>
                  </a>
                ) : null}
              </div>
            </SidePanel>
          </>
        }
      >
        <DetailSection
          title={detail.request}
          bordered={false}
        >
          <dl className="grid gap-3 text-sm">
            <Fact
              icon={Clock}
              label={detail.when}
              value={`${when.date}, ${when.time}`}
            />
            <Fact
              icon={Inbox}
              label={detail.model}
              value={
                request.roundTrip
                  ? `${model} · ${strings.models.roundTrip}`
                  : model
              }
            />
            {route.from ? (
              <Fact
                icon={MapPin}
                label={detail.from}
                value={placeLine(route.from, request.pickupAddress) ?? ""}
              />
            ) : null}
            {route.to ? (
              <Fact
                icon={Flag}
                label={detail.to}
                value={placeLine(route.to, request.destinationAddress) ?? ""}
              />
            ) : null}
          </dl>
          {request.note ? (
            <div className="grid gap-1">
              <p className="text-2sm text-ink-soft">
                {formatMessage(detail.note, { name: requesterName }, words)}
              </p>
              <TimelineBubble>{request.note}</TimelineBubble>
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title={detail.riders}>
          <DetailList>
            {request.passengers.map(({ passenger }) => (
              <DetailListRow
                key={passenger.id}
                href={hrefWith(
                  adminPersonHref(
                    passenger.userId
                      ? { kind: "user", id: passenger.userId }
                      : { kind: "passenger", id: passenger.id },
                  ),
                  scopeQuery,
                  {},
                )}
              >
                {`${passenger.firstName} ${passenger.lastName}`.trim()}
              </DetailListRow>
            ))}
          </DetailList>
        </DetailSection>

        <DetailSection title={detail.history}>
          <TimelineList empty="">
            <TimelineEntry icon={Inbox}>
              <TimelineHeadline
                sentence={formatMessage(
                  detail.lines.submitted,
                  nameOf(requester),
                  words,
                )}
                at={request.createdAt}
                notation={notation}
                words={language}
                now={now}
              />
            </TimelineEntry>
            {request.decidedAt && outcome ? (
              <TimelineEntry icon={STATUS_ICON[request.status]}>
                <TimelineHeadline
                  sentence={
                    request.status === "scheduled" && !request.decidedByUserId
                      ? detail.lines.scheduledAuto
                      : formatMessage(
                          detail.lines[outcome],
                          nameOf(
                            request.status === "withdrawn"
                              ? requester
                              : request.decidedBy,
                          ),
                          words,
                        )
                  }
                  at={request.decidedAt}
                  notation={notation}
                  words={language}
                  now={now}
                />
                {request.decisionNote ? (
                  <TimelineBubble>{request.decisionNote}</TimelineBubble>
                ) : null}
              </TimelineEntry>
            ) : null}
          </TimelineList>
        </DetailSection>
      </DetailLayout>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1.25rem_7rem_minmax(0,1fr)] items-start gap-2">
      <Icon
        aria-hidden
        className="mt-0.5 size-4 text-ink-soft"
      />
      <dt className="text-ink-soft">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
