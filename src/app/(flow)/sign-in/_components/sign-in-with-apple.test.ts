import { createHash } from "node:crypto";
import { keepNativeAppleRefreshTokenAction } from "@/features/accounts/actions";
import { authClient } from "@/lib/auth-client";
import { authorizeWithApple } from "@/lib/native/apple-sign-in";
import { signInWithApple } from "./sign-in-with-apple";

jest.mock("@/features/accounts/actions", () => ({
  keepNativeAppleRefreshTokenAction: jest.fn(),
}));
jest.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { social: jest.fn() } },
}));
jest.mock("@/lib/native/apple-sign-in", () => ({
  authorizeWithApple: jest.fn(),
}));

const social = authClient.signIn.social as jest.Mock;
const authorize = authorizeWithApple as jest.Mock;
const keepToken = keepNativeAppleRefreshTokenAction as jest.Mock;

const authorization = {
  identityToken: "identity-token",
  authorizationCode: "code-1",
  givenName: "",
  familyName: "",
};

beforeEach(() => {
  jest.clearAllMocks();
  social.mockResolvedValue({ error: null });
  keepToken.mockResolvedValue({ ok: true });
  authorize.mockResolvedValue(authorization);
});

describe("signing in with Apple in the iOS app", () => {
  it("gives Apple the SHA-256 of the nonce and better-auth the raw nonce", async () => {
    await expect(signInWithApple()).resolves.toBe("signedIn");

    const [hashed] = authorize.mock.calls[0];
    const { idToken } = social.mock.calls[0][0];
    expect(idToken.token).toBe("identity-token");
    expect(hashed).toBe(
      createHash("sha256").update(idToken.nonce).digest("hex"),
    );
    expect(keepToken).toHaveBeenCalledWith("code-1");
  });

  it("passes on the name Apple shares the first time only", async () => {
    authorize.mockResolvedValue({
      ...authorization,
      givenName: "Anna",
      familyName: "Berg",
    });

    await signInWithApple();

    expect(social.mock.calls[0][0].idToken.user).toEqual({
      name: { firstName: "Anna", lastName: "Berg" },
    });
  });

  it("uses a new nonce every time", async () => {
    await signInWithApple();
    await signInWithApple();

    const [first, second] = social.mock.calls.map(
      ([{ idToken }]) => idToken.nonce,
    );
    expect(first).not.toBe(second);
  });

  it("is canceled quietly when the sheet is dismissed", async () => {
    authorize.mockRejectedValue({ code: "CANCELED" });

    await expect(signInWithApple()).resolves.toBe("canceled");
    expect(social).not.toHaveBeenCalled();
  });

  it("fails when the sheet fails", async () => {
    authorize.mockRejectedValue({ code: "FAILED" });
    await expect(signInWithApple()).resolves.toBe("failed");
  });

  it("fails when better-auth refuses the identity token", async () => {
    social.mockResolvedValue({ error: { status: 401 } });

    await expect(signInWithApple()).resolves.toBe("failed");
    expect(keepToken).not.toHaveBeenCalled();
  });

  it("stays signed in when keeping the refresh token fails", async () => {
    keepToken.mockRejectedValue(new Error("network"));
    await expect(signInWithApple()).resolves.toBe("signedIn");
  });
});
