import { Route as RouteIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  formatDistance,
  formatDuration,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import type { Coords } from "@/lib/geo";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { ResolvedPlace, Route } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

export type Place = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export const placeFromResolved = (found: ResolvedPlace): Place => ({
  name: found.poiName ?? found.address.split(",")[0].trim(),
  address: found.address,
  latitude: found.coords.lat,
  longitude: found.coords.lng,
});

export const coordsOf = (
  place: { latitude: number | null; longitude: number | null } | null,
): Coords | null =>
  place && place.latitude !== null && place.longitude !== null
    ? { lat: place.latitude, lng: place.longitude }
    : null;

export function PlaceValue({
  name,
  address,
  muted = false,
  className,
}: {
  name: string | null;
  address: string | null;
  muted?: boolean;
  className?: string;
}) {
  const detail = address && address !== name ? address : null;
  if (!name && !detail) return null;
  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      {name ? (
        <span
          className={cn(
            "truncate text-sm",
            muted ? "text-ink-faint" : "text-ink",
          )}
        >
          {name}
        </span>
      ) : null}
      {detail ? (
        <span className="truncate text-xs text-ink-soft">{detail}</span>
      ) : null}
    </span>
  );
}

export function RouteSummary({
  route,
  loading = false,
  template,
  loadingLabel,
  failed,
  language,
  notation,
  className,
}: {
  route: Route | null;
  loading?: boolean;
  template: string;
  loadingLabel?: string;
  failed?: string;
  language: Locale;
  notation: Notation;
  className?: string;
}) {
  const text = loading
    ? loadingLabel
    : route
      ? formatMessage(
          template,
          {
            duration: formatDuration(
              Math.max(60, route.durationSec),
              wordsLocale(language),
            ),
            distance: formatDistance(route.distanceM, notation),
          },
          language,
        )
      : failed;
  if (!text) return null;
  return (
    <p
      aria-live="polite"
      className={cn(
        "flex items-center text-ink-soft tabular-nums [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    >
      {loading ? <Spinner aria-hidden /> : <RouteIcon aria-hidden />}
      {text}
    </p>
  );
}
