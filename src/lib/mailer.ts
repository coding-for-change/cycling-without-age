import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const mailpitUrl =
  process.env.NODE_ENV === "production"
    ? null
    : (process.env.MAILPIT_URL ?? "http://localhost:8026");

type MailOptions = {
  to: string;
  subject: string;
  text?: string;
  react?: ReactElement;
  replyTo?: string;
};

export async function sendMail(options: MailOptions) {
  if (mailpitUrl) {
    await sendToMailpit(mailpitUrl, options);
    return;
  }

  if (!resend) throw new Error("RESEND_API_KEY is unset — cannot send mail");

  const { react, ...rest } = options;
  const { error, headers } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    ...rest,
    ...(react ? { html: await render(react) } : {}),
  } as Parameters<typeof resend.emails.send>[0]);

  if (!error) return;
  if (isRateLimit(error)) {
    throw new MailRateLimitedError(
      `Resend: ${error.name} — ${error.message}`,
      retryAfterMs(headers),
    );
  }
  throw new Error(`Resend: ${error.name} — ${error.message}`);
}

export class MailRateLimitedError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "MailRateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

const DEFAULT_RETRY_AFTER_MS = 1_000;
const MAX_RETRY_AFTER_MS = 60_000;

const isRateLimit = (error: { name?: string; statusCode?: number | null }) =>
  error.name === "rate_limit_exceeded" || error.statusCode === 429;

// Resend sends both in seconds: `retry-after` per request, `ratelimit-reset` per window.
function retryAfterMs(headers: Record<string, string> | null | undefined) {
  const seconds =
    toSeconds(headers?.["retry-after"]) ??
    toSeconds(headers?.["ratelimit-reset"]);
  return seconds === null
    ? DEFAULT_RETRY_AFTER_MS
    : Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
}

function toSeconds(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function sendToMailpit(url: string, options: MailOptions) {
  try {
    const response = await fetch(`${url}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: process.env.EMAIL_FROM ?? "dev@localhost" },
        To: [{ Email: options.to }],
        ReplyTo: options.replyTo ? [{ Email: options.replyTo }] : undefined,
        Subject: options.subject,
        Text: options.text,
        HTML: options.react ? await render(options.react) : undefined,
      }),
    });
    if (!response.ok)
      throw new Error(`${response.status} ${await response.text()}`);
    console.info(`[mailer] delivered to Mailpit (${url}) → ${options.to}`);
  } catch (error) {
    console.info("[mailer] Mailpit unreachable, logging instead", {
      to: options.to,
      subject: options.subject,
      text: options.text,
      error,
    });
  }
}
