import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Outside production nothing real is ever sent: mail goes to the local Mailpit catcher
// even when a Resend key is lying around in .env, so a dev box cannot email a live
// address by accident. Set MAILPIT_URL="" to opt back into real delivery in dev.
const mailpitUrl =
  process.env.NODE_ENV === "production"
    ? null
    : (process.env.MAILPIT_URL ?? "http://localhost:8026");

type MailOptions = {
  to: string;
  subject: string;
  text?: string;
  react?: ReactElement;
};

export async function sendMail(options: MailOptions) {
  if (mailpitUrl) {
    await sendToMailpit(mailpitUrl, options);
    return;
  }

  if (!resend) throw new Error("RESEND_API_KEY is unset — cannot send mail");

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    ...options,
  } as Parameters<typeof resend.emails.send>[0]);

  if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
}

async function sendToMailpit(url: string, options: MailOptions) {
  try {
    const response = await fetch(`${url}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: process.env.EMAIL_FROM ?? "dev@localhost" },
        To: [{ Email: options.to }],
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
