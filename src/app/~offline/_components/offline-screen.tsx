"use client";

import { useSyncExternalStore } from "react";
import { ArrowLeft, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/messages";

type OfflineStrings = Dictionary["offline"];

const subscribeToNothing = () => () => {};

const documentLocale = (): Locale => {
  const lang = document.documentElement.lang.slice(0, 2).toLowerCase();
  return hasLocale(lang) ? lang : defaultLocale;
};

const serverLocale = (): Locale => defaultLocale;

export function OfflineScreen({
  strings,
}: {
  strings: Record<Locale, OfflineStrings>;
}) {
  const locale = useSyncExternalStore(
    subscribeToNothing,
    documentLocale,
    serverLocale,
  );
  const t = strings[locale];

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 bg-canvas px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
      <div className="grid size-16 place-items-center rounded-full bg-mint">
        <WifiOff
          className="size-7 text-ink"
          aria-hidden
        />
      </div>
      <div className="flex max-w-sm flex-col gap-3">
        <h1 className="text-2xl">{t.title}</h1>
        <p className="text-base text-ink-soft">{t.description}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          variant="brand"
          size="hero"
          onClick={() => window.location.reload()}
        >
          <RotateCw aria-hidden />
          {t.retry}
        </Button>
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={() => window.history.back()}
        >
          <ArrowLeft aria-hidden />
          {t.goBack}
        </Button>
      </div>
    </main>
  );
}
