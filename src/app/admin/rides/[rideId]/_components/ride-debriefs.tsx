import type { RideDebriefView } from "@/features/rides";
import { formatNumber, type Locale as Notation } from "@/lib/format";
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
  const written = debriefs.filter(
    (debrief) => debrief.note || (functional && debrief.distanceKm !== null),
  );

  return (
    <DetailSection title={written.length > 1 ? copy.titleMany : copy.title}>
      {written.length ? (
        <div className="grid gap-6">
          {written.map((debrief) => (
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
              {functional ? (
                <PropertyList className="max-w-md">
                  <PropertyRow label={copy.distance}>
                    {debrief.distanceKm === null ? (
                      <PropertyValue muted>{copy.unset}</PropertyValue>
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
                </PropertyList>
              ) : null}
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
