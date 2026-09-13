import { authClient } from "@/lib/auth-client";
import {
  createNativePasskey,
  getNativePasskey,
  isNative,
} from "@/lib/native/passkey";
import { addPasskey, signInWithPasskey } from "@/lib/passkey-client";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    $fetch: jest.fn(),
    $store: { notify: jest.fn() },
    passkey: { addPasskey: jest.fn() },
    signIn: { passkey: jest.fn() },
  },
}));
jest.mock("@/lib/native/passkey", () => ({
  isNative: jest.fn(),
  createNativePasskey: jest.fn(),
  getNativePasskey: jest.fn(),
}));

const fetchMock = authClient.$fetch as unknown as jest.Mock;
const native = isNative as jest.Mock;
const create = createNativePasskey as jest.Mock;
const get = getNativePasskey as jest.Mock;

const credential = {
  id: "cred",
  rawId: "cred",
  type: "public-key",
  clientExtensionResults: {},
  response: { clientDataJSON: "client", attestationObject: "attestation" },
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis, "window", {
    value: { location: { origin: "https://cwa.test" } },
    configurable: true,
    writable: true,
  });
});

describe("addPasskey", () => {
  it("leaves the browser to better-auth's own client", async () => {
    native.mockReturnValue(false);
    (authClient.passkey.addPasskey as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    expect(await addPasskey({ name: "Laptop" })).toEqual({ error: null });
    expect(authClient.passkey.addPasskey).toHaveBeenCalledWith({
      name: "Laptop",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runs the ceremony natively and posts the credential back", async () => {
    native.mockReturnValue(true);
    fetchMock
      .mockResolvedValueOnce({ data: { challenge: "c" }, error: null })
      .mockResolvedValueOnce({ data: { id: "row" }, error: null });
    create.mockResolvedValue(credential);

    expect(await addPasskey({ name: "Phone" })).toEqual({ error: null });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/passkey/generate-register-options",
      expect.objectContaining({ method: "GET", query: { name: "Phone" } }),
    );
    expect(create).toHaveBeenCalledWith({ challenge: "c" }, "https://cwa.test");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/passkey/verify-registration",
      expect.objectContaining({
        method: "POST",
        body: {
          response: {
            id: "cred",
            rawId: "cred",
            type: "public-key",
            response: credential.response,
          },
          name: "Phone",
        },
      }),
    );
    expect(authClient.$store.notify).toHaveBeenCalledWith("$listPasskeys");
  });

  it("surfaces the server's code when verification is refused", async () => {
    native.mockReturnValue(true);
    fetchMock
      .mockResolvedValueOnce({ data: { challenge: "c" }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "SESSION_NOT_FRESH", message: "stale" },
      });
    create.mockResolvedValue(credential);

    expect(await addPasskey({})).toEqual({
      error: { code: "SESSION_NOT_FRESH", message: "stale" },
    });
    expect(authClient.$store.notify).not.toHaveBeenCalled();
  });

  it("reports a dismissed sheet without a second server call", async () => {
    native.mockReturnValue(true);
    fetchMock.mockResolvedValueOnce({ data: { challenge: "c" }, error: null });
    create.mockRejectedValue(
      Object.assign(new Error("cancelled"), { code: "NotAllowedError" }),
    );

    expect(await addPasskey({})).toEqual({
      error: { code: "NotAllowedError", message: "cancelled" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("signInWithPasskey", () => {
  it("authenticates natively and wakes the session store", async () => {
    native.mockReturnValue(true);
    fetchMock
      .mockResolvedValueOnce({
        data: { challenge: "c", rpId: "cwa.test" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { session: {} }, error: null });
    get.mockResolvedValue({ ...credential, response: { signature: "sig" } });

    expect(await signInWithPasskey()).toEqual({ error: null });
    expect(get).toHaveBeenCalledWith(
      { challenge: "c", rpId: "cwa.test" },
      "https://cwa.test",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/passkey/verify-authentication",
      expect.objectContaining({
        method: "POST",
        body: {
          response: {
            id: "cred",
            rawId: "cred",
            type: "public-key",
            response: { signature: "sig" },
          },
        },
      }),
    );
    expect(authClient.$store.notify).toHaveBeenCalledWith("$sessionSignal");
  });

  it("leaves the browser to better-auth's own client", async () => {
    native.mockReturnValue(false);
    (authClient.signIn.passkey as jest.Mock).mockResolvedValue({
      data: null,
      error: { code: "AUTH_CANCELLED", message: "cancelled" },
    });

    expect(await signInWithPasskey()).toEqual({
      error: { code: "AUTH_CANCELLED", message: "cancelled" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
