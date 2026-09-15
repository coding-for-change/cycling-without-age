const send = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send } })),
}));

const ORIGINAL_ENV = process.env;

const loadMailer = async () => {
  let mailer!: typeof import("@/lib/mailer");
  await jest.isolateModulesAsync(async () => {
    mailer = await import("@/lib/mailer");
  });
  return mailer;
};

const answer = (
  error: Record<string, unknown> | null,
  headers?: Record<string, string>,
) => send.mockResolvedValue({ data: null, error, headers });

const message = { to: "p@example.com", subject: "Hello", text: "Hi" };

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "production",
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "hej@cyclingwithoutage.test",
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("sendMail against Resend", () => {
  it("returns quietly when Resend accepted the mail", async () => {
    answer(null);
    const { sendMail } = await loadMailer();

    await expect(sendMail(message)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "p@example.com" }),
    );
  });

  it("reads the wait out of retry-after when Resend throttles", async () => {
    answer(
      { name: "rate_limit_exceeded", message: "Too many requests" },
      { "retry-after": "3", "ratelimit-reset": "9" },
    );
    const { sendMail, MailRateLimitedError } = await loadMailer();

    const error = await sendMail(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MailRateLimitedError);
    expect(
      (error as InstanceType<typeof MailRateLimitedError>).retryAfterMs,
    ).toBe(3_000);
  });

  it("caps the wait at a minute however long Resend asks for", async () => {
    answer(
      { name: "rate_limit_exceeded", message: "Too many requests" },
      { "retry-after": "3600" },
    );
    const { sendMail, MailRateLimitedError } = await loadMailer();

    const error = await sendMail(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MailRateLimitedError);
    expect(
      (error as InstanceType<typeof MailRateLimitedError>).retryAfterMs,
    ).toBe(60_000);
  });

  it("falls back to ratelimit-reset when retry-after is missing", async () => {
    answer(
      { name: "rate_limit_exceeded", message: "Too many requests" },
      {
        "ratelimit-reset": "5",
      },
    );
    const { sendMail, MailRateLimitedError } = await loadMailer();

    const error = await sendMail(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MailRateLimitedError);
    expect(
      (error as InstanceType<typeof MailRateLimitedError>).retryAfterMs,
    ).toBe(5_000);
  });

  it("waits a second when Resend names no window at all", async () => {
    answer({ name: "unknown", statusCode: 429, message: "Slow down" });
    const { sendMail, MailRateLimitedError } = await loadMailer();

    const error = await sendMail(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MailRateLimitedError);
    expect(
      (error as InstanceType<typeof MailRateLimitedError>).retryAfterMs,
    ).toBe(1_000);
  });

  it("leaves every other Resend error a plain Error", async () => {
    answer({ name: "validation_error", message: "from is not verified" });
    const { sendMail, MailRateLimitedError } = await loadMailer();

    const error = await sendMail(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(MailRateLimitedError);
    expect((error as Error).message).toContain("from is not verified");
  });

  it("refuses to send with no API key rather than dropping the mail", async () => {
    process.env.RESEND_API_KEY = "";
    const { sendMail } = await loadMailer();

    await expect(sendMail(message)).rejects.toThrow("RESEND_API_KEY is unset");
  });
});

describe("sendMail outside production", () => {
  it("goes to Mailpit and never touches Resend", async () => {
    process.env = { ...process.env, NODE_ENV: "development" };
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "info").mockImplementation(() => {});

    const { sendMail } = await loadMailer();
    await sendMail(message);

    expect(send).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8026/api/v1/send",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("carries a reply-to into the Mailpit body, and omits it when there is none", async () => {
    process.env = { ...process.env, NODE_ENV: "development" };
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "info").mockImplementation(() => {});

    const { sendMail } = await loadMailer();
    await sendMail({ ...message, replyTo: "hej@muenchen.example" });
    await sendMail(message);

    const bodies = fetchMock.mock.calls.map(
      ([, init]: [string, { body: string }]) => JSON.parse(init.body),
    );
    expect(bodies[0].ReplyTo).toEqual([{ Email: "hej@muenchen.example" }]);
    expect(bodies[1].ReplyTo).toBeUndefined();
  });
});
