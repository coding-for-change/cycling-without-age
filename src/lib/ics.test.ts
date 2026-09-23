import {
  escapeText,
  foldLine,
  icsDateTime,
  renderIcs,
  type IcsEvent,
} from "./ics";

const octets = (line: string) => new TextEncoder().encode(line).length;

const event = (over: Partial<IcsEvent> = {}): IcsEvent => ({
  uid: "ride-1@cwa.example",
  start: new Date("2026-10-03T08:00:00Z"),
  end: new Date("2026-10-03T09:30:00Z"),
  stamp: new Date("2026-09-20T12:34:56Z"),
  summary: "Event ride",
  ...over,
});

const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("icsDateTime", () => {
  it("writes UTC basic format", () => {
    expect(icsDateTime(new Date("2026-03-07T14:05:09.999Z"))).toBe(
      "20260307T140509Z",
    );
  });
});

describe("escapeText", () => {
  it("escapes the four TEXT specials", () => {
    expect(escapeText("a\\b;c,d")).toBe("a\\\\b\\;c\\,d");
  });

  it("turns every kind of line break into a literal \\n", () => {
    expect(escapeText("one\r\ntwo\nthree\rfour")).toBe(
      "one\\ntwo\\nthree\\nfour",
    );
  });

  it("cannot be used to start a new property", () => {
    const hostile = "Park\r\nATTACH:https://evil.example/x\nEND:VEVENT";
    const ics = renderIcs({
      prodId: "-//Test//EN",
      name: "Rides",
      events: [event({ location: hostile })],
    });
    const lines = unfold(ics).split("\r\n");
    expect(lines.filter((line) => line.startsWith("ATTACH"))).toEqual([]);
    expect(lines.filter((line) => line === "END:VEVENT")).toHaveLength(1);
  });

  it("treats Unicode line breaks as line breaks too", () => {
    expect(escapeText("a\u0085b\u2028c\u2029d")).toBe("a\\nb\\nc\\nd");
  });

  it("drops C1 control characters", () => {
    expect(escapeText("a\u0080b\u009fc")).toBe("abc");
  });

  it("drops control characters", () => {
    expect(escapeText("a\u0000b\u0007c\u001fd\te")).toBe("abcd\te");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:Event ride")).toBe("SUMMARY:Event ride");
  });

  it("folds at 75 octets with a leading space", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(octets(line)).toBeLessThanOrEqual(75);
    for (const line of lines.slice(1)) expect(line.startsWith(" ")).toBe(true);
    expect(unfold(folded)).toBe(`DESCRIPTION:${"x".repeat(200)}`);
  });

  it("never splits a multi-byte character", () => {
    const value = `LOCATION:${"Müller-Straße ü ".repeat(12)}🚲`;
    const folded = foldLine(value);
    for (const line of folded.split("\r\n"))
      expect(octets(line)).toBeLessThanOrEqual(75);
    expect(unfold(folded)).toBe(value);
    expect(folded).not.toContain("�");
  });
});

describe("renderIcs", () => {
  const ics = renderIcs({
    prodId: "-//Coding for Change//CWA GO//EN",
    name: "My rides",
    description: "Rides, kept current",
    refreshMinutes: 60,
    events: [
      event({
        description: "CWA München\nTrishaw: Sonnenstrahl",
        location: "Seniorenheim, Hauptstraße 1",
        url: "https://cwa.example/pilot",
      }),
      event({ uid: "ride-2@cwa.example", status: "CANCELLED" }),
    ],
  });

  it("uses CRLF throughout and ends with one", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("wraps the events in one calendar", () => {
    const lines = unfold(ics).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("X-WR-CALNAME:My rides");
    expect(lines).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT60M");
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(2);
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("writes each event in UTC with its status", () => {
    const lines = unfold(ics).split("\r\n");
    expect(lines).toContain("DTSTART:20261003T080000Z");
    expect(lines).toContain("DTEND:20261003T093000Z");
    expect(lines).toContain("DTSTAMP:20260920T123456Z");
    expect(lines).toContain("LOCATION:Seniorenheim\\, Hauptstraße 1");
    expect(lines).toContain("DESCRIPTION:CWA München\\nTrishaw: Sonnenstrahl");
    expect(lines).toContain("URL:https://cwa.example/pilot");
    expect(lines).toContain("STATUS:CANCELLED");
  });

  it("is byte-for-byte stable for the same input", () => {
    const again = renderIcs({
      prodId: "-//Coding for Change//CWA GO//EN",
      name: "My rides",
      description: "Rides, kept current",
      refreshMinutes: 60,
      events: [
        event({
          description: "CWA München\nTrishaw: Sonnenstrahl",
          location: "Seniorenheim, Hauptstraße 1",
          url: "https://cwa.example/pilot",
        }),
        event({ uid: "ride-2@cwa.example", status: "CANCELLED" }),
      ],
    });
    expect(again).toBe(ics);
  });
});
