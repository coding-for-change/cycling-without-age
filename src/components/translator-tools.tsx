"use client";

import { useEffect } from "react";
import { defaultLocale, hasLocale, locales } from "@/lib/i18n/locales";
import { TOLGEE_API_URL, TOLGEE_NAMESPACE } from "@/lib/i18n/translator-mode";

export function TranslatorTools() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TRANSLATOR_MODE !== "1") return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = async (event: KeyboardEvent) => {
      if (event.key !== "Alt") return;
      document.removeEventListener("keydown", start, true);
      const { Tolgee, ObserverPlugin } = await import("@tolgee/web");
      if (cancelled) return;
      const lang = document.documentElement.lang;
      const tolgee = Tolgee()
        .use(ObserverPlugin())
        .init({
          language: hasLocale(lang) ? lang : defaultLocale,
          availableLanguages: [...locales],
          defaultNs: TOLGEE_NAMESPACE,
          ns: [TOLGEE_NAMESPACE],
          apiUrl: TOLGEE_API_URL,
          projectId: process.env.NEXT_PUBLIC_TOLGEE_PROJECT_ID,
          observerType: "invisible",
          observerOptions: { fullKeyEncode: true },
        });
      tolgee.run();
      stop = () => tolgee.stop();
    };
    document.addEventListener("keydown", start, true);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", start, true);
      stop?.();
    };
  }, []);
  return null;
}
