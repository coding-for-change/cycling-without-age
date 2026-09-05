import { z } from "zod";
import {
  DRAFT_MAX_AGE_MS,
  DRAFT_VERSION,
  readDraft,
  signInHref,
} from "@/lib/auth-wall";

const ride = z.object({
  chapterSlug: z.string(),
  when: z.enum(["morning", "afternoon", "any"]),
});

const NOW = 1_760_000_000_000;
const PAYLOAD = { chapterSlug: "muenchen", when: "morning" };

const envelope = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
    v: DRAFT_VERSION,
    kind: "ride",
    payload: PAYLOAD,
    createdAt: NOW,
    ...patch,
  });

describe("readDraft", () => {
  it("returns the payload of a fresh draft of the right kind", () => {
    expect(readDraft(envelope(), "ride", ride, NOW)).toEqual(PAYLOAD);
    expect(
      readDraft(envelope(), "ride", ride, NOW + DRAFT_MAX_AGE_MS - 1),
    ).toEqual(PAYLOAD);
  });

  it("has nothing to give when there is nothing stored", () => {
    expect(readDraft(null, "ride", ride, NOW)).toBeNull();
    expect(readDraft(undefined, "ride", ride, NOW)).toBeNull();
    expect(readDraft("", "ride", ride, NOW)).toBeNull();
  });

  it("refuses another screen's draft", () => {
    expect(
      readDraft(envelope({ kind: "signup" }), "ride", ride, NOW),
    ).toBeNull();
  });

  it("refuses an older shape", () => {
    expect(readDraft(envelope({ v: 0 }), "ride", ride, NOW)).toBeNull();
    expect(readDraft(envelope({ v: "1" }), "ride", ride, NOW)).toBeNull();
  });

  it("refuses a draft older than an hour", () => {
    expect(
      readDraft(envelope(), "ride", ride, NOW + DRAFT_MAX_AGE_MS + 1),
    ).toBeNull();
  });

  it("refuses anything that is not the envelope we wrote", () => {
    expect(readDraft("{not json", "ride", ride, NOW)).toBeNull();
    expect(readDraft('"a string"', "ride", ride, NOW)).toBeNull();
    expect(
      readDraft(envelope({ createdAt: "yesterday" }), "ride", ride, NOW),
    ).toBeNull();
  });

  it("refuses a payload the caller's schema rejects", () => {
    expect(
      readDraft(
        envelope({ payload: { chapterSlug: "muenchen" } }),
        "ride",
        ride,
        NOW,
      ),
    ).toBeNull();
    expect(
      readDraft(
        envelope({ payload: { chapterSlug: "muenchen", when: "midnight" } }),
        "ride",
        ride,
        NOW,
      ),
    ).toBeNull();
  });
});

describe("signInHref", () => {
  it("escapes the destination so a query of its own survives the round trip", () => {
    expect(signInHref("/join/muenchen/ride")).toBe(
      "/sign-in?next=%2Fjoin%2Fmuenchen%2Fride",
    );
    expect(signInHref("/admin/rides?chapter=muenchen")).toBe(
      "/sign-in?next=%2Fadmin%2Frides%3Fchapter%3Dmuenchen",
    );
  });
});
