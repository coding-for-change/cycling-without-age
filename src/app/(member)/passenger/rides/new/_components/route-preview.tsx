"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  previewRequestRouteAction,
  type RoutePreview as Route,
} from "@/features/ride-requests/actions";
import { LazyRideMap } from "@/features/rides/components/ride-map-lazy";
import {
  formatDistance,
  formatDuration,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import type { Coords } from "@/lib/geo";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { MAP_ENABLED } from "@/lib/mapbox-map";

type Strings = {
  routeMap: string;
  routeSummary: string;
  mapUnavailable: string;
};

const keyOf = (from: Coords, to: Coords) =>
  `${from.lat},${from.lng};${to.lat},${to.lng}`;

export function RoutePreview({
  from,
  to,
  fromName,
  toName,
  strings,
  language,
  notation,
}: {
  from: Coords;
  to: Coords;
  fromName: string;
  toName: string;
  strings: Strings;
  language: Locale;
  notation: Notation;
}) {
  const key = keyOf(from, to);
  const [answer, setAnswer] = useState<{
    key: string;
    route: Route | null;
  } | null>(null);

  const { lat: fromLat, lng: fromLng } = from;
  const { lat: toLat, lng: toLng } = to;

  useEffect(() => {
    let live = true;
    const pair = {
      from: { lat: fromLat, lng: fromLng },
      to: { lat: toLat, lng: toLng },
    };
    void previewRequestRouteAction(pair)
      .catch(() => null)
      .then((route) => {
        if (live) setAnswer({ key: keyOf(pair.from, pair.to), route });
      });
    return () => {
      live = false;
    };
  }, [fromLat, fromLng, toLat, toLng]);

  const loading = answer?.key !== key;
  const route = answer?.key === key ? answer.route : null;

  if (!MAP_ENABLED && !loading && !route) return null;

  return (
    <figure className="flex flex-col gap-2">
      {MAP_ENABLED ? (
        <LazyRideMap
          pickup={from}
          destination={to}
          route={route?.path ?? null}
          label={formatMessage(
            strings.routeMap,
            { from: fromName, to: toName },
            language,
          )}
          unavailable={strings.mapUnavailable}
          className="h-48 rounded-2xl"
        />
      ) : null}
      {loading ? (
        <Skeleton className="h-5 w-40" />
      ) : route ? (
        <figcaption className="text-2sm text-ink-soft tabular-nums">
          {formatMessage(
            strings.routeSummary,
            {
              distance: formatDistance(route.distanceM, notation),
              duration: formatDuration(
                route.durationSec,
                wordsLocale(language),
              ),
            },
            language,
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}
