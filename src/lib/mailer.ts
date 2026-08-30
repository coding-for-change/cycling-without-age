import { Resend } from "resend";
import type { ReactElement } from "react";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendMail(options: {
  to: string;
  subject: string;
  text?: string;
  react?: ReactElement;
}) {
  if (!resend) {
    console.info("[mailer] RESEND_API_KEY unset, logging instead", options);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    ...options,
  } as Parameters<typeof resend.emails.send>[0]);

  if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
}
