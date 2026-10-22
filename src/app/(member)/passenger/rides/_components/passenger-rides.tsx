import { Plus } from "lucide-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { BenchIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { PastRides } from "@/features/rides/components/past-rides";
import { RideAgenda, RideCard } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MEMBER_LIFE } from "../../../_components/instant";
import { pilotAvatars } from "../../../_components/pilot-avatars";
import { RequestCard } from "./request-card";
import { loadRideRequests } from "./ride-requests-list";

const rideHref = (rideId: string) => `/passenger/rides/${rideId}`;
const PROFILE_BASE = "/passenger/profile";
const NEW_RIDE = "/passenger/rides/new";

export async function PassengerRides() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [mine, requests, dict, language, head] = await Promise.all([
    passengers.listRidersOfAccount(session.user.id),
    loadRideRequests(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const { upcoming, past } = await rides.listPassengerRides(
    mine.map((passenger) => passenger.id),
  );
  const avatars = await pilotAvatars([...upcoming, ...past]);

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const strings = dict.passenger.rides.list;
  const book = dict.member.action.passenger;

  const items = [
    ...upcoming.map((ride) => ({
      at: ride.startsAt.getTime(),
      key: `ride:${ride.id}`,
      node: (
        <RideCard
          key={`ride:${ride.id}`}
          ride={ride}
          strings={dict.calendar}
          locale={locale}
          words={words}
          href={rideHref(ride.id)}
          profileBase={PROFILE_BASE}
          past={false}
          pilotAvatars={avatars}
        />
      ),
    })),
    ...requests.map((request) => ({
      at: request.requestedStartsAt.getTime(),
      key: `request:${request.id}`,
      node: (
        <RequestCard
          key={`request:${request.id}`}
          request={request}
          dict={dict}
          locale={locale}
          words={words}
        />
      ),
    })),
  ].sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl tracking-tight md:text-3xl">
          {dict.member.pages.rides.title}
        </h1>
        {items.length ? (
          <Button
            asChild
            variant="brand"
            className="min-h-11 gap-1.25 rounded-full px-5 md:hidden"
          >
            <Link
              href={NEW_RIDE}
              transitionTypes={["push"]}
            >
              <Plus
                aria-hidden
                className="size-4"
              />
              {book}
            </Link>
          </Button>
        ) : null}
      </div>

      {items.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base">{dict.calendar.upcoming}</h2>
          <ul className="flex flex-col gap-3">
            {items.map((item) => item.node)}
          </ul>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3 pt-4 text-center">
          <BenchIllustration className="w-48" />
          <h2 className="text-xl tracking-tight">{strings.emptyTitle}</h2>
          <p className="max-w-sm text-ink-soft">{strings.emptyBody}</p>
          <Button
            asChild
            variant="brand"
            className="mt-2 min-h-12 rounded-full px-6 text-base"
          >
            <Link
              href={NEW_RIDE}
              transitionTypes={["push"]}
            >
              {book}
            </Link>
          </Button>
        </section>
      )}

      {past.length ? (
        <PastRides
          show={formatMessage(strings.showPast, { count: past.length }, words)}
          hide={strings.hidePast}
        >
          <RideAgenda
            rides={past}
            strings={dict.calendar}
            locale={locale}
            words={words}
            href={rideHref}
            profileBase={PROFILE_BASE}
            past
            pilotAvatars={avatars}
          />
        </PastRides>
      ) : null}
    </>
  );
}
