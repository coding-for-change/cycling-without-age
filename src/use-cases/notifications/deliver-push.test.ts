import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { isPushConfigured, sendPush } from "@/lib/push";
import { deliverPush } from "@/use-cases/notifications/deliver-push";

jest.mock("@/features/notifications", () => ({
  notifications: {
    get: jest.fn(),
    beginDelivery: jest.fn(),
    deliverySent: jest.fn(),
    deliveryFailed: jest.fn(),
    deliverySkipped: jest.fn(),
    listDeviceTokens: jest.fn(),
    removeDeviceTokens: jest.fn(),
    unseenCount: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getSettings: jest.fn() },
}));
jest.mock("@/lib/push", () => ({
  isPushConfigured: jest.fn(),
  sendPush: jest.fn(),
}));

const get = notifications.get as jest.Mock;
const beginDelivery = notifications.beginDelivery as jest.Mock;
const sent = notifications.deliverySent as jest.Mock;
const failed = notifications.deliveryFailed as jest.Mock;
const skipped = notifications.deliverySkipped as jest.Mock;
const listDeviceTokens = notifications.listDeviceTokens as jest.Mock;
const removeDeviceTokens = notifications.removeDeviceTokens as jest.Mock;
const unseenCount = notifications.unseenCount as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getSettings = chapters.getSettings as jest.Mock;
const configured = isPushConfigured as jest.Mock;
const push = sendPush as jest.Mock;

const APPLICANT = "user-pernille";
const ADMIN = "user-anke";
const CHAPTER = "chapter-muenchen";

const decided = () => ({
  id: "notif-1",
  recipientUserId: APPLICANT,
  category: "application",
  href: "/pilot",
  readAt: null,
  payload: { chapterName: "München", approved: true, note: null },
  event: {
    type: "pilotApplication.decided",
    actorUserId: ADMIN,
    chapterId: CHAPTER,
  },
});

// The admin's copy of a pilot application: optional, so their preference counts.
const submitted = () => ({
  id: "notif-2",
  recipientUserId: ADMIN,
  category: "application",
  href: `/admin/members/${APPLICANT}`,
  readAt: null,
  payload: { applicantName: "Pernille Holm", chapterName: "München" },
  event: {
    type: "pilotApplication.submitted",
    actorUserId: APPLICANT,
    chapterId: CHAPTER,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(decided());
  beginDelivery.mockResolvedValue({ id: "delivery-1" });
  getProfile.mockResolvedValue({ locale: "de", notifyPush: true });
  getSettings.mockResolvedValue(DEFAULT_CHAPTER_SETTINGS);
  listDeviceTokens.mockResolvedValue(["token-a"]);
  unseenCount.mockResolvedValue(3);
  configured.mockReturnValue(true);
  push.mockResolvedValue({ sent: 1, invalidTokens: [] });
});

describe("deliverPush", () => {
  it("writes the banner in the recipient's language and badges the unseen count", async () => {
    await deliverPush("notif-1");

    expect(push).toHaveBeenCalledWith({
      tokens: ["token-a"],
      title: "Willkommen an Bord",
      body: expect.stringContaining("München"),
      data: { href: "/pilot", notificationId: "notif-1" },
      badge: 3,
    });
    expect(sent).toHaveBeenCalledWith("delivery-1", null);
  });

  it("does nothing when this channel already went out", async () => {
    beginDelivery.mockResolvedValue(null);

    await deliverPush("notif-1");

    expect(push).not.toHaveBeenCalled();
  });

  it("skips a recipient whose account is gone", async () => {
    getProfile.mockResolvedValue(null);

    await deliverPush("notif-1");

    expect(push).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "no account");
  });

  it("respects an opt-out on a kind that is not essential", async () => {
    get.mockResolvedValue(submitted());
    getProfile.mockResolvedValue({ locale: "de", notifyPush: false });

    await deliverPush("notif-2");

    expect(push).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "opted out");
  });

  // An essential kind ignores the preference; the inbox row exists either way.
  it("pushes an essential kind to someone who opted out", async () => {
    getProfile.mockResolvedValue({ locale: "de", notifyPush: false });

    await deliverPush("notif-1");

    expect(push).toHaveBeenCalled();
  });

  it("skips someone with no device registered", async () => {
    listDeviceTokens.mockResolvedValue([]);

    await deliverPush("notif-1");

    expect(push).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "no device");
  });

  // Missing credentials are a setup state, not an outage worth five retries.
  it("skips instead of failing while push is unconfigured", async () => {
    configured.mockReturnValue(false);

    await deliverPush("notif-1");

    expect(push).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "push not configured");
    expect(failed).not.toHaveBeenCalled();
  });

  it("prunes the tokens FCM rejected and still counts the send", async () => {
    listDeviceTokens.mockResolvedValue(["token-a", "token-dead"]);
    push.mockResolvedValue({ sent: 1, invalidTokens: ["token-dead"] });

    await deliverPush("notif-1");

    expect(removeDeviceTokens).toHaveBeenCalledWith(["token-dead"]);
    expect(sent).toHaveBeenCalledWith("delivery-1", null);
  });

  // Every device is dead: there is nothing left to retry against.
  it("fails without throwing when every token was rejected", async () => {
    push.mockResolvedValue({ sent: 0, invalidTokens: ["token-a"] });

    await expect(deliverPush("notif-1")).resolves.toBeUndefined();

    expect(failed).toHaveBeenCalledWith("delivery-1", "all tokens rejected");
    expect(sent).not.toHaveBeenCalled();
  });

  it("records and rethrows a provider outage so the job retries", async () => {
    push.mockRejectedValue(new Error("FCM down"));

    await expect(deliverPush("notif-1")).rejects.toThrow("FCM down");

    expect(failed).toHaveBeenCalledWith(
      "delivery-1",
      expect.stringContaining("FCM down"),
    );
  });
});

describe("deliverPush and the chapter's own switch", () => {
  beforeEach(() => get.mockResolvedValue(submitted()));

  // The chapter's say is read like the recipient's own preference, so a
  // switched-off alert still leaves a Delivery row behind.
  it("skips an alert the chapter turned off", async () => {
    getSettings.mockResolvedValue({
      ...DEFAULT_CHAPTER_SETTINGS,
      applicationAlertPush: false,
    });

    await deliverPush("notif-2");

    expect(push).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledWith("delivery-1", "disabled by chapter");
  });

  it("pushes as before while the chapter leaves the alert on", async () => {
    await deliverPush("notif-2");

    expect(push).toHaveBeenCalled();
    expect(sent).toHaveBeenCalledWith("delivery-1", null);
  });

  it("asks nothing for a kind the chapter has no switch for", async () => {
    get.mockResolvedValue(decided());

    await deliverPush("notif-1");

    expect(getSettings).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalled();
  });
});
