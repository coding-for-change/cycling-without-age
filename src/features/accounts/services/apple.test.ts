import { generateKeyPairSync } from "node:crypto";
import { exchangeAppleCode, revokeAppleToken } from "./apple";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const credentials = {
  servicesId: "com.codingforchange.cwa.web",
  teamId: "8TPMU6R9FN",
  keyId: "KEY123",
  privateKey: generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey,
};

const fetchMock = jest.fn();
global.fetch = fetchMock;

const idTokenFor = (sub: string) =>
  `header.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.signature`;

const respond = (status: number, body: object = {}) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

const sent = () => {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, init, form: new URLSearchParams(init.body) };
};

beforeEach(() => fetchMock.mockReset());

describe("exchanging an authorization code from the iOS app", () => {
  it("asks Apple as the app and reads whose Apple ID it is", async () => {
    respond(200, {
      refresh_token: "refresh-1",
      id_token: idTokenFor("apple-sub-1"),
    });

    await expect(
      exchangeAppleCode(credentials, "com.codingforchange.cwa", "code-1"),
    ).resolves.toEqual({ refreshToken: "refresh-1", subject: "apple-sub-1" });

    const { url, init, form } = sent();
    expect(url).toBe("https://appleid.apple.com/auth/token");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(form.get("client_id")).toBe("com.codingforchange.cwa");
    expect(form.get("grant_type")).toBe("authorization_code");
    expect(form.get("code")).toBe("code-1");
    expect(form.get("client_secret")).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(form.has("redirect_uri")).toBe(false);
  });

  it("fails on an error from Apple without echoing the response", async () => {
    respond(400, { error: "invalid_grant" });

    await expect(
      exchangeAppleCode(credentials, "com.codingforchange.cwa", "code-1"),
    ).rejects.toThrow("Apple token exchange failed with 400");
  });

  it("fails when Apple sends no refresh token", async () => {
    respond(200, { id_token: idTokenFor("apple-sub-1") });

    await expect(
      exchangeAppleCode(credentials, "com.codingforchange.cwa", "code-1"),
    ).rejects.toThrow("no refresh or id token");
  });
});

describe("revoking a refresh token", () => {
  it("hands the token back to Apple for the given client", async () => {
    respond(200);

    await revokeAppleToken(credentials, "com.codingforchange.cwa.web", "r-1");

    const { url, form } = sent();
    expect(url).toBe("https://appleid.apple.com/auth/revoke");
    expect(form.get("client_id")).toBe("com.codingforchange.cwa.web");
    expect(form.get("token")).toBe("r-1");
    expect(form.get("token_type_hint")).toBe("refresh_token");
  });

  it("fails when Apple refuses", async () => {
    respond(400);

    await expect(
      revokeAppleToken(credentials, "com.codingforchange.cwa.web", "r-1"),
    ).rejects.toThrow("Apple token revocation failed with 400");
  });
});
