import { Users } from "lucide-react";
import type { ReportMetric } from "@/features/rides/report";
import type { ReportPeopleHealth } from "@/use-cases/activity-report";
import type { Dictionary } from "@/lib/i18n";
import { formatNumber, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import { DeltaPill, type DeltaStrings } from "./delta-pill";
import { ReportCard } from "./report-card";
import { EmptyCard } from "./empty-card";

export type PeopleHealthStrings = Dictionary["admin"]["reports"]["people"];

function Split({
  label,
  active,
  inactive,
  notation,
  language,
  strings,
}: {
  label: string;
  active: number;
  inactive: number;
  notation: Locale;
  language: Language;
  strings: PeopleHealthStrings;
}) {
  const total = active + inactive;
  const share = total > 0 ? active / total : 0;
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-2sm text-ink-soft tabular-nums">
          {formatMessage(
            strings.activeShare,
            { share: formatNumber(share, notation, { style: "percent" }) },
            language,
          )}
        </span>
      </div>
      <div
        aria-hidden
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {active > 0 ? (
          <div
            style={{ flexGrow: active }}
            className="rounded-full bg-mint-deep"
          />
        ) : null}
        {inactive > 0 ? (
          <div
            style={{ flexGrow: inactive }}
            className="rounded-full bg-canvas-deeper"
          />
        ) : null}
        {total === 0 ? (
          <div className="flex-1 rounded-full bg-canvas-deep" />
        ) : null}
      </div>
      <div className="flex justify-between gap-3 text-xs text-ink-soft tabular-nums">
        <span className="flex items-center gap-1.25">
          <span
            aria-hidden
            className="size-2 rounded-full bg-mint-deep"
          />
          {formatMessage(strings.active, { count: active }, language)}
        </span>
        <span className="flex items-center gap-1.25">
          <span
            aria-hidden
            className="size-2 rounded-full bg-canvas-deeper"
          />
          {formatMessage(strings.inactive, { count: inactive }, language)}
        </span>
      </div>
    </div>
  );
}

export function PeopleHealthCard({
  people,
  newRiders,
  notation,
  language,
  strings,
  deltaStrings,
}: {
  people: ReportPeopleHealth;
  newRiders: ReportMetric;
  notation: Locale;
  language: Language;
  strings: PeopleHealthStrings;
  deltaStrings: DeltaStrings;
}) {
  const windowBadge = (
    <span
      title={strings.windowHint}
      className="rounded-full bg-canvas-deep px-2 py-0.5 text-xs font-medium text-ink-soft"
    >
      {strings.window}
    </span>
  );

  const everyone =
    people.activePilots +
    people.inactivePilots +
    people.activeRiders +
    people.inactiveRiders;

  if (everyone === 0)
    return (
      <ReportCard
        title={strings.title}
        action={windowBadge}
      >
        <EmptyCard
          icon={Users}
          title={strings.empty.title}
          body={strings.empty.body}
        />
      </ReportCard>
    );

  return (
    <ReportCard
      title={strings.title}
      action={windowBadge}
    >
      <div className="grid gap-5">
        <Split
          label={strings.pilots}
          active={people.activePilots}
          inactive={people.inactivePilots}
          notation={notation}
          language={language}
          strings={strings}
        />
        <Split
          label={strings.riders}
          active={people.activeRiders}
          inactive={people.inactiveRiders}
          notation={notation}
          language={language}
          strings={strings}
        />
      </div>
      <p className="text-xs text-ink-soft">{strings.windowHint}</p>
      <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
        <div className="grid gap-0.5">
          <span className="text-sm font-medium text-ink">
            {strings.newRiders}
          </span>
          <span className="text-xs text-ink-soft">{strings.newRidersHint}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-ink tabular-nums">
            {formatNumber(newRiders.current, notation)}
          </span>
          <DeltaPill
            value={newRiders.delta}
            unit="relative"
            notation={notation}
            language={language}
            strings={deltaStrings}
          />
        </div>
      </div>
    </ReportCard>
  );
}
