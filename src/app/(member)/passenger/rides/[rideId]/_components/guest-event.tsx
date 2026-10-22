import Link from "next/link";
import { RichText } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { signInHref } from "@/lib/redirects";
import { EventHeader } from "../../../../_components/ride-detail/event-header";
import { EventHero } from "../../../../_components/ride-detail/event-hero";
import { MemberTitle } from "../../../../_components/member-title";

export type GuestEventData = {
  id: string;
  title: string | null;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  chapter: { name: string; timeZone: string };
  photos: { fileId: string }[];
};

export function GuestEvent({
  event,
  dict,
  locale,
}: {
  event: GuestEventData;
  dict: Dictionary;
  locale: Locale;
}) {
  const title = event.title?.trim() || dict.calendar.models.event;

  return (
    <>
      <MemberTitle title={title} />
      <EventHero
        rideId={event.id}
        title={title}
        photos={event.photos}
      />
      <EventHeader
        eyebrow={event.chapter.name}
        title={title}
        startsAt={event.startsAt}
        endsAt={event.endsAt}
        timeZone={event.chapter.timeZone}
        locale={locale}
      />
      {event.description?.trim() ? (
        <RichText
          text={event.description}
          className="text-base"
        />
      ) : null}
      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <p className="text-ink-soft">{dict.member.guest.heroHint}</p>
        <Button
          asChild
          variant="brand"
          size="hero"
        >
          <Link href={signInHref(`/passenger/rides/${event.id}`)}>
            {dict.passenger.rides.events.guestBook}
          </Link>
        </Button>
      </section>
    </>
  );
}
