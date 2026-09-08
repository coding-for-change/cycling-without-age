import { Button, Section, Text } from "@react-email/components";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/locales";
import { EmailLayout } from "./layout";

export type NotificationMessage = {
  subject: string;
  preview?: string;
  heading: string;
  body: string;
  note?: { heading: string; text: string } | null;
  cta: string;
  footer: string;
};

export function NotificationEmail({
  locale,
  message,
  href,
}: {
  locale: Locale;
  message: NotificationMessage;
  href: string;
}) {
  return (
    <EmailLayout
      locale={locale}
      preview={message.preview ?? message.heading}
      footer={message.footer}
    >
      <Text style={styles.heading}>{message.heading}</Text>
      <Text style={styles.text}>{message.body}</Text>

      {message.note ? (
        <Section style={styles.card}>
          <Text style={styles.cardHeading}>{message.note.heading}</Text>
          <Text style={styles.note}>{message.note.text}</Text>
        </Section>
      ) : null}

      <Button
        href={href}
        style={styles.button}
      >
        {message.cta}
      </Button>
    </EmailLayout>
  );
}

const styles = {
  heading: {
    color: brand.ink,
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    lineHeight: "30px",
    margin: "0 0 12px",
  },
  text: {
    color: brand.inkSoft,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  card: {
    backgroundColor: brand.canvasDeep,
    border: `1px solid ${brand.line}`,
    borderRadius: brand.radiusCover,
    margin: "24px 0",
    padding: "20px",
  },
  cardHeading: {
    color: brand.ink,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    margin: "0 0 10px",
    textTransform: "uppercase" as const,
  },
  note: {
    color: brand.ink,
    fontSize: "15px",
    lineHeight: "24px",
    margin: 0,
    whiteSpace: "pre-wrap" as const,
  },
  button: {
    backgroundColor: brand.red,
    borderRadius: "999px",
    color: "#ffffff",
    display: "block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "14px 24px",
    textAlign: "center" as const,
    textDecoration: "none",
  },
};
