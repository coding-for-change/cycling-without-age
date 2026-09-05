import { Button, Section, Text } from "@react-email/components";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/locales";
import { EmailLayout } from "./layout";

export type WelcomeEmailStrings = {
  preview: string;
  heading: string;
  intro: string;
  howHeading: string;
  how: string[];
  cta: string;
  footer: string;
};

export function WelcomeEmail({
  locale,
  strings,
  chapterName,
  href,
}: {
  locale: Locale;
  strings: WelcomeEmailStrings;
  chapterName: string;
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

      <Section style={styles.card}>
        <Text style={styles.cardHeading}>{strings.howHeading}</Text>
        {strings.how.map((line, index) => (
          <Text
            key={line}
            style={styles.step}
          >
            <span style={styles.number}>{index + 1}</span>
            {line}
          </Text>
        ))}
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
    padding: "20px 20px 8px",
  },
  cardHeading: {
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
    color: brand.canvas,
    display: "block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "14px 24px",
    textAlign: "center" as const,
    textDecoration: "none",
  },
};
