"use client";

/* Client boot gate for each app shell: hydrates the store + language on mount
   (the database lives in localStorage, so nothing store-driven can render on
   the server), starts the cross-tab watch for this app's notification
   audience(s), and mounts the toast/banner region. */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore, startWatch, type WatchOpts } from "@/lib/store";
import { bootLang, t, useI18n } from "@/lib/i18n";
import { pushBanner, useUi } from "@/lib/ui";
import { Icon } from "./Icon";

export function AppBoot({
  audiences,
  watch,
  children,
  fallback = null,
}: {
  audiences?: string[];
  watch?: WatchOpts;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const hydrate = useStore((s) => s.hydrate);

  useEffect(() => {
    bootLang();
    hydrate();
    setReady(true);
    if (audiences && watch) {
      return startWatch(audiences, watch, pushBanner, t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <>{fallback}</>;
  return (
    <>
      {children}
      <NotificationRegion />
    </>
  );
}

function NotificationRegion() {
  const router = useRouter();
  const { t } = useI18n();
  const toasts = useUi((s) => s.toasts);
  const banners = useUi((s) => s.banners);
  const dismissBanner = useUi((s) => s.dismissBanner);

  return (
    <>
      <div className="banner-region">
        {banners.map((b) => (
          <button
            key={b.id}
            type="button"
            className="push-banner"
            onClick={() => {
              dismissBanner(b.id);
              if (b.href) router.push(b.href);
            }}
          >
            <span className="app-icon">
              <Icon name={b.icon || "bike"} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="push-banner-title block truncate">
                {b.title}
              </span>
              <span className="push-banner-body block truncate">{b.body}</span>
            </span>
            <span className="push-banner-meta">
              {b.appName || "CWA"} · {t("common.now")}
            </span>
          </button>
        ))}
      </div>
      <div className="toast-region">
        {toasts.map((tt) => (
          <div
            key={tt.id}
            className={`toast toast-${tt.type}`}
          >
            <Icon
              name={
                tt.type === "error"
                  ? "alert"
                  : tt.type === "info"
                    ? "info"
                    : "check"
              }
            />
            <span>{tt.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}
