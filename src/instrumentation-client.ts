import * as Sentry from "@sentry/nextjs";
import { isNativeShell, nativePlatform } from "@/lib/native/platform";
import {
  baseOptions,
  isReplayForbidden,
} from "@/lib/observability/sentry-shared";

const safely = (run: () => void) => {
  try {
    run();
  } catch {
    return;
  }
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
});

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  safely(() => Sentry.captureRouterTransitionStart(url, navigationType));
  safely(() =>
    applyReplayPolicy(new URL(url, window.location.origin).pathname),
  );
}
