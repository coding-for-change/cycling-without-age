import { Section, Text } from "@react-email/components";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";
import { EmailLayout } from "./layout";

export type OtpEmailStrings = {
  preview: string;
  heading: string;
  intro: string;
  expiry: string;
  ignore: string;
  footer: string;
};

export function OtpEmail({
  locale,
  otp,
  strings,
}: {
  locale: Locale;
  otp: string;
  strings: OtpEmailStrings;
}) {
  return (
    <EmailLayout
      locale={locale}
      preview={strings.preview}
      footer={strings.footer}
    >
      <Text style={styles.heading}>{strings.heading}</Text>
      <Text style={styles.text}>{strings.intro}</Text>
      <Section style={styles.codeBox}>
        <Text style={styles.code}>{otp}</Text>
      </Section>
      <Text style={styles.text}>{strings.expiry}</Text>
      <Text style={styles.text}>{strings.ignore}</Text>
    </EmailLayout>
  );
}

const styles = {
  heading: {
    color: brand.ink,
    fontSize: "20px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: "28px",
    margin: "0 0 12px",
  },
  text: {
    color: brand.inkSoft,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  codeBox: {
    backgroundColor: brand.canvasDeep,
    border: `1px solid ${brand.line}`,
    borderRadius: brand.radiusCover,
    margin: "24px 0",
    padding: "20px",
    textAlign: "center" as const,
  },
  code: {
    color: brand.ink,
    fontSize: "32px",
    fontWeight: 600,
    letterSpacing: "0.3em",
    lineHeight: "40px",
    margin: 0,
    textIndent: "0.3em",
  },
};
