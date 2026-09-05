import { accounts } from "@/features/accounts";
import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { sendMail } from "@/lib/mailer";
import { inviteChapterUser } from "@/use-cases/invite-chapter-user";

jest.mock("@/features/accounts", () => ({
  accounts: { provisionUser: jest.fn() },
}));
jest.mock("@/features/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { grantChapterRole: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/mailer", () => ({ sendMail: jest.fn() }));

const provisionUser = accounts.provisionUser as jest.Mock;
const record = activity.record as jest.Mock;
const getChapter = chapters.getChapter as jest.Mock;
const grantChapterRole = membership.grantChapterRole as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const mail = sendMail as jest.Mock;

const INVITER = "user-anke";
const INVITED = "user-new";
const CHAPTER = "chapter-muenchen";

const invite = (role: "admin" | "pilot" = "pilot") =>
  inviteChapterUser({
    inviterUserId: INVITER,
    inviterName: "Anke",
    locale: "de",
    input: {
      chapterId: CHAPTER,
      name: "Pernille Holm",
      email: "p@example.com",
      role,
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
  it("provisions, grants the role, mails and records the invitation", async () => {
    await expect(invite()).resolves.toEqual({ created: true });

    expect(provisionUser).toHaveBeenCalledWith({
      name: "Pernille Holm",
      contact: "p@example.com",
      createdByUserId: INVITER,
    });
    expect(grantChapterRole).toHaveBeenCalledWith(INVITED, CHAPTER, "pilot");
    expect(mail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "p@example.com" }),
    );
    expect(record).toHaveBeenCalledWith({
      userId: INVITED,
      actorUserId: INVITER,
      chapterId: CHAPTER,
      type: "invited",
      payload: { role: "pilot" },
    });
  });

  it("still grants the role and mails when the address already has an account", async () => {
    provisionUser.mockResolvedValue({ userId: "user-old", created: false });

    await expect(invite("admin")).resolves.toEqual({ created: false });

    expect(grantChapterRole).toHaveBeenCalledWith("user-old", CHAPTER, "admin");
    expect(mail).toHaveBeenCalledTimes(1);
    expect(mail.mock.calls[0][0].react.props.href).toContain("next=%2Fadmin");
  });

  it("writes in the invitee's language when the account already has one", async () => {
    getProfile.mockResolvedValue({ email: "p@example.com", locale: "en" });

    await invite();

    expect(mail.mock.calls[0][0].subject).toBe(
      "You've been invited to München",
    );
  });

  it("survives a mail failure, keeping the role and the event", async () => {
    mail.mockRejectedValue(new Error("Resend down"));

    await expect(invite()).resolves.toEqual({ created: true });

    expect(grantChapterRole).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "invited" }),
    );
  });
});
