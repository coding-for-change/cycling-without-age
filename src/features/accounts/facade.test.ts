import { accounts } from "@/features/accounts";
import {
  createAuthUser,
  findProvenance,
  findUserByEmail,
  findUserByPhone,
  setProvenance,
} from "@/features/accounts/services/users";
import {
  exchangeAppleCode,
  findAppleAccounts,
  revokeAppleToken,
  saveAppleRefreshToken,
} from "@/features/accounts/services/apple";
import { domainCode } from "@/lib/domain-error";

jest.mock("@/features/accounts/services/users", () => ({
  findUserByEmail: jest.fn(),
  findUserByPhone: jest.fn(),
  createAuthUser: jest.fn(),
  setProvenance: jest.fn(),
  findProvenance: jest.fn(),
  markClaimed: jest.fn(),
}));
jest.mock("@/features/accounts/services/apple", () => ({
  exchangeAppleCode: jest.fn(),
  findAppleAccounts: jest.fn(),
  revokeAppleToken: jest.fn(),
  saveAppleRefreshToken: jest.fn(),
}));
let mockAppleCredentials: object | null;
jest.mock("@/lib/apple", () => ({
  get appleCredentials() {
    return mockAppleCredentials;
  },
  appleClientIds: () => [
    "com.codingforchange.cwa.web",
    "com.codingforchange.cwa",
  ],
}));

const byEmail = findUserByEmail as jest.Mock;
const byPhone = findUserByPhone as jest.Mock;
const create = createAuthUser as jest.Mock;
const provenance = setProvenance as jest.Mock;
const readProvenance = findProvenance as jest.Mock;

const input = {
  name: "Ida Ibsen",
  contact: "Ida@Example.com",
  createdByUserId: "admin-1",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAppleCredentials = { servicesId: "com.codingforchange.cwa.web" };
  byEmail.mockResolvedValue(null);
  byPhone.mockResolvedValue(null);
  create.mockResolvedValue("user-new");
});

describe("provisioning an account", () => {
  it("hands back the existing account instead of a second one", async () => {
    byEmail.mockResolvedValue({ id: "user-old" });
    await expect(accounts.provisionUser(input)).resolves.toEqual({
      userId: "user-old",
      created: false,
    });
    expect(create).not.toHaveBeenCalled();
    expect(provenance).not.toHaveBeenCalled();
  });

  it("refuses the strict variant when the contact is taken", async () => {
    byEmail.mockResolvedValue({ id: "user-old" });
    await expect(accounts.provisionUserStrict(input)).rejects.toThrow(
      "alreadyHasAccount",
    );
  });

  it("looks the email up lowercased and records who created the account", async () => {
    await expect(accounts.provisionUser(input)).resolves.toEqual({
      userId: "user-new",
      created: true,
    });
    expect(byEmail).toHaveBeenCalledWith("ida@example.com");
    expect(create).toHaveBeenCalledWith({
      email: "ida@example.com",
      name: "Ida Ibsen",
    });
    expect(provenance).toHaveBeenCalledWith("user-new", {
      createdByUserId: "admin-1",
    });
  });

  it("gives a phone-only account a temp email and stores the helper", async () => {
    await accounts.provisionUser({
      ...input,
      contact: "+4915112345678",
      helper: {
        name: "Hilde Helper",
        relationship: "daughter",
        contact: "hilde@example.com",
      },
    });
    expect(byPhone).toHaveBeenCalledWith("+4915112345678");
    expect(create).toHaveBeenCalledWith({
      email: "4915112345678@phone.cwa.local",
      name: "Ida Ibsen",
      phoneNumber: "+4915112345678",
    });
    expect(provenance).toHaveBeenCalledWith("user-new", {
      createdByUserId: "admin-1",
      helperName: "Hilde Helper",
      helperRelationship: "daughter",
      helperContact: "hilde@example.com",
    });
  });
});

describe("the claim banner", () => {
  it("names the creator while the account is unclaimed", async () => {
    readProvenance.mockResolvedValue({
      claimedAt: null,
      createdBy: { name: "Anke Admin" },
    });
    await expect(accounts.getClaimBanner("user-1")).resolves.toBe("Anke Admin");
  });

  it("says nothing once the account has been claimed", async () => {
    readProvenance.mockResolvedValue({
      claimedAt: new Date(),
      createdBy: { name: "Anke Admin" },
    });
    await expect(accounts.getClaimBanner("user-1")).resolves.toBeNull();
  });

  it("says nothing for an account nobody created", async () => {
    readProvenance.mockResolvedValue({ claimedAt: null, createdBy: null });
    await expect(accounts.getClaimBanner("user-1")).resolves.toBeNull();
  });
});

const appleAccount = (accountId: string, refreshToken: string | null) => ({
  id: `account-of-${accountId}`,
  accountId,
  refreshToken,
});

