import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { MailRateLimitedError, sendMail } from "@/lib/mailer";
import { deliverEmail } from "@/use-cases/notifications/deliver-email";

jest.mock("@/features/notifications", () => ({
  notifications: {
    get: jest.fn(),
    getDelivery: jest.fn(),
    beginDelivery: jest.fn(),
    deliverySent: jest.fn(),
    deliveryFailed: jest.fn(),
    deliverySkipped: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/lib/mailer", () => ({
  ...jest.requireActual("@/lib/mailer"),
  sendMail: jest.fn(),
}));

const get = notifications.get as jest.Mock;
const beginDelivery = notifications.beginDelivery as jest.Mock;
const sent = notifications.deliverySent as jest.Mock;
const failed = notifications.deliveryFailed as jest.Mock;
const skipped = notifications.deliverySkipped as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getDelivery = notifications.getDelivery as jest.Mock;
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
  readAt: null,
  payload: { chapterName: "München", approved, note },
  event: {
    type: "pilotApplication.decided",
    actorUserId: ACTOR,
    chapterId: CHAPTER,
  },
});

// An admin hearing that someone applied: optional, and the mail only goes out
// when the push did not.
const fallbackNotification = (over: Record<string, unknown> = {}) => ({
  id: "notif-2",
  recipientUserId: ACTOR,
  category: "application",
  href: `/admin/members/${APPLICANT}`,
  readAt: null,
  payload: { applicantName: "Pernille Holm", chapterName: "München" },
  event: {
    type: "pilotApplication.submitted",
    actorUserId: APPLICANT,
    chapterId: CHAPTER,
  },
  ...over,
});

const welcomeNotification = () => ({
  id: "notif-3",
  recipientUserId: APPLICANT,
  category: "welcome",
  href: "/pilot",
  readAt: null,
  payload: { chapterName: "München", role: "pilot" },
  event: {
    type: "user.onboarded",
    actorUserId: null,
    chapterId: CHAPTER,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(notification());
  getDelivery.mockResolvedValue(null);
  beginDelivery.mockResolvedValue({ id: "delivery-1" });
  getProfile.mockResolvedValue({
    email: "pernille@example.com",
    locale: "de",
    notifyEmail: true,
  });
  mail.mockResolvedValue(undefined);
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
    getProfile.mockResolvedValue({
      email: "p@example.com",
      locale: "en",
      notifyEmail: true,
    });

    await deliverEmail("notif-1");

    expect(mail.mock.calls[0][0].subject).toBe(
      "About your pilot request at München",
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { template: "rejection" } }),
    );
  });

  it("skips an account with no email address", async () => {
    getProfile.mockResolvedValue({
      email: null,
      locale: "en",
      notifyEmail: true,
    });

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

  // A throttle is Resend asking us to wait, not a delivery that failed: the row
  // stays claimed and the worker parks the job.
  it("rethrows a rate limit without marking the delivery failed", async () => {
    mail.mockRejectedValue(new MailRateLimitedError("slow down", 1_500));

    await expect(deliverEmail("notif-1")).rejects.toBeInstanceOf(
      MailRateLimitedError,
    );

    expect(failed).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();
  });

  it("numbers the how-to steps in the plain-text part", async () => {
    get.mockResolvedValue(welcomeNotification());

    await deliverEmail("notif-3");

    const { text, react } = mail.mock.calls[0][0];
    expect(react.props.message.steps.items).toHaveLength(3);
    expect(text).toContain("1. Schau die Trainingsvideos");
    expect(text).toContain("3. ");
  });
});

describe("deliverEmail and the recipient's preference", () => {
  beforeEach(() => get.mockResolvedValue(fallbackNotification()));

  it("respects an opt-out on a kind that is not essential", async () => {
    getProfile.mockResolvedValue({
      email: "anke@example.com",
      locale: "de",
      notifyEmail: false,
    });

    await deliverEmail("notif-2");

    expect(mail).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "opted out");
  });

  it("stands down once the push has landed", async () => {
    getDelivery.mockResolvedValue({ status: "sent" });

    await deliverEmail("notif-2");

    expect(mail).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "push delivered");
  });

  it("stands down once the row has been read", async () => {
    get.mockResolvedValue(fallbackNotification({ readAt: new Date() }));

    await deliverEmail("notif-2");

    expect(mail).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "already read");
  });

  it("sends when neither the push nor the person got there first", async () => {
    getDelivery.mockResolvedValue({ status: "failed" });

    await deliverEmail("notif-2");

    expect(mail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Pernille Holm möchte bei München pilotieren",
      }),
    );
    expect(sent).toHaveBeenCalledWith("delivery-1", null);
  });

  it("sends no mail at all for an inbox-only kind", async () => {
    get.mockResolvedValue(
      fallbackNotification({
        event: {
          type: "chapter.memberJoined",
          actorUserId: ACTOR,
          chapterId: CHAPTER,
        },
        payload: { memberName: "Pernille Holm", chapterName: "München" },
      }),
    );

    await deliverEmail("notif-2");

    expect(mail).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith(
      "delivery-1",
      "email disabled for kind",
    );
  });
});
