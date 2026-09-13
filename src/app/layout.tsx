import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { defaultLocale, locales, LOCALE_COOKIE } from "@/lib/i18n";
import { NativeBootstrap } from "@/lib/native/native-bootstrap";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cycling Without Age",
  description: "Cycling Without Age",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

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
        <Toaster />
      </body>
    </html>
  );
}
