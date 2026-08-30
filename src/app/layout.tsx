import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { defaultLocale, locales, LOCALE_COOKIE } from "@/lib/i18n";
import { NativeBootstrap } from "@/lib/native/native-bootstrap";
import "./globals.css";

/* No webfonts are loaded. Everything runs on Arial (see docs/BRAND.md §
   Typography) — a system font, so there is nothing to download, no layout shift
   and no `next/font` wiring. The brand's TacaPro is not bundled; see BRAND.md
   for why and how to put it back. */

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

// The shell is prerendered with the default locale (reading the cookie here
// would block every route), so this pre-paint script corrects `lang` from the
// cookie — falling back to the browser language — before anything renders.
// See https://nextjs.org/docs/app/guides/preventing-flash-before-hydration
const setLangScript = `(function(){try{var s=${JSON.stringify(locales)},m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]*)/),l=m&&decodeURIComponent(m[1]);if(s.indexOf(l)<0){l=${JSON.stringify(defaultLocale)};var p=navigator.languages||[navigator.language];for(var i=0;i<p.length;i++){var c=(p[i]||"").slice(0,2).toLowerCase();if(s.indexOf(c)>=0){l=c;break}}}document.documentElement.lang=l}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={defaultLocale}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: setLangScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <NativeBootstrap />
        {children}
      </body>
    </html>
  );
}
