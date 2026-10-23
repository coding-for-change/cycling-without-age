import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { BenchIllustration } from "@/components/illustrations";
import { rides } from "@/features/rides";
import { PastRides } from "@/features/rides/components/past-rides";
import { RideAgenda } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { listOpenRides } from "@/use-cases/open-rides";
import { MEMBER_LIFE } from "../../../_components/instant";
import { pilotAvatars } from "../../../_components/pilot-avatars";
import { OpenRides, pilotChapterIds } from "./open-rides";

const rideHref = (rideId: string) => `/pilot/rides/${rideId}`;
const PROFILE_BASE = "/pilot/profile";

export async function PilotRides() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const [dict, language, head, { upcoming, past }, open] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
    rides.listPilotRides(session.user.id),
    listOpenRides(session.user.id, pilotChapterIds(session.access)),
  ]);

  const page = dict.member.pages.rides;
  const strings = dict.pilot.rides;
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);

  if (upcoming.length === 0 && past.length === 0 && open.length === 0) {
    return (
      <>
        <h1 className="text-2xl tracking-tight md:text-3xl">{page.title}</h1>
        <section className="flex flex-col items-center gap-3 pt-4 text-center">
          <BenchIllustration className="w-48" />
          <h2 className="text-xl tracking-tight">{strings.list.emptyTitle}</h2>
          <p className="max-w-sm text-ink-soft">{page.pilot.body}</p>
        </section>
      </>
    );
  }

  const avatars = await pilotAvatars([...upcoming, ...past]);

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">{page.title}</h1>

      <OpenRides
        rides={open}
        dict={dict}
        locale={locale}
        words={words}
      />

      <section className="flex flex-col gap-3">
        <SectionHeading>{dict.calendar.upcoming}</SectionHeading>
        {upcoming.length > 0 ? (
          <RideAgenda
            rides={upcoming}
            strings={dict.calendar}
            locale={locale}
            words={words}
            href={rideHref}
            profileBase={PROFILE_BASE}
            pilotAvatars={avatars}
          />
        ) : (
          <p className="text-2sm text-ink-soft rounded-2xl bg-canvas-deep p-4">
            {strings.upcomingEmpty}
          </p>
        )}
      </section>

      {past.length > 0 ? (
        <PastRides
          show={formatMessage(
            strings.list.showPast,
            { count: past.length },
            words,
          )}
          hide={strings.list.hidePast}
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

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-base">{children}</h2>;
}
