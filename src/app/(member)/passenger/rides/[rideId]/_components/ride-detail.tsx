import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides, type PassengerRideDetailRow } from "@/features/rides";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import type { Locale as UiLocale } from "@/lib/i18n/locales";
import { fullName } from "@/lib/utils";
import { MEMBER_LIFE } from "../../../../_components/instant";
import { EventBookingBar } from "./event-booking-bar";
import { EventDetail } from "./event-detail";
import { EventInvite, seatLabels } from "./event-invite";
import { PersonalRide, RideState } from "./personal-ride";
import { pilotFaces } from "./pilot-faces";
import { SeatAnswers } from "./seat-answers";

export async function RideDetail({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const { rideId } = await params;
  return <PassengerRide rideId={rideId} />;
}

async function PassengerRide({ rideId }: { rideId: string }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [mine, dict, language, head] = await Promise.all([
    passengers.listRidersOfAccount(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const riderIds = mine.map((passenger) => passenger.id);
  const ride = await rides.getRideForPassengers(rideId, riderIds);
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  if (!ride) {
    const event = await rides.getAnnouncedEvent(rideId, [
      ...new Set(mine.map((rider) => rider.chapterId)),
    ]);
    if (!event) redirect("/passenger/rides");
    return (
      <EventInvite
        event={event}
        riders={mine}
        dict={dict}
        language={language}
        locale={locale}
        words={words}
      />
    );
  }

  const now = new Date();
  const ahead = ride.status === "scheduled" && ride.startsAt > now;
  const assigned = ride.assignments.filter(
    (assignment) => assignment.role === "pilot",
  );
  const [settings, wayThereOpen, wayBackOpen, chatId, faces, adminPhones] =
    await Promise.all([
      chapters.getSettings(ride.chapter.id),
      ride.returnLegOf
        ? rides.passengersCanOpen(ride.returnLegOf.id, riderIds)
        : false,
      ride.returnLeg
        ? rides.passengersCanOpen(ride.returnLeg.id, riderIds)
        : false,
      chat.getRideConversationId(ride.id, session.user.id),
      pilotFaces(
        session,
        assigned.map(({ user }) => ({ id: user.id, name: user.name })),
      ),
      ride.model !== "event" && ride.status === "scheduled"
        ? membership.listChapterAdminPhones(ride.chapter.id)
        : [],
    ]);

  const ownRider = new Set(
    mine
      .filter((rider) => rider.userId === session.user.id)
      .map((rider) => rider.id),
  );
  const caretaking = ride.roster.some(
    ({ passenger }) => passenger && !ownRider.has(passenger.id),
  );
  const holdsSeat = ride.roster.some(
    ({ attendance }) => attendance === "booked",
  );
  const seats =
    ride.roster.length > 1 || caretaking ? (
      <Seats
        ride={ride}
        answerable={ahead && ride.roster.length > 1}
        dict={dict}
        language={language}
      />
    ) : null;

  if (ride.model === "event") {
    const booked = new Set(
      ride.roster.flatMap(({ passenger }) => (passenger ? [passenger.id] : [])),
    );
    const moreRiders = mine.filter(
      (rider) => rider.chapterId === ride.chapter.id && !booked.has(rider.id),
    );
    return (
      <EventDetail
        event={{
          id: ride.id,
          title: ride.title?.trim() || dict.calendar.models.event,
          photos: ride.photos,
          startsAt: ride.startsAt,
          endsAt: ride.endsAt,
          timeZone: ride.chapter.timeZone,
          chapterName: ride.chapter.name,
          place: {
            name: ride.locationName,
            address: ride.locationAddress,
            latitude: ride.latitude,
            longitude: ride.longitude,
          },
          description: ride.description,
          going: ride._count.roster,
          pilots: faces,
        }}
        dict={dict}
        locale={locale}
        words={words}
        chatId={chatId}
        state={
          <RideState
            ride={ride}
            strings={dict.passenger.rides}
          />
        }
      >
        {seats}
        {ahead ? (
          <EventBookingBar
            rideId={ride.id}
            seatsLeft={rides.seatsLeft(ride)}
            bookable={
              ride.announced
                ? moreRiders.map((rider) => ({
                    id: rider.id,
                    name: fullName(rider),
                  }))
                : []
            }
            going={holdsSeat}
            language={language}
            labels={dict.passenger.rides.events.bar}
            seatLabels={seatLabels(dict)}
          />
        ) : null}
      </EventDetail>
    );
  }

  const phones = Object.fromEntries(
    assigned.flatMap(({ user }) =>
      user.phoneNumber ? [[user.id, user.phoneNumber]] : [],
    ),
  );

  return (
    <PersonalRide
      ride={ride}
      pilots={faces}
      phones={phones}
      chatId={chatId}
      chapterEmail={settings.replyToEmail?.trim() || null}
      adminPhones={adminPhones.filter(
        (phone) => phone.userId !== session.user.id,
      )}
      wayThereOpen={wayThereOpen}
      wayBackOpen={wayBackOpen}
      holdsSeat={holdsSeat}
      now={now}
      seats={seats}
      dict={dict}
      locale={locale}
      words={words}
    />
  );
}

function Seats({
  ride,
  answerable,
  dict,
  language,
}: {
  ride: PassengerRideDetailRow;
  answerable: boolean;
  dict: Dictionary;
  language: UiLocale;
}) {
  const strings = dict.passenger.rides;
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5">
      <h2 className="text-base">{strings.detail.riders}</h2>
      <SeatAnswers
        rideId={ride.id}
        riders={ride.roster.flatMap(({ passenger, attendance }) =>
          passenger
            ? [
                {
                  passengerId: passenger.id,
                  name: fullName(passenger),
                  attendance,
                },
              ]
            : [],
        )}
        answerable={answerable}
        language={language}
        labels={{
          states: strings.seat.states,
          cancel: strings.seat.cancel,
          errors: { ...dict.common.errors, ...strings.seat.errors },
        }}
      />
    </section>
  );
}
