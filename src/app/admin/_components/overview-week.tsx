import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import {
  MODEL_ICON,
  rideHeadline,
} from "@/features/rides/components/ride-presentation";
import { calendarDate, dayKey } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { hrefWith } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { weekAhead } from "@/use-cases/admin-overview";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ExpandableList } from "./expandable-list";

export async function OverviewWeek({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ chapterIds, scopeQuery }, dict, language, head] = await Promise.all([
    readActiveScope(searchParams, "overview"),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const week = await weekAhead(chapterIds, new Date());
  const strings = dict.admin.overview.week;
  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);

  const calendar = (
    <Link
      href={hrefWith("/admin/rides", scopeQuery, {})}
      className="flex min-h-9 items-center gap-1.5 px-1 text-2sm text-ink-soft transition-colors hover:text-ink motion-reduce:transition-none"
    >
      {strings.open}
      <ArrowRight
        aria-hidden
        className="size-4"
      />
    </Link>
  );

  return (
    <div className="flex flex-col gap-2">
      {week.length === 0 ? (
        <>
          <p className="rounded-2xl border border-line px-4 py-5 text-2sm text-ink-soft">
            {strings.empty}
          </p>
          {calendar}
        </>
      ) : (
        <ExpandableList
          words={words}
          labels={{
            showAll: dict.admin.overview.showAll,
            showLess: dict.admin.overview.showLess,
          }}
          className="rounded-2xl border border-line"
          trailing={calendar}
          items={week.map((ride, index) => {
            const Icon = MODEL_ICON[ride.model];
            const staffed = ride.pilots >= ride.requiredPilots;
            const day = dayKey(ride.startsAt, ride.timeZone);
            const firstOfDay =
              index === 0 ||
              dayKey(week[index - 1].startsAt, week[index - 1].timeZone) !==
                day;
            return {
              key: ride.id,
              node: (
                <Link
                  href={hrefWith(`/admin/rides/${ride.id}`, scopeQuery, {})}
                  className="flex min-h-11 items-center gap-3 px-4 py-2 transition-colors hover:bg-canvas-deep motion-reduce:transition-none"
                >
                  <span
                    className={cn(
                      "w-18 shrink-0 text-xs tabular-nums",
                      firstOfDay ? "font-medium text-ink" : "text-transparent",
                    )}
                  >
                    {formatShortDateWithWeekday(
                      calendarDate(ride.startsAt, ride.timeZone),
                      notation,
                    )}
                  </span>
                  <Icon
                    aria-hidden
                    className="size-4 shrink-0 text-ink-soft"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-2sm">
                      {rideHeadline(ride, dict.calendar, {
                        rideTo: dict.calendar.card.rideTo,
                        rideFrom: dict.calendar.card.rideFrom,
                        words,
                      })}
                    </span>
                    <time
                      dateTime={ride.startsAt.toISOString()}
                      className="text-xs text-ink-soft tabular-nums"
                    >
                      {formatTimeRange(
                        ride.startsAt,
                        ride.endsAt,
                        notation,
                        ride.timeZone,
                      )}
                    </time>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                      staffed
                        ? "bg-mint-tint text-ink"
                        : "bg-red-tint text-red-ink",
                    )}
                  >
                    {formatMessage(
                      dict.calendar.staffing,
                      {
                        assigned: ride.pilots,
                        required: ride.requiredPilots,
                      },
                      words,
                    )}
                  </span>
                </Link>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
