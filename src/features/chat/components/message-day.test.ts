import { formatMessageDay, messageDayKey } from "./message-day";

const halfPastMidnightBerlin = "2026-10-22T22:30:00.000Z";

describe("message day", () => {
  it("groups a message by the viewer's local day, not the UTC day", () => {
    expect(messageDayKey(halfPastMidnightBerlin, "Europe/Berlin")).toBe(
      "2026-10-23",
    );
    expect(messageDayKey(halfPastMidnightBerlin, "UTC")).toBe("2026-10-22");
  });

  it("labels the separator with the same local day", () => {
    expect(
      formatMessageDay(halfPastMidnightBerlin, "de-DE", "Europe/Berlin"),
    ).toBe("23.10.2026");
  });

  it("keeps two messages either side of local midnight on different days", () => {
    expect(messageDayKey("2026-10-22T21:59:00.000Z", "Europe/Berlin")).not.toBe(
      messageDayKey("2026-10-22T22:01:00.000Z", "Europe/Berlin"),
    );
  });
});
