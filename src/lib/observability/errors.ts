export const SENSITIVE_KEYS = [
  "address",
  "apiKey",
  "authorization",
  "bcc",
  "birthDate",
  "body",
  "cc",
  "connectionString",
  "cookie",
  "coordinates",
  "DATABASE_URL",
  "dateOfBirth",
  "email",
  "emailAddress",
  "firstName",
  "fullName",
  "html",
  "lastName",
  "lat",
  "latitude",
  "lng",
  "longitude",
  "msisdn",
  "name",
  "otp",
  "password",
  "phone",
  "phoneNumber",
  "postalCode",
  "REDIS_URL",
  "replyTo",
  "secret",
  "street",
  "subject",
  "text",
  "to",
  "token",
] as const;

const sensitive = new Set<string>(SENSITIVE_KEYS);

export const REDACTED = "[redacted]";

const CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi;
const BEARER = /\bBearer\s+[\w\-._~+/]+=*/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /\+\d[\d\s().-]{6,17}\d/g;

/** A calendar feed address is its own credential; see `lib/crypto/feed-signature`. */
export const CALENDAR_FEED_TOKEN = /(\/api\/calendar\/)[^/?#\s"'<>]+/g;

export function scrubText(text: string): string {
  return text
    .replace(CREDENTIALS, `$1${REDACTED}@`)
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(EMAIL, "[email]")
    .replace(PHONE, "[phone]")
    .replace(CALENDAR_FEED_TOKEN, "$1[token]");
}

export function reasonOf(error: unknown): string {
  if (error instanceof Error) return scrubText(error.message);
  if (typeof error === "string") return scrubText(error);
  if (error && typeof error === "object" && "message" in error)
    return scrubText(String((error as { message: unknown }).message));
  return scrubText(String(error));
}

export type SerializedError = {
  type: string;
  message: string;
  stack?: string;
  code?: string;
};

export function serializeError(error: unknown): SerializedError {
  const source = error as { name?: unknown; stack?: unknown; code?: unknown };
  const type =
    error instanceof Error
      ? error.name
      : typeof source?.name === "string"
        ? source.name
        : typeof error;
  const code =
    typeof source?.code === "string" || typeof source?.code === "number"
      ? String(source.code)
      : undefined;

  return {
    type,
    message: reasonOf(error),
    ...(typeof source?.stack === "string"
      ? { stack: scrubText(source.stack) }
      : {}),
    ...(code === undefined ? {} : { code }),
  };
}

export function scrubObject(value: unknown, seen = new WeakSet()): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value))
    return value.map((entry) => scrubObject(entry, seen));

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitive.has(key) ? REDACTED : scrubObject(entry, seen),
    ]),
  );
}
