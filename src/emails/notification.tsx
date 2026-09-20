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
  steps?: { heading?: string; items: string[] } | null;
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

      <Steps steps={message.steps} />

      <Button
        href={href}
        style={styles.button}
      >
        {message.cta}
      </Button>
    </EmailLayout>
  );
}

function Steps({ steps }: { steps: NotificationMessage["steps"] }) {
  if (!steps || steps.items.length === 0) return null;
  return (
    <Section style={styles.stepCard}>
      {steps.heading ? (
        <Text style={styles.stepCardHeading}>{steps.heading}</Text>
      ) : null}
      {steps.items.map((line, index) => (
        <Text
          key={line}
          style={styles.step}
        >
          {steps.items.length > 1 ? (
            <span style={styles.number}>{index + 1}</span>
          ) : null}
          {line}
        </Text>
      ))}
    </Section>
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
  stepCard: {
    backgroundColor: brand.canvasDeep,
    border: `1px solid ${brand.line}`,
    borderRadius: brand.radiusCover,
    margin: "24px 0",
    padding: "20px 20px 8px",
  },
  stepCardHeading: {
    color: brand.ink,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    margin: "0 0 14px",
    textTransform: "uppercase" as const,
  },
  step: {
    color: brand.ink,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 14px",
  },
  number: {
    backgroundColor: brand.mint,
    borderRadius: "999px",
    color: brand.ink,
    display: "inline-block",
    fontSize: "13px",
    fontWeight: 700,
    height: "22px",
    lineHeight: "22px",
    marginRight: "10px",
    textAlign: "center" as const,
    width: "22px",
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
