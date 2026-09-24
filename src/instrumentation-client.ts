import * as Sentry from "@sentry/nextjs";
import { isNativeShell, nativePlatform } from "@/lib/native/platform";
import {
  baseOptions,
  isReplayForbidden,
} from "@/lib/observability/sentry-shared";
import { StaticText, maskUnlessStatic } from "@/lib/observability/replay-mask";
import { hasLocale, type Locale } from "@/lib/i18n/locales";

const safely = (run: () => void) => {
  try {
    run();
  } catch {
    return;
  }
};

const staticText = new StaticText();
const loadedLocales = new Set<Locale>();

const dictionaryLoaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("@/lib/i18n/en"),
  da: () => import("@/lib/i18n/da"),
  de: () => import("@/lib/i18n/de"),
};

const loadStaticText = () => {
  const locale = document.documentElement.lang;
  if (!hasLocale(locale) || loadedLocales.has(locale)) return;
  loadedLocales.add(locale);
  dictionaryLoaders[locale]()
    .then((module) => staticText.add(module.default))
    .catch(() => loadedLocales.delete(locale));
};

const applyReplayPolicy = (pathname: string) =>
  safely(() => {
    const replay = Sentry.getReplay();
    if (!replay) return;
    const recording = Boolean(replay.getRecordingMode());
    if (isReplayForbidden(pathname)) {
      if (recording) void replay.stop({ flush: false });
      return;
    }
    if (!recording) replay.startBuffering();
  });

safely(() => {
  Sentry.init({
    ...baseOptions({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      service: "web",
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    }),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        networkDetailAllowUrls: [],
        maskFn: maskUnlessStatic(staticText),
      }),
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    tunnel: "/monitoring",
    enableLogs: true,
  });

  Sentry.setTag("platform", nativePlatform());
  if (isNativeShell()) Sentry.setTag("app.shell", "native");

  applyReplayPolicy(window.location.pathname);
  loadStaticText();
});

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  safely(() => Sentry.captureRouterTransitionStart(url, navigationType));
  safely(() =>
    applyReplayPolicy(new URL(url, window.location.origin).pathname),
  );
  safely(loadStaticText);
}
