import { Button, Section, Text } from "@react-email/components";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/locales";
import { EmailLayout } from "./layout";

export type ChatDigestLine = { text: string; time: string };

export type ChatDigestGroup = { sender: string; lines: ChatDigestLine[] };

export type ChatDigestMessage = {
  subject: string;
  preview: string;
  heading: string;
  intro: string;
  cta: string;
  footer: string;
  groups: ChatDigestGroup[];
  more: string | null;
};

export function ChatDigestEmail({
  locale,
  message,
  href,
}: {
  locale: Locale;
  message: ChatDigestMessage;
  href: string;
}) {
  return (
    <EmailLayout
      locale={locale}
      preview={message.preview}
      footer={message.footer}
    >
      <Text style={styles.heading}>{message.heading}</Text>
      <Text style={styles.text}>{message.intro}</Text>

      <Section style={styles.card}>
        {message.groups.map((group, index) => (
          <Section
            key={`${group.sender}-${index}`}
            style={index === 0 ? styles.group : styles.groupSpaced}
          >
            <Text style={styles.sender}>{group.sender}</Text>
            {group.lines.map((line, lineIndex) => (
              <Text
                key={`${line.time}-${lineIndex}`}
                style={styles.line}
              >
                <span style={styles.time}>{line.time}</span>
                {line.text}
              </Text>
            ))}
          </Section>
        ))}
        {message.more ? <Text style={styles.more}>{message.more}</Text> : null}
      </Section>

      <Button
        href={href}
        style={styles.button}
      >
        {message.cta}
      </Button>
    </EmailLayout>
  );
}

const group = { margin: 0, padding: 0 };

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
  group,
  groupSpaced: { ...group, marginTop: "20px" },
  sender: {
    color: brand.ink,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    margin: "0 0 8px",
    textTransform: "uppercase" as const,
  },
  line: {
    color: brand.ink,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 6px",
  },
  time: {
    color: brand.inkFaint,
    display: "inline-block",
    fontSize: "13px",
    marginRight: "10px",
  },
  more: {
    color: brand.inkSoft,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "16px 0 0",
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
