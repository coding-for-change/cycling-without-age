import { Button, Section, Text } from "@react-email/components";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/locales";
import { EmailLayout } from "./layout";

export type InviteEmailStrings = {
  preview: string;
  heading: string;
  intro: string;
  how: string;
  cta: string;
  footer: string;
};

export function InviteEmail({
  locale,
  strings,
  chapterName,
  inviterName,
  roleLabel,
  href,
}: {
  locale: Locale;
  strings: InviteEmailStrings;
  chapterName: string;
  inviterName: string;
  roleLabel: string;
  href: string;
}) {
  return (
    <EmailLayout
      locale={locale}
      preview={strings.preview}
      footer={strings.footer}
    >
      <Text style={styles.heading}>{strings.heading}</Text>
      <Text style={styles.text}>
        {strings.intro
          .replace("{inviter}", inviterName)
          .replace("{chapter}", chapterName)
          .replace("{role}", roleLabel)}
      </Text>

      <Section style={styles.card}>
        <Text style={styles.note}>{strings.how}</Text>
      </Section>

      <Button
        href={href}
        style={styles.button}
      >
        {strings.cta}
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
  note: {
    color: brand.ink,
    fontSize: "15px",
    lineHeight: "24px",
    margin: 0,
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
