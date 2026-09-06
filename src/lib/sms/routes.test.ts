import { sendSms } from "./index";
import { routes } from "./routes";
import type { SmsProvider } from "./types";

describe("provider routing", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.GATEWAYAPI_TOKEN = "test-token";
    for (const key of Object.keys(routes)) delete routes[key];
  });

  const spy = (): jest.Mock & SmsProvider =>
    jest.fn().mockResolvedValue(undefined);

  it("falls back to GatewayAPI for unrouted country codes", async () => {
    await sendSms("+4512345678", "code 123456");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://gatewayapi.com/rest/mtsms");
    expect(init.headers.Authorization).toBe("Token test-token");
    expect(JSON.parse(init.body)).toEqual({
      sender: "CyclingWA",
      message: "code 123456",
      recipients: [{ msisdn: "4512345678" }],
    });
  });

  it("routes to the provider registered for the country code", async () => {
    const twilio = spy();
    routes["1"] = twilio;

    await sendSms("+1 555 123 4567", "code 123456");

    expect(twilio).toHaveBeenCalledWith("15551234567", "code 123456");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers the longest matching country code", async () => {
    const oneDigit = spy();
    const threeDigit = spy();
    routes["3"] = oneDigit;
    routes["354"] = threeDigit;

    await sendSms("+3541234567", "code 123456");

    expect(threeDigit).toHaveBeenCalled();
    expect(oneDigit).not.toHaveBeenCalled();
  });

  it("leaves other country codes on their own route", async () => {
    const twilio = spy();
    routes["1"] = twilio;

    await sendSms("+491701234567", "code 123456");

    expect(twilio).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });
});
