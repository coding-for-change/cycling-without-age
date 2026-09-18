import { Worker } from "bullmq";
import { queue } from "@/lib/events/queues";
import { MailRateLimitedError } from "@/lib/mailer";
import { deliverEmail } from "@/use-cases/notifications/deliver-email";
import { deliverPush } from "@/use-cases/notifications/deliver-push";
import {
  parkOnRateLimit,
  runEmailDelivery,
  runPushDelivery,
} from "@/worker/deliveries";
import type { DeliveryJob } from "@/worker/deliveries";

jest.mock("@/lib/events/queues", () => {
  const rateLimit = jest.fn();
  return {
    QUEUE: {
      events: "events",
      handlers: "handlers",
      email: "email",
      push: "push",
    },
    queue: jest.fn(() => ({ rateLimit })),
  };
});
jest.mock("@/use-cases/notifications/deliver-email", () => ({
  deliverEmail: jest.fn(),
}));
jest.mock("@/use-cases/notifications/deliver-push", () => ({
  deliverPush: jest.fn(),
}));

const email = deliverEmail as jest.Mock;
const push = deliverPush as jest.Mock;
const rateLimit = (queue as jest.Mock)("email").rateLimit as jest.Mock;

const job = { data: { notificationId: "notif-1" } } as DeliveryJob;

beforeEach(() => jest.clearAllMocks());

describe("runEmailDelivery", () => {
  it("hands the notification id to the delivery use case", async () => {
    await runEmailDelivery(job);

    expect(email).toHaveBeenCalledWith("notif-1");
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("parks the whole email queue for as long as Resend asked", async () => {
    email.mockRejectedValue(new MailRateLimitedError("slow down", 1_500));

    await expect(runEmailDelivery(job)).rejects.toThrow(
      Worker.RateLimitError().message,
    );

    expect(queue).toHaveBeenCalledWith("email");
    expect(rateLimit).toHaveBeenCalledWith(1_500);
  });

  it("lets every other failure through to BullMQ's own retry", async () => {
    email.mockRejectedValue(new Error("Resend down"));

    await expect(runEmailDelivery(job)).rejects.toThrow("Resend down");
    expect(rateLimit).not.toHaveBeenCalled();
  });
});

describe("parkOnRateLimit", () => {
  it("parks any mail the chat digest included", async () => {
    const send = jest
      .fn()
      .mockRejectedValue(new MailRateLimitedError("slow down", 900));

    await expect(parkOnRateLimit(send)).rejects.toThrow(
      Worker.RateLimitError().message,
    );

    expect(rateLimit).toHaveBeenCalledWith(900);
  });

  it("returns quietly when the mail went out", async () => {
    await expect(parkOnRateLimit(async () => {})).resolves.toBeUndefined();
    expect(rateLimit).not.toHaveBeenCalled();
  });
});

describe("runPushDelivery", () => {
  it("hands the notification id to the delivery use case", async () => {
    await runPushDelivery(job);

    expect(push).toHaveBeenCalledWith("notif-1");
  });

  it("lets a failure through unchanged", async () => {
    push.mockRejectedValue(new Error("FCM down"));

    await expect(runPushDelivery(job)).rejects.toThrow("FCM down");
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
