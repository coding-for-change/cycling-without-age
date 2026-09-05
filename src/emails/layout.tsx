import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export function EmailLayout({
  locale,
  preview,
  footer,
  children,
}: {
  locale: Locale;
  preview: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang={locale}>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{ url: brand.fontUrl, format: "woff2" }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.page}>
        <Container style={styles.container}>
          <Img
            src={`${baseUrl}/logo.png`}
            width="40"
            height="40"
            alt="Cycling Without Age"
            style={styles.logo}
          />
          <Section>{children}</Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{footer}</Text>
          <Text style={styles.footer}>Cycling Without Age</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  page: {
    backgroundColor: brand.canvas,
    fontFamily: brand.font,
    margin: 0,
    padding: "40px 20px",
  },
  container: {
    maxWidth: "440px",
    margin: "0 auto",
  },
  logo: {
    marginBottom: "32px",
  },
  hr: {
    border: "none",
    borderTop: `1px solid ${brand.line}`,
    margin: "40px 0 24px",
  },
  footer: {
    color: brand.inkFaint,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 4px",
  },
};
