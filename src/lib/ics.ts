/**
 * An RFC 5545 writer for a subscribed feed: one VCALENDAR of VEVENTs in UTC.
 *
 * UTC rather than TZID + VTIMEZONE because every client converts a `Z` time
 * into the reader's own zone, and a VTIMEZONE block would have to be generated
 * from the tz database for every zone a chapter uses.
 */

export type IcsStatus = "CONFIRMED" | "TENTATIVE" | "CANCELLED";

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  stamp: Date;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  status?: IcsStatus;
};

export type IcsCalendar = {
  prodId: string;
  name: string;
  description?: string | null;
  refreshMinutes?: number;
  events: IcsEvent[];
};

const CRLF = "\r\n";
const MAX_OCTETS = 75;

const pad = (value: number) => String(value).padStart(2, "0");

export function icsDateTime(instant: Date): string {
  return (
    `${instant.getUTCFullYear()}${pad(instant.getUTCMonth() + 1)}${pad(instant.getUTCDate())}` +
    `T${pad(instant.getUTCHours())}${pad(instant.getUTCMinutes())}${pad(instant.getUTCSeconds())}Z`
  );
}

const CONTROL =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u0084\u0086-\u009f]/g;

/** Unicode's own line breaks too: some parsers split on NEL, LS and PS. */
const LINE_BREAK = /\r\n|[\r\n\u0085\u2028\u2029]/g;

/**
 * TEXT escaping. A raw line break would end the property and let whatever
 * follows be read as a new one, so every CR/LF becomes the two characters `\n`.
 */
export function escapeText(value: string): string {
  return value
    .replace(CONTROL, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(LINE_BREAK, "\\n");
}

const singleLine = (value: string) =>
  value.replace(CONTROL, "").replace(LINE_BREAK, "");

/**
 * Folds at 75 octets, not characters, and never inside a UTF-8 sequence — a
 * "ü" split across two lines is two broken bytes to every client.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let octets = 0;
  let limit = MAX_OCTETS;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > limit) {
      lines.push(current);
      current = "";
      octets = 0;
      limit = MAX_OCTETS - 1;
    }
    current += char;
    octets += size;
  }
  lines.push(current);

  return lines.join(`${CRLF} `);
}

const text = (name: string, value: string | null | undefined) =>
  value ? [`${name}:${escapeText(value)}`] : [];

const uri = (name: string, value: string | null | undefined) =>
  value ? [`${name}:${singleLine(value)}`] : [];

function eventLines(event: IcsEvent): string[] {
  return [
    "BEGIN:VEVENT",
    ...text("UID", event.uid),
    `DTSTAMP:${icsDateTime(event.stamp)}`,
    `LAST-MODIFIED:${icsDateTime(event.stamp)}`,
    `DTSTART:${icsDateTime(event.start)}`,
    `DTEND:${icsDateTime(event.end)}`,
    ...text("SUMMARY", event.summary),
    ...text("LOCATION", event.location),
    ...text("DESCRIPTION", event.description),
    ...uri("URL", event.url),
    `STATUS:${event.status ?? "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];
}

export function renderIcs(calendar: IcsCalendar): string {
  const refresh = calendar.refreshMinutes
    ? [
        `REFRESH-INTERVAL;VALUE=DURATION:PT${calendar.refreshMinutes}M`,
        `X-PUBLISHED-TTL:PT${calendar.refreshMinutes}M`,
      ]
    : [];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...text("PRODID", calendar.prodId),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...text("NAME", calendar.name),
    ...text("X-WR-CALNAME", calendar.name),
    ...text("X-WR-CALDESC", calendar.description),
    ...refresh,
    ...calendar.events.flatMap(eventLines),
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join(CRLF) + CRLF;
}