describe("keeping the refresh token of a native Apple sign-in", () => {
  beforeEach(() => {
    (findAppleAccounts as jest.Mock).mockResolvedValue([
      appleAccount("apple-sub-1", null),
    ]);
    (exchangeAppleCode as jest.Mock).mockResolvedValue({
      refreshToken: "refresh-1",
      subject: "apple-sub-1",
    });
  });

  it("exchanges the code as the iOS app and stores the refresh token", async () => {
    await accounts.keepNativeAppleRefreshToken("user-1", "code-1");

    expect(exchangeAppleCode).toHaveBeenCalledWith(
      expect.anything(),
      "com.codingforchange.cwa",
      "code-1",
    );
    expect(saveAppleRefreshToken).toHaveBeenCalledWith(
      "account-of-apple-sub-1",
      "refresh-1",
    );
  });

  it("stores it on the Apple ID the code belongs to", async () => {
    (findAppleAccounts as jest.Mock).mockResolvedValue([
      appleAccount("apple-sub-0", "refresh-0"),
      appleAccount("apple-sub-1", null),
    ]);

    await accounts.keepNativeAppleRefreshToken("user-1", "code-1");

    expect(saveAppleRefreshToken).toHaveBeenCalledWith(
      "account-of-apple-sub-1",
      "refresh-1",
    );
  });

  it("refuses a code that belongs to another Apple ID", async () => {
    (exchangeAppleCode as jest.Mock).mockResolvedValue({
      refreshToken: "refresh-2",
      subject: "someone-else",
    });

    const run = accounts.keepNativeAppleRefreshToken("user-1", "code-2");

    expect(await run.catch(domainCode)).toBe("notOwnAccount");
    expect(saveAppleRefreshToken).not.toHaveBeenCalled();
  });

  it("refuses when the user never signed in with Apple", async () => {
    (findAppleAccounts as jest.Mock).mockResolvedValue([]);

    const run = accounts.keepNativeAppleRefreshToken("user-1", "code-1");

    expect(await run.catch(domainCode)).toBe("notFound");
    expect(exchangeAppleCode).not.toHaveBeenCalled();
  });

  it("refuses while Apple is not configured", async () => {
    mockAppleCredentials = null;

    const run = accounts.keepNativeAppleRefreshToken("user-1", "code-1");

    expect(await run.catch(domainCode)).toBe("notFound");
    expect(exchangeAppleCode).not.toHaveBeenCalled();
  });
});

describe("revoking Apple sign-in", () => {
  beforeEach(() => {
    (findAppleAccounts as jest.Mock).mockResolvedValue([
      appleAccount("apple-sub-1", "refresh-1"),
    ]);
  });

  it("asks Apple as the website and as the app, since either may own the token", async () => {
    await accounts.revokeAppleSignIn("user-1");

    expect(revokeAppleToken).toHaveBeenCalledWith(
      expect.anything(),
      "com.codingforchange.cwa.web",
      "refresh-1",
    );
    expect(revokeAppleToken).toHaveBeenCalledWith(
      expect.anything(),
      "com.codingforchange.cwa",
      "refresh-1",
    );
  });

  it("revokes every Apple ID linked to the account", async () => {
    (findAppleAccounts as jest.Mock).mockResolvedValue([
      appleAccount("apple-sub-1", "refresh-1"),
      appleAccount("apple-sub-2", "refresh-2"),
      appleAccount("apple-sub-3", null),
    ]);

    await accounts.revokeAppleSignIn("user-1");

    const revoked = (revokeAppleToken as jest.Mock).mock.calls.map(
      ([, , token]) => token,
    );
    expect(new Set(revoked)).toEqual(new Set(["refresh-1", "refresh-2"]));
  });

  it("is satisfied when one of the two is accepted", async () => {
    (revokeAppleToken as jest.Mock)
      .mockRejectedValueOnce(new Error("400"))
      .mockResolvedValueOnce(undefined);

    await expect(accounts.revokeAppleSignIn("user-1")).resolves.toBeUndefined();
  });

  it("fails when Apple accepts neither", async () => {
    (revokeAppleToken as jest.Mock).mockRejectedValue(new Error("503"));

    await expect(accounts.revokeAppleSignIn("user-1")).rejects.toThrow("503");
  });

  it("does nothing for an account that never signed in with Apple", async () => {
    (findAppleAccounts as jest.Mock).mockResolvedValue([]);

    await accounts.revokeAppleSignIn("user-1");

    expect(revokeAppleToken).not.toHaveBeenCalled();
  });

  it("does nothing while Apple is not configured", async () => {
    mockAppleCredentials = null;

    await accounts.revokeAppleSignIn("user-1");

    expect(findAppleAccounts).not.toHaveBeenCalled();
    expect(revokeAppleToken).not.toHaveBeenCalled();
  });
});
