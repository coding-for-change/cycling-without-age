import type { ReactNode } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { RichText } from "@/components/markdown";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MemberTitle } from "../../../../_components/member-title";
import { EventHeader } from "../../../../_components/ride-detail/event-header";
import { EventHero } from "../../../../_components/ride-detail/event-hero";
import { PlaceCard } from "../../../../_components/ride-detail/place-card";
import type { PilotFace } from "./pilot-faces";

export type EventView = {
  id: string;
  title: string;
  photos: { fileId: string }[];
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  chapterName: string;
  place: {
    name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  description: string | null;
  going: number;
  pilots: PilotFace[];
};

export function EventDetail({
  event,
  dict,
  locale,
  words,
  state,
  chatId = null,
  children,
}: {
  event: EventView;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
  state?: ReactNode;
  chatId?: string | null;
  children?: ReactNode;
}) {
  const strings = dict.passenger.rides.events;
  return (
    <>
      <MemberTitle title={event.title} />
      <EventHero
        rideId={event.id}
        title={event.title}
        photos={event.photos}
      />

      <EventHeader
        eyebrow={event.chapterName}
        title={event.title}
        startsAt={event.startsAt}
        endsAt={event.endsAt}
        timeZone={event.timeZone}
        locale={locale}
      />

      {state}

      <PlaceCard
        place={event.place}
        mapOf={dict.passenger.rides.detail.mapOf}
        strings={dict.member.rides.map}
        words={words}
      />

      {event.description?.trim() ? (
        <RichText
          text={event.description}
          className="text-base"
        />
      ) : null}

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className="text-base">{strings.whoComing}</h2>
        <div className="flex items-center gap-3">
          {event.pilots.length ? (
            <span className="flex shrink-0 -space-x-2">
              {event.pilots.slice(0, 4).map((pilot) => (
                <PersonAvatar
                  key={pilot.id}
                  svg={pilot.svg}
                  photoUrl={pilot.photoUrl}
                  className="ring-2 ring-canvas"
                />
              ))}
            </span>
          ) : null}
          <p className="text-sm text-ink-soft">
            {[
              event.pilots.map((pilot) => pilot.name).join(", "),
              formatMessage(strings.going, { count: event.going }, words),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {chatId ? (
          <Button
            asChild
            variant="outline"
            className="min-h-11 rounded-full border-line"
          >
            <Link
              href={`/passenger/chat/${chatId}`}
              transitionTypes={["push"]}
              aria-label={strings.groupChatLabel}
            >
              <MessageCircle aria-hidden />
              {strings.groupChat}
            </Link>
          </Button>
        ) : null}
      </section>

      {children}
    </>
  );
}
