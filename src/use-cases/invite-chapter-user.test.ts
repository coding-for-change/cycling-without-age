import { accounts } from "@/features/accounts";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { inviteChapterUser } from "@/use-cases/invite-chapter-user";

jest.mock("@/features/accounts", () => ({
  accounts: { provisionUser: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { inviteMember: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn(), setLocale: jest.fn() },
}));

const provisionUser = accounts.provisionUser as jest.Mock;
const inviteMember = membership.inviteMember as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const setLocale = profile.setLocale as jest.Mock;

const INVITER = "user-anke";
const INVITED = "user-new";
const CHAPTER = "chapter-muenchen";

const invite = (roles: ("admin" | "pilot")[] = ["pilot"]) =>
  inviteChapterUser({
    inviterUserId: INVITER,
    locale: "de",
    input: {
      chapterId: CHAPTER,
      name: "Pernille Holm",
      email: "p@example.com",
      roles,
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
  provisionUser.mockResolvedValue({ userId: INVITED, created: true });
  getProfile.mockResolvedValue({ email: "p@example.com", locale: null });
});

describe("inviteChapterUser", () => {
  it("provisions the account and hands the invitation to membership", async () => {
    await expect(invite()).resolves.toEqual({ created: true });

    expect(provisionUser).toHaveBeenCalledWith({
      name: "Pernille Holm",
      contact: "p@example.com",
      createdByUserId: INVITER,
    });
    expect(inviteMember).toHaveBeenCalledWith({
      userId: INVITED,
      chapterId: CHAPTER,
      actorUserId: INVITER,
      roles: ["pilot"],
    });
  });

  // A brand-new account has no language of its own, so the mail the invitation
  // triggers would otherwise go out in the default one.
  it("seeds the inviter's language into a new account without asking", async () => {
    await invite();

    expect(setLocale).toHaveBeenCalledWith(INVITED, "de");
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("seeds it into an existing account that never chose one", async () => {
    provisionUser.mockResolvedValue({ userId: "user-old", created: false });

    await expect(invite(["admin"])).resolves.toEqual({ created: false });

    expect(setLocale).toHaveBeenCalledWith("user-old", "de");
    expect(inviteMember).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-old", roles: ["admin"] }),
    );
  });

  // Their own choice outranks whatever language the inviter happens to browse in.
  it("leaves an existing language alone", async () => {
    provisionUser.mockResolvedValue({ userId: "user-old", created: false });
    getProfile.mockResolvedValue({ email: "p@example.com", locale: "en" });

    await invite();

    expect(setLocale).not.toHaveBeenCalled();
    expect(inviteMember).toHaveBeenCalled();
  });

  it("passes both roles through in one invitation", async () => {
    await invite(["pilot", "admin"]);

    expect(inviteMember).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ["pilot", "admin"] }),
    );
  });
});
