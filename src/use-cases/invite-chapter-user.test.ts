import { accounts } from "@/features/accounts";
import { activity } from "@/lib/activity";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { sendMail } from "@/lib/mailer";
import { inviteChapterUser } from "@/use-cases/invite-chapter-user";

jest.mock("@/features/accounts", () => ({
  accounts: { provisionUser: jest.fn() },
}));
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { grantChapterRoles: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/mailer", () => ({ sendMail: jest.fn() }));

const provisionUser = accounts.provisionUser as jest.Mock;
const record = activity.record as jest.Mock;
const getChapter = chapters.getChapter as jest.Mock;
const grantChapterRoles = membership.grantChapterRoles as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const mail = sendMail as jest.Mock;

const INVITER = "user-anke";
const INVITED = "user-new";
const CHAPTER = "chapter-muenchen";

const invite = (roles: ("admin" | "pilot")[] = ["pilot"]) =>
  inviteChapterUser({
    inviterUserId: INVITER,
    inviterName: "Anke",
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
  jest.spyOn(console, "error").mockImplementation(() => {});
  provisionUser.mockResolvedValue({ userId: INVITED, created: true });
  getChapter.mockResolvedValue({ name: "München" });
  getProfile.mockResolvedValue({ email: "p@example.com", locale: null });
});

afterEach(() => jest.restoreAllMocks());

describe("inviteChapterUser", () => {
  it("provisions, grants the roles, mails and records the invitation", async () => {
    await expect(invite()).resolves.toEqual({ created: true });

    expect(provisionUser).toHaveBeenCalledWith({
      name: "Pernille Holm",
      contact: "p@example.com",
      createdByUserId: INVITER,
    });
    expect(grantChapterRoles).toHaveBeenCalledWith(INVITED, CHAPTER, ["pilot"]);
    expect(mail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "p@example.com" }),
    );
    expect(record).toHaveBeenCalledWith({
      userId: INVITED,
      actorUserId: INVITER,
      chapterId: CHAPTER,
      type: "invited",
      payload: { roles: "pilot" },
    });
  });

  it("still grants the roles and mails when the address already has an account", async () => {
    provisionUser.mockResolvedValue({ userId: "user-old", created: false });

    await expect(invite(["admin"])).resolves.toEqual({ created: false });

    expect(grantChapterRoles).toHaveBeenCalledWith("user-old", CHAPTER, [
      "admin",
    ]);
    expect(mail).toHaveBeenCalledTimes(1);
    expect(mail.mock.calls[0][0].react.props.href).toContain("next=%2Fadmin");
  });

  // Both roles at once: the mail names them in one sentence and lands the
  // invitee on the admin side, the more capable of the two.
  it("grants both roles, names both in the mail and points at /admin", async () => {
    await invite(["pilot", "admin"]);

    expect(grantChapterRoles).toHaveBeenCalledWith(INVITED, CHAPTER, [
      "pilot",
      "admin",
    ]);
    expect(mail.mock.calls[0][0].react.props.roleLabel).toBe(
      "Pilot und Ortsgruppen-Admin",
    );
    expect(mail.mock.calls[0][0].react.props.href).toContain("next=%2Fadmin");
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { roles: "pilot,admin" } }),
    );
  });

  it("writes in the invitee's language when the account already has one", async () => {
    getProfile.mockResolvedValue({ email: "p@example.com", locale: "en" });

    await invite();

    expect(mail.mock.calls[0][0].subject).toBe(
      "You've been invited to München",
    );
  });

  it("survives a mail failure, keeping the roles and the event", async () => {
    mail.mockRejectedValue(new Error("Resend down"));

    await expect(invite()).resolves.toEqual({ created: true });

    expect(grantChapterRoles).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "invited" }),
    );
  });
});
