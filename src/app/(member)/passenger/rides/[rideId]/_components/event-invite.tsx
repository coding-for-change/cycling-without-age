import { rides, type AnnouncedEventRow } from "@/features/rides";
import type { Locale } from "@/lib/format";
import type { Dictionary, Locale as UiLocale } from "@/lib/i18n";
import { fullName } from "@/lib/utils";
import type { BookSeatsLabels } from "./book-seats";
import { EventBookingBar } from "./event-booking-bar";
import { EventDetail } from "./event-detail";

type Rider = {
  id: string;
  firstName: string;
  lastName: string;
  chapterId: string;
};

export const seatLabels = (dict: Dictionary): BookSeatsLabels => {
  const { book, errors } = dict.passenger.rides.events;
  return { ...book, errors: { ...dict.common.errors, ...errors } };
};

export function EventInvite({
  event,
  riders,
  dict,
  language,
  locale,
  words,
}: {
  event: AnnouncedEventRow;
  riders: Rider[];
  dict: Dictionary;
  language: UiLocale;
  locale: Locale;
  words: Locale;
}) {
  const title = event.title?.trim() || dict.calendar.models.event;
  const bookable = riders.filter(
    (rider) => rider.chapterId === event.chapterId,
  );

  return (
    <EventDetail
      event={{
        id: event.id,
        title,
        photos: event.photos,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        timeZone: event.chapter.timeZone,
        chapterName: event.chapter.name,
        place: {
          name: event.locationName,
          address: event.locationAddress,
          latitude: event.latitude,
          longitude: event.longitude,
        },
        description: event.description,
        going: event._count.roster,
        pilots: [],
      }}
      dict={dict}
      locale={locale}
      words={words}
    >
      <EventBookingBar
        rideId={event.id}
        seatsLeft={rides.seatsLeft(event)}
        bookable={bookable.map((rider) => ({
          id: rider.id,
          name: fullName(rider),
        }))}
        going={false}
        language={language}
        labels={dict.passenger.rides.events.bar}
        seatLabels={seatLabels(dict)}
      />
    </EventDetail>
  );
}
