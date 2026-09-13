import { accounts } from "@/features/accounts";
import {
  createAuthUser,
  findProvenance,
  findUserByEmail,
  findUserByPhone,
  setProvenance,
} from "@/features/accounts/services/users";

jest.mock("@/features/accounts/services/users", () => ({
  findUserByEmail: jest.fn(),
  findUserByPhone: jest.fn(),
  createAuthUser: jest.fn(),
  setProvenance: jest.fn(),
  findProvenance: jest.fn(),
  markClaimed: jest.fn(),
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
