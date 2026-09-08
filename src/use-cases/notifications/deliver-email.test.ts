import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { sendMail } from "@/lib/mailer";
import { deliverEmail } from "@/use-cases/notifications/deliver-email";

jest.mock("@/features/notifications", () => ({
  notifications: {
    get: jest.fn(),
    beginDelivery: jest.fn(),
    deliverySent: jest.fn(),
    deliveryFailed: jest.fn(),
    deliverySkipped: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/lib/mailer", () => ({ sendMail: jest.fn() }));

const get = notifications.get as jest.Mock;
const beginDelivery = notifications.beginDelivery as jest.Mock;
const sent = notifications.deliverySent as jest.Mock;
const failed = notifications.deliveryFailed as jest.Mock;
const skipped = notifications.deliverySkipped as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const record = activity.record as jest.Mock;
const mail = sendMail as jest.Mock;

const APPLICANT = "user-pernille";
const ACTOR = "user-anke";
const CHAPTER = "chapter-muenchen";

const notification = (approved = true, note: string | null = null) => ({
  id: "notif-1",
  recipientUserId: APPLICANT,
  category: "application",
  href: "/pilot",
  payload: { chapterName: "München", approved, note },
  event: {
    type: "pilotApplication.decided",
    actorUserId: ACTOR,
    chapterId: CHAPTER,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(notification());
  beginDelivery.mockResolvedValue({ id: "delivery-1" });
  getProfile.mockResolvedValue({ email: "pernille@example.com", locale: "de" });
});

describe("deliverEmail", () => {
  // The decision is written by an admin whose own language is irrelevant to the
  // person reading the mail.
  it("writes in the recipient's language, not the decider's", async () => {
    await deliverEmail("notif-1");

    expect(mail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "pernille@example.com",
        subject: "Du bist Pilot bei München",
      }),
    );
    expect(sent).toHaveBeenCalledWith("delivery-1", null);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: APPLICANT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "emailSent",
        payload: { template: "approval" },
      }),
    );
  });

  it("carries the decider's note into the mail", async () => {
    get.mockResolvedValue(notification(true, "Bring your own helmet."));

    await deliverEmail("notif-1");

    expect(mail.mock.calls[0][0].react.props.message.note).toEqual({
      heading: "Von deiner Ortsgruppe",
      text: "Bring your own helmet.",
    });
    expect(mail.mock.calls[0][0].text).toContain("Bring your own helmet.");
  });

  it("uses the rejection copy when the answer is no", async () => {
    get.mockResolvedValue(notification(false));
    getProfile.mockResolvedValue({ email: "p@example.com", locale: "en" });

    await deliverEmail("notif-1");

    expect(mail.mock.calls[0][0].subject).toBe(
      "About your pilot request at München",
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { template: "rejection" } }),
    );
  });

  it("skips an account with no email address", async () => {
    getProfile.mockResolvedValue({ email: null, locale: "en" });

    await deliverEmail("notif-1");

    expect(mail).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "no email address");
    expect(record).not.toHaveBeenCalled();
  });

  // Swallowing this would mark the job complete and lose the mail for good.
  it("records the failure and rethrows so the job retries", async () => {
    mail.mockRejectedValue(new Error("Resend down"));

    await expect(deliverEmail("notif-1")).rejects.toThrow("Resend down");

    expect(failed).toHaveBeenCalledWith(
      "delivery-1",
      expect.stringContaining("Resend down"),
    );
    expect(sent).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("sends nothing when this channel already went out", async () => {
    beginDelivery.mockResolvedValue(null);

    await deliverEmail("notif-1");

    expect(mail).not.toHaveBeenCalled();
  });
});
