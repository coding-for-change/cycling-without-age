import { isHandheldRequest, NATIVE_UA } from "@/lib/device";

const request = (init: Record<string, string>) => new Headers(init);

describe("isHandheldRequest", () => {
  it("treats the native shell as handheld", () => {
    expect(
      isHandheldRequest(
        request({ "user-agent": `Mozilla/5.0 (Macintosh) ${NATIVE_UA}` }),
      ),
    ).toBe(true);
  });

  it("trusts the mobile client hint", () => {
    expect(isHandheldRequest(request({ "sec-ch-ua-mobile": "?1" }))).toBe(true);
  });

  it("recognises phone browsers", () => {
    expect(
      isHandheldRequest(
        request({
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
        }),
      ),
    ).toBe(true);
    expect(
      isHandheldRequest(
        request({
          "user-agent":
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36",
        }),
      ),
    ).toBe(true);
  });

  it("leaves tablets and desktops admin-first", () => {
    expect(
      isHandheldRequest(
        request({
          "user-agent":
            "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
          "sec-ch-ua-mobile": "?0",
        }),
      ),
    ).toBe(false);
    expect(
      isHandheldRequest(
        request({
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
        }),
      ),
    ).toBe(false);
  });

  it("is false without headers", () => {
    expect(isHandheldRequest(new Headers())).toBe(false);
  });
});
