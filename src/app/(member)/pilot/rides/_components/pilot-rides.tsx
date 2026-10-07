import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ICONS } from "@/components/icons";
import { rides } from "@/features/rides";
import { RideAgenda } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { MEMBER_LIFE } from "../../../_components/instant";

const rideHref = (rideId: string) => `/pilot/rides/${rideId}`;

export async function PilotRides() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const [dict, language, head, { upcoming, past }] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
    rides.listPilotRides(session.user.id),
  ]);

  const page = dict.member.pages.rides;
  const strings = dict.pilot.rides;
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <>
        <h1 className="text-2xl tracking-tight md:text-3xl">{page.title}</h1>
        <EmptyState
          icon={ICONS.rides}
          className="flex-1 justify-start rounded-none border-none pt-16"
        >
          {page.pilot.body}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{page.title}</h1>

      <section className="flex flex-col gap-3">
        <SectionHeading>{dict.calendar.upcoming}</SectionHeading>
        {upcoming.length > 0 ? (
          <RideAgenda
            rides={upcoming}
            strings={dict.calendar}
            locale={locale}
            words={words}
            href={rideHref}
          />
        ) : (
          <p className="text-2sm text-ink-soft border-line rounded-2xl border p-4">
            {strings.upcomingEmpty}
          </p>
        )}
      </section>

      {past.length > 0 ? (
        <details className="group">
          <summary className="focus-visible:ring-ring/50 flex min-h-11 cursor-pointer list-none items-center gap-1.25 rounded-xl outline-none select-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
            <SectionHeading>{strings.past}</SectionHeading>
            <ChevronRight
              aria-hidden
              className="text-ink-soft ml-auto size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            />
          </summary>
          <div className="pt-3">
            <RideAgenda
              rides={past}
              strings={dict.calendar}
              locale={locale}
              words={words}
              href={rideHref}
            />
          </div>
        </details>
      ) : null}
    </>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
      {children}
    </h2>
  );
}
