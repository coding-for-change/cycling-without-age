import { headers } from "next/headers";
import { cacheLife } from "next/cache";
import { EmptyState } from "@/components/empty-state";
import { ICONS } from "@/components/icons";
import { toPassengerListPage } from "@/features/rides/components/passenger-ride-rows";
import {
  PassengerRideList,
  type PassengerRideListStrings,
} from "@/features/rides/components/passenger-ride-list";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { passengerRidesOverview } from "@/use-cases/passenger-rides";
import { MEMBER_LIFE } from "../../../_components/instant";

const listStrings = (dict: Dictionary): PassengerRideListStrings => ({
  ...dict.passenger.rides,
  today: dict.rides.list.today,
  tomorrow: dict.rides.list.tomorrow,
  yesterday: dict.rides.list.yesterday,
  via: dict.calendar.via,
  models: dict.calendar.models,
  statuses: dict.calendar.statuses,
  year: dict.passenger.rides.year,
});

export async function PassengerRides() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [overview, dict, language, head] = await Promise.all([
    passengerRidesOverview(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const page = dict.member.pages.rides;
  const empty = !overview.upcoming.rides.length && !overview.past.rides.length;

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{page.title}</h1>
      {empty ? (
        <EmptyState
          icon={ICONS.rides}
          className="flex-1 justify-start rounded-none border-none pt-16"
        >
          {page.passenger.body}
        </EmptyState>
      ) : (
        <PassengerRideList
          upcoming={toPassengerListPage(overview.upcoming)}
          past={toPassengerListPage(overview.past)}
          year={overview.year}
          showRiders={overview.riderCount > 1}
          now={new Date()}
          locale={resolveLocale(head.get("accept-language"))}
          words={wordsLocale(language)}
          strings={listStrings(dict)}
        />
      )}
    </>
  );
}
