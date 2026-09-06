import { Button, Section, Text } from "@react-email/components";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/locales";
import { EmailLayout } from "./layout";

export type ApplicationDecisionEmailStrings = {
  preview: string;
  heading: string;
  intro: string;
  noteHeading: string;
  cta: string;
  footer: string;
};

export function ApplicationDecisionEmail({
  locale,
  strings,
  chapterName,
  note,
  href,
}: {
  locale: Locale;
  strings: ApplicationDecisionEmailStrings;
  chapterName: string;
  note?: string | null;
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
        {strings.intro.replace("{chapter}", chapterName)}
      </Text>

      {note ? (
        <Section style={styles.card}>
          <Text style={styles.cardHeading}>{strings.noteHeading}</Text>
          <Text style={styles.note}>{note}</Text>
        </Section>
      ) : null}

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
