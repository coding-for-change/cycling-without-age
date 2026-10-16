import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarCheck2,
  CalendarX2,
  ChevronLeft,
  Hourglass,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { rideRequests, type RideRequestRow } from "@/features/ride-requests";
import {
  requestedRiders,
  requestedRoute,
  requestedWhen,
  routeLine,
} from "@/features/ride-requests/components/request-words";
import { id as requestId } from "@/features/ride-requests/schemas";
import { requireAuth } from "@/lib/auth-guards";
import { calendarDate } from "@/lib/calendar";
import {
  formatDate,
  formatList,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { MEMBER_LIFE } from "../../../../../_components/instant";
import { WithdrawRequest } from "./withdraw-request";

export async function RequestDetail({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId: id } = await params;
  if (!requestId.safeParse(id).success) notFound();
  return <OwnRequest id={id} />;
}

const STATE: Record<
  RideRequestRow["status"] | "lapsed" | "closed",
  { icon: LucideIcon; tone: string }
> = {
  lapsed: { icon: CalendarX2, tone: "bg-canvas-deep" },
  closed: { icon: Undo2, tone: "bg-canvas-deep" },
  pending: { icon: Hourglass, tone: "bg-mint-tint" },
  scheduled: { icon: CalendarCheck2, tone: "bg-mint-tint" },
  declined: { icon: CalendarX2, tone: "bg-canvas-deep" },
  withdrawn: { icon: Undo2, tone: "bg-canvas-deep" },
};

async function OwnRequest({ id }: { id: string }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requireAuth();
  const [request, dict, language, head] = await Promise.all([
    rideRequests.getRequest(id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!request || request.requesterUserId !== session.user.id) notFound();

  const strings = dict.passenger.request;
  const page = strings.page;
  const words = wordsLocale(language);
  const notation = resolveLocale(head.get("accept-language"));
  const chapter = request.chapter.name;
  const when = requestedWhen(request, notation);
  const route = requestedRoute(request);
  const state = rideRequests.lapsed(request)
    ? "lapsed"
    : rideRequests.closed(request)
      ? "closed"
      : request.status;
  const { icon: Icon, tone } = STATE[state];
  const rideGone =
    request.status === "scheduled" &&
    (!request.ride || request.ride.status === "cancelled");

  const rows = [
    { label: page.riders, value: formatList(requestedRiders(request), words) },
    {
      label: page.ride,
      value: routeLine(
        strings.models[
          request.model === "functional" ? "functional" : "pleasure"
        ],
        { ...route, back: request.roundTrip },
        dict.common.route,
        language,
      ),
    },
    { label: page.when, value: `${when.date}, ${when.time}` },
    ...(request.note ? [{ label: page.note, value: request.note }] : []),
  ];

  return (
    <>
      <Link
        href="/passenger/rides"
        transitionTypes={["pop"]}
        className="-ml-2 flex min-h-11 items-center gap-1 self-start rounded-full pr-3 pl-1 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none"
      >
        <ChevronLeft
          aria-hidden
          className="size-5"
        />
        {dict.member.pages.rides.title}
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {page.title}
        </p>
        <h1 className="text-2xl tracking-tight md:text-3xl">
          {formatMessage(page.statuses[state], { chapter }, words)}
        </h1>
        <p className="text-2sm text-ink-soft">
          {formatMessage(
            page.asked,
            {
              date: formatDate(
                calendarDate(request.createdAt, request.chapter.timeZone),
                notation,
              ),
            },
            words,
          )}
        </p>
      </header>

      <section
        role="status"
        className={cn("flex items-start gap-3 rounded-2xl p-4", tone)}
      >
        <Icon
          aria-hidden
          className="mt-0.5 size-5 shrink-0"
        />
        <p className="text-sm text-pretty">
          {formatMessage(
            rideGone ? page.bodies.scheduledGone : page.bodies[state],
            { chapter },
            words,
          )}
        </p>
      </section>

      {request.status === "declined" && request.decisionNote ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {formatMessage(page.decisionNote, { chapter }, words)}
          </h2>
          <p className="rounded-2xl bg-mint-tint px-4 py-3 text-sm whitespace-pre-wrap">
            {request.decisionNote}
          </p>
        </section>
      ) : null}

      <dl className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-0.5 px-4 py-3"
          >
            <dt className="text-2sm text-ink-soft">{row.label}</dt>
            <dd className="break-words whitespace-pre-wrap">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row">
        {request.status === "scheduled" && !rideGone && request.rideId ? (
          <Button
            asChild
            variant="brand"
            className="min-h-11 rounded-full px-6"
          >
            <Link
              href={`/passenger/rides/${request.rideId}`}
              transitionTypes={["push"]}
            >
              {page.seeRide}
            </Link>
          </Button>
        ) : null}
        {state === "pending" ? (
          <WithdrawRequest
            requestId={request.id}
            labels={page.cancel}
            errors={{ ...dict.common.errors, ...strings.errors }}
          />
        ) : null}
        {state !== "pending" && (state !== "scheduled" || rideGone) ? (
          <Button
            asChild
            variant="outline"
            className="min-h-11 rounded-full px-6"
          >
            <Link
              href="/passenger/rides/new"
              transitionTypes={["push"]}
            >
              {page.askAgain}
            </Link>
          </Button>
        ) : null}
      </div>
    </>
  );
}
