import * as Sentry from "@sentry/nextjs";
import { getPushToken } from "./push";

const getToken = jest.fn();

jest.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
}));
jest.mock("@capacitor-firebase/messaging", () => ({
  FirebaseMessaging: { getToken: () => getToken() },
}));
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

const apnsMissing = () =>
  new Error(
    "The operation couldn’t be completed. No APNS token specified before fetching FCM Token",
  );

beforeEach(() => {
  jest.useFakeTimers();
  getToken.mockReset();
  jest.mocked(Sentry.captureException).mockClear();
});

afterEach(() => jest.useRealTimers());

const settle = async <T>(promise: Promise<T>) => {
  await jest.runAllTimersAsync();
  return promise;
};

describe("getPushToken", () => {
  it("waits for iOS to hand over its APNs token, then returns the FCM token", async () => {
    getToken
      .mockRejectedValueOnce(apnsMissing())
      .mockRejectedValueOnce(apnsMissing())
      .mockResolvedValueOnce({ token: "fcm-1" });

    expect(await settle(getPushToken())).toEqual({
      token: "fcm-1",
      platform: "ios",
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("gives up quietly when the APNs token never arrives", async () => {
    getToken.mockRejectedValue(apnsMissing());

    expect(await settle(getPushToken())).toBeNull();
    expect(getToken).toHaveBeenCalledTimes(5);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports any other failure at once", async () => {
    getToken.mockRejectedValue(new Error("network down"));

    expect(await settle(getPushToken())).toBeNull();
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
