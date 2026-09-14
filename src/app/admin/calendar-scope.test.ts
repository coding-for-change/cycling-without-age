import { calendarTimeZone } from "./calendar-scope";

const chapter = (id: string, name: string, timeZone: string) => ({
  id,
  name,
  timeZone,
});

describe("calendarTimeZone", () => {
  it("uses the chapter's own zone when one is in scope", () => {
    expect(
      calendarTimeZone([chapter("a", "München", "Europe/Berlin")]),
    ).toEqual({ timeZone: "Europe/Berlin", label: null });
  });

  it("stays silent when every chapter in scope keeps the same clock", () => {
    expect(
      calendarTimeZone([
        chapter("a", "München", "Europe/Berlin"),
        chapter("b", "Hamburg", "Europe/Berlin"),
      ]),
    ).toEqual({ timeZone: "Europe/Berlin", label: null });
  });

  it("names the clock it picked when chapters span zones", () => {
    const { timeZone, label } = calendarTimeZone([
      chapter("a", "München", "Europe/Berlin"),
      chapter("b", "København", "Europe/Copenhagen"),
    ]);
    expect(timeZone).toBe("Europe/Berlin");
    expect(label).toContain("München");
    expect(label).toContain("Europe/Berlin");
  });

  it("falls back rather than crashing on an empty scope", () => {
    expect(calendarTimeZone([])).toEqual({ timeZone: "UTC", label: null });
  });
});
