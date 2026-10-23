import { formatInstantDate } from "./instant-date";

const halfPastMidnightBerlin = new Date("2026-10-22T22:30:00Z");

describe("formatInstantDate", () => {
  it("dates an instant on the given zone's calendar, not UTC's", () => {
    expect(
      formatInstantDate(halfPastMidnightBerlin, "de-DE", "Europe/Berlin"),
    ).toBe("23.10.2026");
    expect(formatInstantDate(halfPastMidnightBerlin, "de-DE", "UTC")).toBe(
      "22.10.2026",
    );
  });

  it("writes the medium style for the same local day", () => {
    expect(
      formatInstantDate(
        halfPastMidnightBerlin.toISOString(),
        "en-GB",
        "Europe/Berlin",
        "medium",
      ),
    ).toBe("23 Oct 2026");
  });
});
