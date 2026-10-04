import { isNativeIosUserAgent } from "./user-agent";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

describe("isNativeIosUserAgent", () => {
  it("recognises the iOS shell on iPhone and iPad", () => {
    expect(isNativeIosUserAgent(`${IPHONE} CWA-Native`)).toBe(true);
    expect(isNativeIosUserAgent(`${IPAD} CWA-Native`)).toBe(true);
  });

  it("leaves the Android shell on the web tab bar", () => {
    expect(isNativeIosUserAgent(`${ANDROID} CWA-Native`)).toBe(false);
  });

  it("leaves mobile Safari and desktop browsers alone", () => {
    expect(isNativeIosUserAgent(IPHONE)).toBe(false);
    expect(isNativeIosUserAgent(IPAD)).toBe(false);
    expect(isNativeIosUserAgent(DESKTOP)).toBe(false);
    expect(isNativeIosUserAgent(`${DESKTOP} CWA-Native`)).toBe(false);
  });

  it("answers false without a user agent", () => {
    expect(isNativeIosUserAgent(null)).toBe(false);
    expect(isNativeIosUserAgent("")).toBe(false);
  });
});
