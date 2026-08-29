import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/* TacaPro — the CWA corporate typeface (see docs/BRAND.md). Headlines only;
   body text stays on Inter. */
const taca = localFont({
  variable: "--font-taca",
  src: [
    { path: "../fonts/TacaPro-Regular.otf", weight: "400" },
    { path: "../fonts/TacaPro-Bold.otf", weight: "700" },
    { path: "../fonts/TacaPro-Extrabold.otf", weight: "800" },
  ],
});

export const metadata: Metadata = {
  title: "Cycling Without Age",
  description: "Cycling Without Age",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `cover` lets content extend under the notch/home-indicator so that
  // `env(safe-area-inset-*)` resolves to real values on mobile.
  viewportFit: "cover",
  // Resize the layout viewport when the soft keyboard opens, so bottom
  // sheets and sticky footers stay above it instead of being covered.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${taca.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
