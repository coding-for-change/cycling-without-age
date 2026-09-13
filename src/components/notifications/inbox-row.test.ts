import type { InboxItem } from "@/use-cases/notifications/inbox";
import { formatBadge, toInboxRow } from "./inbox-row";

const NOW = new Date("2026-09-09T12:00:00Z");

const item = (over: Partial<InboxItem> = {}): InboxItem => ({
  id: "n1",
  category: "application",
  title: "München says welcome",
  body: "Watch the training videos, then meet a captain.",
  href: "/pilot",
  createdAt: new Date("2026-09-07T09:30:00Z"),
  readAt: null,
  seenAt: null,
  ...over,
});

describe("formatBadge", () => {
  it("has no badge at zero", () => {
    expect(formatBadge(0)).toBeNull();
    expect(formatBadge(-1)).toBeNull();
  });

  it("counts up to nine", () => {
    expect(formatBadge(1)).toBe("1");
    expect(formatBadge(9)).toBe("9");
  });

  it("caps everything above nine", () => {
    expect(formatBadge(10)).toBe("9+");
    expect(formatBadge(120)).toBe("9+");
  });
});

describe("toInboxRow", () => {
  it("is unread until the notification carries a readAt", () => {
    const options = { words: "en", notation: "en-GB" as const, now: NOW };
    expect(toInboxRow(item(), options).unread).toBe(true);
    expect(
      toInboxRow(item({ readAt: new Date("2026-09-08T00:00:00Z") }), options)
        .unread,
    ).toBe(false);
  });

  it("writes the relative time in the words locale", () => {
    expect(
      toInboxRow(item(), { words: "en", notation: "en-GB", now: NOW }).when,
    ).toBe("2d ago");
    expect(
      toInboxRow(item(), { words: "de", notation: "en-GB", now: NOW }).when,
    ).toBe("vorgestern");
  });

  it("writes the exact date in the notation locale, machine time in ISO", () => {
    const row = toInboxRow(item(), {
      words: "en",
      notation: "de-DE",
      now: NOW,
    });
    expect(row.whenExact).toBe("07.09.2026");
    expect(row.dateTime).toBe("2026-09-07T09:30:00.000Z");

    expect(
      toInboxRow(item(), { words: "en", notation: "en-US", now: NOW })
        .whenExact,
    ).toBe("09/07/2026");
  });

  it("carries the notification through untouched", () => {
    const row = toInboxRow(item(), {
      words: "en",
      notation: "en-GB",
      now: NOW,
    });
    expect(row).toMatchObject({
      id: "n1",
      category: "application",
      title: "München says welcome",
      body: "Watch the training videos, then meet a captain.",
      href: "/pilot",
    });
  });
});
