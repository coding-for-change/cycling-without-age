import {
  defaultCountryFor,
  dialCodeOf,
  looksLikePhone,
  parseIdentity,
} from "@/lib/identity";

describe("looksLikePhone", () => {
  it.each(["+49 162 7120125", "0162 7120125", "  4512345678"])(
    "treats %p as a phone number",
    (input) => expect(looksLikePhone(input)).toBe(true),
  );

  it.each(["you@example.com", "1user@example.com", "jak", ""])(
    "treats %p as an email",
    (input) => expect(looksLikePhone(input)).toBe(false),
  );
});

describe("parseIdentity", () => {
  it("normalises a national number to E.164 using the chosen country", () => {
    const result = parseIdentity("0162 7120125", "DE");
    expect(result).toEqual({
      ok: true,
      identity: { channel: "phone", value: "+491627120125" },
    });
  });

  it("keeps an explicit country prefix over the chosen country", () => {
    const result = parseIdentity("+45 20 12 34 56", "DE");
    expect(result.ok && result.identity.value).toBe("+4520123456");
  });

  it("rejects a number whose prefix does not exist in that country", () => {
    // 12 is not an allocated Danish prefix — a single E.164 regex would pass it.
    expect(parseIdentity("+45 12 34 56 78", "DE")).toEqual({
      ok: false,
      problem: "invalidPhone",
    });
  });

  it("accepts the seeded passenger's number", () => {
    const result = parseIdentity("+4915112345678", "DE");
    expect(result.ok && result.identity.value).toBe("+4915112345678");
  });

  it("rejects a number that is the right shape but the wrong length", () => {
    expect(parseIdentity("+49 1", "DE")).toEqual({
      ok: false,
      problem: "invalidPhone",
    });
  });

  it("lowercases an email", () => {
    const result = parseIdentity("  Ole@CWA.local ", "DE");
    expect(result).toEqual({
      ok: true,
      identity: { channel: "email", value: "ole@cwa.local" },
    });
  });

  it("rejects a malformed email", () => {
    expect(parseIdentity("ole@", "DE")).toEqual({
      ok: false,
      problem: "invalidEmail",
    });
  });

  it("reports an empty box as empty, not as a bad email", () => {
    expect(parseIdentity("   ", "DE")).toEqual({ ok: false, problem: "empty" });
  });
});

describe("country helpers", () => {
  it("derives the opening country from the notation locale's region", () => {
    expect(defaultCountryFor("de-DE")).toBe("DE");
    expect(defaultCountryFor("da-DK")).toBe("DK");
    expect(defaultCountryFor("en-US")).toBe("US");
    expect(defaultCountryFor("en-GB")).toBe("GB");
  });

  it("renders dial codes with a leading plus", () => {
    expect(dialCodeOf("DE")).toBe("+49");
    expect(dialCodeOf("DK")).toBe("+45");
  });
});
