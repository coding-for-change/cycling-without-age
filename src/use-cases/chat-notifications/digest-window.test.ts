import {
  DIGEST_DEBOUNCE_MS,
  DIGEST_MAX_WAIT_MS,
  digestDelay,
  isMuted,
} from "@/use-cases/chat-notifications/digest-window";

const NOW = Date.parse("2026-09-17T12:00:00.000Z");

describe("digestDelay", () => {
  it("waits the full debounce for the first message of a window", () => {
    expect(digestDelay({ windowStartedAt: NOW, now: NOW })).toBe(
      DIGEST_DEBOUNCE_MS,
    );
  });

  it("keeps sliding while the window is young", () => {
    expect(
      digestDelay({ windowStartedAt: NOW, now: NOW + DIGEST_DEBOUNCE_MS }),
    ).toBe(DIGEST_DEBOUNCE_MS);
  });

  it("shortens the wait as the cap comes into view", () => {
    expect(
      digestDelay({
        windowStartedAt: NOW,
        now: NOW + DIGEST_MAX_WAIT_MS - 60_000,
      }),
    ).toBe(60_000);
  });

  it("sends at once once the cap is reached", () => {
    expect(
      digestDelay({ windowStartedAt: NOW, now: NOW + DIGEST_MAX_WAIT_MS }),
    ).toBe(0);
  });

  it("never asks for a delay in the past", () => {
    expect(
      digestDelay({
        windowStartedAt: NOW,
        now: NOW + DIGEST_MAX_WAIT_MS + 600_000,
      }),
    ).toBe(0);
  });
});

describe("isMuted", () => {
  it("treats no mute as audible", () => {
    expect(isMuted(null, NOW)).toBe(false);
  });

  it("holds a mute that has not run out", () => {
    expect(isMuted(new Date(NOW + 60_000).toISOString(), NOW)).toBe(true);
  });

  it("lets a lapsed mute through", () => {
    expect(isMuted(new Date(NOW - 1).toISOString(), NOW)).toBe(false);
  });
});
