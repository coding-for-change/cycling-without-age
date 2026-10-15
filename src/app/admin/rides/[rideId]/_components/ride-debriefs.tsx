import type { RideDebriefView } from "@/features/rides";
import {
  formatCurrency,
  formatNumber,
  type Locale as Notation,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { DetailEmpty, DetailSection } from "../../../_components/detail-page";
import {
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";
import { TimelineBubble } from "../../../_components/timeline";

/** Story 32a: each pilot's report on the ride, as the day report reads it. */
export function RideDebriefs({
  debriefs,
  functional,
  dict,
  language,
  notation,
}: {
  debriefs: RideDebriefView[];
  functional: boolean;
  dict: Dictionary;
  language: Locale;
  notation: Notation;
}) {
  const copy = dict.rides.execution.debrief;
  const unset = <PropertyValue muted>{copy.unset}</PropertyValue>;

  return (
    <DetailSection title={debriefs.length > 1 ? copy.titleMany : copy.title}>
      {debriefs.length ? (
        <div className="grid gap-6">
          {debriefs.map((debrief) => (
            <article
              key={debrief.id}
              className="grid gap-3"
            >
              <h3 className="text-2sm font-medium">
                {formatMessage(
                  copy.by,
                  { name: debrief.user?.name ?? copy.someone },
                  language,
                )}
              </h3>
              <PropertyList className="max-w-md">
                {functional ? (
                  <PropertyRow label={copy.distance}>
                    {debrief.distanceKm === null ? (
                      unset
                    ) : (
                      <PropertyValue className="tabular-nums">
                        {formatMessage(
                          copy.kilometres,
                          {
                            km: formatNumber(debrief.distanceKm, notation, {
                              maximumFractionDigits: 2,
                            }),
                          },
                          language,
                        )}
                      </PropertyValue>
                    )}
                  </PropertyRow>
                ) : null}
                <PropertyRow label={copy.donation}>
                  {debrief.donationCents === null ? (
                    unset
                  ) : (
                    <PropertyValue className="tabular-nums">
                      {debrief.currency
                        ? formatCurrency(
                            debrief.donationCents / 100,
                            debrief.currency,
                            notation,
                          )
                        : formatNumber(debrief.donationCents / 100, notation, {
                            minimumFractionDigits: 2,
                          })}
                    </PropertyValue>
                  )}
                </PropertyRow>
                <PropertyRow label={copy.bikeCondition}>
                  {debrief.bikeCondition ? (
                    <PropertyValue>
                      {copy.ratings[debrief.bikeCondition]}
                    </PropertyValue>
                  ) : (
                    unset
                  )}
                </PropertyRow>
                <PropertyRow label={copy.cooperation}>
                  {debrief.cooperation ? (
                    <PropertyValue>
                      {copy.ratings[debrief.cooperation]}
                    </PropertyValue>
                  ) : (
                    unset
                  )}
                </PropertyRow>
              </PropertyList>
              {debrief.note ? (
                <TimelineBubble>{debrief.note}</TimelineBubble>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <DetailEmpty>{copy.none}</DetailEmpty>
      )}
    </DetailSection>
  );
}
