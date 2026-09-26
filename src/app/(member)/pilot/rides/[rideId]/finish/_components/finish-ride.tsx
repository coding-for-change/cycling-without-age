import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Accessibility,
  CalendarClock,
  DoorOpen,
  ExternalLink,
  KeyRound,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import type { DamageFormLabels } from "@/features/fleet/components/damage-form";
import { DamageReportDrawer } from "@/features/fleet/components/damage-report-drawer";
import { FileImage, FileThumb } from "@/features/fleet/components/file-image";
import { requirePerspective } from "@/lib/auth-guards";
import { calendarDate } from "@/lib/calendar";
import { googleMapsUrl } from "@/lib/geo";
import {
  formatShortDateWithWeekday,
  formatTime,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { trishawSummary } from "@/components/trishaw-summary";
import {
  getDictionary,
  getLocale,
  type Dictionary,
  type Locale as UiLocale,
} from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { finishRideView } from "@/use-cases/finish-ride";
import { DoneButton } from "./done-button";

type View = NonNullable<Awaited<ReturnType<typeof finishRideView>>>;
type Entry = View["trishaws"][number];

export async function FinishRide({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const [{ rideId }, session] = await Promise.all([
    params,
    requirePerspective("pilot"),
  ]);
  const [view, dict, language, head] = await Promise.all([
    finishRideView(rideId, session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!view) notFound();

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const { finish, common } = dict.fleet;
  const { ride } = view;
  const zone = ride.chapter.timeZone;

  const damageLabels: DamageFormLabels = {
    ...common.damage,
    gallery: { ...common.gallery, errors: common.errors },
    errors: common.errors,
  };

  return (
    <>
      <header className="flex flex-col gap-1.25">
        <h1 className="text-2xl tracking-tight md:text-3xl">{finish.title}</h1>
        <p className="text-ink-soft">{finish.intro}</p>
      </header>

      <section
        aria-label={finish.ride}
        className="bg-mint-tint flex items-start gap-3 rounded-2xl p-4"
      >
        <CalendarClock
          aria-hidden
          className="text-ink mt-0.5 size-5 shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">
            {formatShortDateWithWeekday(
              calendarDate(ride.startsAt, zone),
              locale,
            )}
            {" · "}
            <time dateTime={ride.startsAt.toISOString()}>
              {formatTime(ride.startsAt, locale, zone)}
            </time>
            {" – "}
            <time dateTime={ride.endsAt.toISOString()}>
              {formatTime(ride.endsAt, locale, zone)}
            </time>
          </p>
          <p className="text-2sm text-ink-soft">
            {[ride.chapter.name, ride.locationName].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>

      {view.instructions?.trim() ? (
        <section className="flex flex-col gap-3">
          <SectionHeading>{finish.beforeYouLeave}</SectionHeading>
          <div className="border-line rounded-2xl border p-4">
            <RichText
              text={view.instructions}
              className="text-sm"
            />
          </div>
        </section>
      ) : null}

      {view.trishaws.length === 0 ? (
        <p className="text-2sm text-ink-soft border-line rounded-2xl border p-4">
          {finish.noTrishaws}
        </p>
      ) : (
        view.trishaws.map((entry) => (
          <TrishawReturn
            key={entry.trishaw.id}
            rideId={ride.id}
            entry={entry}
            dict={dict}
            damageLabels={damageLabels}
            locale={locale}
            language={language}
            words={words}
            timeZone={zone}
          />
        ))
      )}

      <div className="mt-auto flex flex-col pt-4">
        <DoneButton
          label={finish.done}
          thanks={finish.thanks}
        />
      </div>
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

function TrishawReturn({
  rideId,
  entry,
  dict,
  damageLabels,
  locale,
  language,
  words,
  timeZone,
}: {
  rideId: string;
  entry: Entry;
  dict: Dictionary;
  damageLabels: DamageFormLabels;
  locale: Locale;
  language: UiLocale;
  words: Locale;
  timeZone: string;
}) {
  const { trishaw, location, reported } = entry;
  const { finish, common } = dict.fleet;
  const summary = trishawSummary(trishaw, dict, words);
  const maps = location ? googleMapsUrl(location) : null;
  const grounded = trishaw.damages.some((damage) => damage.grounding);

  return (
    <article className="border-line overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-4 p-4">
        <FileThumb
          fileId={summary.photoFileId}
          alt={trishaw.name}
          size="lg"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-lg">{trishaw.name}</h2>
          <p className="text-2sm text-ink-soft flex flex-wrap items-center gap-x-1.25">
            {[summary.model, summary.seats].filter(Boolean).join(" · ")}
            {summary.wheelchair ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <Accessibility
                  aria-hidden
                  className="size-3.5"
                />
                {common.wheelchair}
              </span>
            ) : null}
          </p>
          {grounded ? (
            <Badge className="bg-red-tint text-ink">
              <TriangleAlert
                aria-hidden
                className="text-red"
              />
              {common.grounded}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="border-line flex flex-col gap-4 border-t p-4">
        <h3 className="text-sm font-semibold">{finish.returnTitle}</h3>
        {location ? (
          <>
            <div className="flex items-start gap-3">
              <MapPin
                aria-hidden
                className="text-mint-deep mt-0.5 size-4 shrink-0"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-medium">
                  {location.name}
                  {summary.isPool ? (
                    <Badge
                      variant="outline"
                      className="border-line text-ink-soft ml-2 align-middle"
                    >
                      {common.pool}
                    </Badge>
                  ) : null}
                </p>
                {location.address ? (
                  <p className="text-2sm text-ink-soft">{location.address}</p>
                ) : null}
                {maps ? (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2sm inline-flex min-h-11 w-fit items-center gap-1.25 font-medium underline underline-offset-2"
                  >
                    <ExternalLink
                      aria-hidden
                      className="size-3.5"
                    />
                    {finish.openInMaps}
                  </a>
                ) : null}
              </div>
            </div>

            {location.accessCode ? (
              <div className="bg-mint-tint flex items-center gap-3 rounded-xl p-4">
                <KeyRound
                  aria-hidden
                  className="text-ink size-5 shrink-0"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-2sm text-ink-soft">{finish.accessCode}</p>
                  <p className="font-display text-3xl font-bold tracking-widest tabular-nums select-all">
                    {location.accessCode}
                  </p>
                </div>
              </div>
            ) : null}

            {location.entrance || location.entrancePhotoFileId ? (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-1.25 text-sm font-medium">
                  <DoorOpen
                    aria-hidden
                    className="size-4"
                  />
                  {finish.entrance}
                </p>
                {location.entrance ? (
                  <p className="text-2sm">{location.entrance}</p>
                ) : null}
                {location.entrancePhotoFileId ? (
                  <FileImage
                    fileId={location.entrancePhotoFileId}
                    alt={formatMessage(
                      finish.entrancePhoto,
                      { location: location.name },
                      words,
                    )}
                    className="aspect-video w-full rounded-xl"
                  />
                ) : null}
              </div>
            ) : null}

            {location.accessNotes?.trim() ? (
              <div className="flex flex-col gap-1.25">
                <p className="text-sm font-medium">{finish.accessNotes}</p>
                <RichText text={location.accessNotes} />
              </div>
            ) : null}

            {location.returnInstructions?.trim() ? (
              <div className="flex flex-col gap-1.25">
                <p className="text-sm font-medium">
                  {finish.returnInstructions}
                </p>
                <RichText text={location.returnInstructions} />
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-2sm text-ink-soft">{finish.noLocation}</p>
        )}
      </div>

      <div className="border-line flex flex-col gap-3 border-t p-4">
        {reported.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{finish.reported}</h3>
            <ul className="flex flex-col gap-3">
              {reported.map((damage) => (
                <li
                  key={damage.id}
                  className="bg-canvas-deep flex items-start gap-3 rounded-xl p-3"
                >
                  {damage.photoFileId ? (
                    <FileThumb
                      fileId={damage.photoFileId}
                      alt=""
                      size="md"
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-2sm whitespace-pre-line">
                      {damage.description}
                    </p>
                    <p className="text-ink-soft flex flex-wrap items-center gap-x-1.25 text-xs">
                      <time dateTime={damage.reportedAt.toISOString()}>
                        {formatTime(damage.reportedAt, locale, timeZone)}
                      </time>
                      {damage.grounding ? (
                        <>
                          <span aria-hidden>·</span>
                          {common.grounded}
                        </>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <DamageReportDrawer
          rideId={rideId}
          locale={language}
          trishawId={trishaw.id}
          trishawName={trishaw.name}
          paramValue={trishaw.id}
          triggerClassName="border-line min-h-11 w-full rounded-full sm:w-fit"
          labels={{
            ...damageLabels,
            open: common.damage.report,
            title: formatMessage(
              finish.reportTitle,
              { name: trishaw.name },
              words,
            ),
            body: finish.reportBody,
          }}
        />
      </div>
    </article>
  );
}
