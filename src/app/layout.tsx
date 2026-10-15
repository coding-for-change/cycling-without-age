import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { defaultLocale, locales, LOCALE_COOKIE } from "@/lib/i18n";
import { NativeBootstrap } from "@/lib/native/native-bootstrap";
import { NativeBackHandler } from "@/lib/native/native-back-handler";
import { NATIVE_USER_AGENT } from "@/lib/native/user-agent";
import { PushRegistrar } from "@/components/push-registrar";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { TranslatorTools } from "@/components/translator-tools";
import { translatorModeBuilt } from "@/lib/i18n/translator-mode";
import { THEME_COLOR, themeScript } from "@/lib/theme";
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
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

const setLangScript = `(function(){try{var s=${JSON.stringify(locales)},m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]*)/),l=m&&decodeURIComponent(m[1]);if(s.indexOf(l)<0){l=${JSON.stringify(defaultLocale)};var p=navigator.languages||[navigator.language];for(var i=0;i<p.length;i++){var c=(p[i]||"").slice(0,2).toLowerCase();if(s.indexOf(c)>=0){l=c;break}}}document.documentElement.lang=l}catch(e){}})()`;

const setShellScript = `(function(){try{var u=navigator.userAgent;if(u.indexOf(${JSON.stringify(NATIVE_USER_AGENT)})<0)return;var s=/\\b(?:iPhone|iPad)\\b/.test(u)?"ios":/\\bAndroid\\b/.test(u)?"android":"";if(s)document.documentElement.dataset.shell=s}catch(e){}})()`;

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
        <script dangerouslySetInnerHTML={{ __html: setShellScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <NativeBootstrap />
        <Suspense fallback={null}>
          <NativeBackHandler />
        </Suspense>
        <PushRegistrar />
        <ServiceWorkerRegistrar />
        {translatorModeBuilt && <TranslatorTools />}
        {children}
        <Toaster
          mobileOffset={{
            bottom:
              "calc(max(var(--cap-native-navigation-bottom, var(--tabbar-h) + env(safe-area-inset-bottom)), env(safe-area-inset-bottom)) + 1.25rem)",
          }}
        />
      </body>
    </html>
  );
}
