import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
