import { cacheLife } from "next/cache";

export type WeatherKind =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export type Forecast = { kind: WeatherKind; celsius: number };

/** Open-Meteo forecasts reach about two weeks ahead; past that, there is nothing to say. */
const HORIZON_MS = 14 * 24 * 60 * 60 * 1000;

/** WMO weather codes, folded into what a passenger cares about. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code <= 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunder";
  return "rain";
}

/** The hourly reading closest to `at`, or `null` when the answer has none. */
export function pickHour(
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] },
  at: Date,
): Forecast | null {
  let best = -1;
  let gap = Infinity;
  hourly.time.forEach((time, index) => {
    const distance = Math.abs(new Date(`${time}Z`).getTime() - at.getTime());
    if (distance < gap) {
      gap = distance;
      best = index;
    }
  });
  if (best < 0 || gap > 60 * 60 * 1000) return null;
  const celsius = hourly.temperature_2m[best];
  const code = hourly.weather_code[best];
  if (typeof celsius !== "number" || typeof code !== "number") return null;
  return { kind: weatherKind(code), celsius: Math.round(celsius) };
}

async function hourlyAt(latitude: number, longitude: number, day: string) {
  "use cache";
  cacheLife("hours");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toFixed(2));
  url.searchParams.set("longitude", longitude.toFixed(2));
  url.searchParams.set("hourly", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("start_date", day);
  url.searchParams.set("end_date", day);
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    hourly?: {
      time: string[];
      temperature_2m: number[];
      weather_code: number[];
    };
  };
  return body.hourly ?? null;
}

/**
 * The forecast for a place and an hour — only a chapter's own coordinates go
 * out, rounded to about a kilometre, never a person's. `null` when the hour is
 * too far ahead, already past, or the service does not answer: the weather is
 * a nicety, never something a page waits on or fails for.
 */
export async function forecastFor(
  place: { latitude: number; longitude: number },
  at: Date,
  now = new Date(),
): Promise<Forecast | null> {
  const ahead = at.getTime() - now.getTime();
  if (ahead < -60 * 60 * 1000 || ahead > HORIZON_MS) return null;
  try {
    const hourly = await hourlyAt(
      Number(place.latitude.toFixed(2)),
      Number(place.longitude.toFixed(2)),
      at.toISOString().slice(0, 10),
    );
    return hourly ? pickHour(hourly, at) : null;
  } catch {
    return null;
  }
}
