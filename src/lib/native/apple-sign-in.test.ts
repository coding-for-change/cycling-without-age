import { isAppleSignInAvailable } from "./apple-sign-in";

const platform = jest.fn();
const pluginAvailable = jest.fn();

jest.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => platform(),
    isPluginAvailable: () => pluginAvailable(),
  },
  registerPlugin: () => ({}),
}));

describe("isAppleSignInAvailable", () => {
  it("is available in an iOS app that has the plugin", () => {
    platform.mockReturnValue("ios");
    pluginAvailable.mockReturnValue(true);
    expect(isAppleSignInAvailable()).toBe(true);
  });

  it("is unavailable in an iOS build from before the plugin", () => {
    platform.mockReturnValue("ios");
    pluginAvailable.mockReturnValue(false);
    expect(isAppleSignInAvailable()).toBe(false);
  });

  it.each(["web", "android"])("is unavailable on %s", (name) => {
    platform.mockReturnValue(name);
    pluginAvailable.mockReturnValue(true);
    expect(isAppleSignInAvailable()).toBe(false);
  });
});
