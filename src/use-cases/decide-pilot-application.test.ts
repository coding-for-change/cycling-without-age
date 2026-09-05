import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import { sendMail } from "@/lib/mailer";
import { decidePilotApplication } from "@/use-cases/decide-pilot-application";

jest.mock("@/features/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { decideApplication: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/mailer", () => ({ sendMail: jest.fn() }));

const record = activity.record as jest.Mock;
const getChapter = chapters.getChapter as jest.Mock;
const decideApplication = membership.decideApplication as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const mail = sendMail as jest.Mock;

const APPLICANT = "user-pernille";
const ACTOR = "user-anke";
const CHAPTER = "chapter-muenchen";

const decided = (note: string | null = null) => ({
  id: "app-1",
  userId: APPLICANT,
  chapterId: CHAPTER,
  role: "pilot",
  status: "approved",
  decisionNote: note,
});

const eventTypes = () =>
  record.mock.calls.map((call: [{ type: string }]) => call[0].type);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  decideApplication.mockResolvedValue(decided());
  getChapter.mockResolvedValue({ name: "München" });
  getProfile.mockResolvedValue({
    email: "pernille@example.com",
    locale: "de",
  });
});

afterEach(() => jest.restoreAllMocks());

describe("decidePilotApplication", () => {
  it("records the approval, then the email that announced it", async () => {
    await decidePilotApplication({
      applicationId: "app-1",
      actorUserId: ACTOR,
      approve: true,
    });

    expect(decideApplication).toHaveBeenCalledWith({
      applicationId: "app-1",
      decidedByUserId: ACTOR,
      approve: true,
      note: undefined,
    });
    expect(eventTypes()).toEqual(["applicationApproved", "emailSent"]);
    expect(record).toHaveBeenNthCalledWith(1, {
      userId: APPLICANT,
      actorUserId: ACTOR,
      chapterId: CHAPTER,
      type: "applicationApproved",
    });
    expect(record).toHaveBeenNthCalledWith(2, {
      userId: APPLICANT,
      actorUserId: ACTOR,
      chapterId: CHAPTER,
      type: "emailSent",
      payload: { template: "approval" },
    });
  });

  it("writes the note onto the event and into the mail", async () => {
    decideApplication.mockResolvedValue(decided("Bring your own helmet."));

    await decidePilotApplication({
      applicationId: "app-1",
      actorUserId: ACTOR,
      approve: true,
      note: "Bring your own helmet.",
    });

    expect(record).toHaveBeenNthCalledWith(1, {
      userId: APPLICANT,
      actorUserId: ACTOR,
      chapterId: CHAPTER,
      type: "applicationApproved",
      payload: { note: "Bring your own helmet." },
    });
    expect(mail.mock.calls[0][0].react.props.note).toBe(
      "Bring your own helmet.",
    );
    expect(mail.mock.calls[0][0].text).toContain("Bring your own helmet.");
  });

  // The decision is written by an admin whose own language is irrelevant to the
  // person reading the mail.
  it("writes in the recipient's language, not the decider's", async () => {
    await decidePilotApplication({
      applicationId: "app-1",
      actorUserId: ACTOR,
      approve: true,
    });

    expect(mail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "pernille@example.com",
        subject: "Du bist Pilot bei München",
      }),
    );
  });

  it("uses the rejection copy when the answer is no", async () => {
    getProfile.mockResolvedValue({ email: "p@example.com", locale: "en" });

    await decidePilotApplication({
      applicationId: "app-1",
      actorUserId: ACTOR,
      approve: false,
    });

    expect(eventTypes()).toEqual(["applicationRejected", "emailSent"]);
    expect(mail.mock.calls[0][0].subject).toBe(
      "About your pilot request at München",
    );
    expect(record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ payload: { template: "rejection" } }),
    );
  });

  // The decision is already committed by then: a dead mail server must not undo
  // it, and must not leave a "we told them" event behind either.
  it("survives a mail failure without claiming the mail went out", async () => {
    mail.mockRejectedValue(new Error("Resend down"));

    await expect(
      decidePilotApplication({
        applicationId: "app-1",
        actorUserId: ACTOR,
        approve: true,
      }),
    ).resolves.toMatchObject({ userId: APPLICANT });

    expect(eventTypes()).toEqual(["applicationApproved"]);
  });

  it("skips the mail for an account with no email address", async () => {
    getProfile.mockResolvedValue({ email: null, locale: "en" });

    await decidePilotApplication({
      applicationId: "app-1",
      actorUserId: ACTOR,
      approve: true,
    });

    expect(mail).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual(["applicationApproved"]);
  });
});
