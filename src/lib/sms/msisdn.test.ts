import { toMsisdn } from "./msisdn";

describe("toMsisdn", () => {
  it("strips the plus and formatting characters", () => {
    expect(toMsisdn("+49 170 123-4567")).toBe("491701234567");
    expect(toMsisdn("+45 (12) 34.56.78")).toBe("4512345678");
  });

  it("rejects anything that is not E.164", () => {
    expect(() => toMsisdn("12345678")).toThrow();
    expect(() => toMsisdn("+0451234567")).toThrow();
    expect(() => toMsisdn("+45123")).toThrow();
    expect(() => toMsisdn("+45 12 34 56 7a")).toThrow();
  });
});
