"use client";

/* The passenger app shell: mock session boot (golden path = zero login),
   login flow / sign-up wizard / animated onboarding when logged out, and the
   floating tab dock when signed in. Chat threads hide the dock (full-height). */

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { auth, DEMO_SESSIONS, type Session } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { isActiveRide } from "@/lib/selectors";
import { TabBar } from "@/components/chrome";
import { LoginFlow } from "@/components/auth/LoginFlow";
import { Onboarding } from "@/components/auth/Onboarding";
import { PassengerCtx, PAX_DEMO_CODE, PAX_DEMO_PHONE } from "./session";
import { SignupWizard } from "./signup";

const PERSONA = "passenger" as const;

type Phase = "boot" | "login" | "signup" | "onboarding" | "app";

export function PassengerShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const db = useStore((s) => s.db)!;
  /* Boot runs lazily on the client (this shell only renders under <AppBoot/>):
     golden path auto-signs-in as Maria; a signed-up account that vanished with
     a demo re-seed falls back to the demo user. */
  const [boot] = useState(() => {
    let s = auth.boot(PERSONA, DEMO_SESSIONS.passenger);
    if (s && !find(db.clients, s.userId)) {
      localStorage.removeItem(`cwa.auth.${PERSONA}`);
      s = auth.boot(PERSONA, DEMO_SESSIONS.passenger);
    }
    // the golden path never sees onboarding; the launcher's "replay" link does
    if (s && s.userId === DEMO_SESSIONS.passenger.userId)
      auth.markOnboarded(PERSONA);
    return s;
  });
  const [phase, setPhase] = useState<Phase>(boot ? "app" : "login");
  const [session, setSession] = useState<Session | null>(boot);

  if (phase === "login") {
    return (
      <LoginFlow
        art="wind"
        title={t("pax.welcomeTitle")}
        sub={t("pax.welcomeLine")}
        passkeyHint={t("pax.passkeyHint")}
        signupLabel={t("pax.signupCta")}
        onSignup={() => setPhase("signup")}
        phone={PAX_DEMO_PHONE}
        code={PAX_DEMO_CODE}
        onLogin={() => {
          const s = auth.save(PERSONA, DEMO_SESSIONS.passenger);
          setSession(s);
          setPhase(auth.onboarded(PERSONA) ? "app" : "onboarding");
          router.push("/passenger");
        }}
      />
    );
  }

  if (phase === "signup") {
    return (
      <SignupWizard
        onBack={() => setPhase("login")}
        onDone={(s) => {
          setSession(s);
          setPhase("onboarding");
        }}
      />
    );
  }

  if (phase === "onboarding") {
    return (
      <Onboarding
        slides={[
          { art: "wind", title: t("pax.onb1.t"), body: t("pax.onb1.b") },
          { art: "calendar", title: t("pax.onb2.t"), body: t("pax.onb2.b") },
          { art: "chat", title: t("pax.onb3.t"), body: t("pax.onb3.b") },
          { art: "celebrate", title: t("pax.onb4.t"), body: t("pax.onb4.b") },
        ]}
        onDone={() => {
          auth.markOnboarded(PERSONA);
          setPhase("app");
          router.push("/passenger");
        }}
      />
    );
  }

  /* chat threads need the full viewport (scroll inside, input at the bottom) */
  const chatThread = /^\/passenger\/chats\/.+/.test(pathname);

  const anyUnread = db.chats.some((c) => {
    const r = find(db.rides, c.rideId);
    if (!r || r.clientId !== session!.userId || !isActiveRide(r)) return false;
    const m = c.messages[c.messages.length - 1];
    return !!m && m.from !== "client" && m.from !== "system";
  });

  return (
    <PassengerCtx.Provider value={session}>
      <div className={chatThread ? "flex min-h-dvh flex-col" : undefined}>
        {children}
      </div>
      {!chatThread && (
        <TabBar
          tabs={[
            {
              href: "/passenger",
              icon: "home",
              labelKey: "pax.tab.home",
              exact: true,
            },
            {
              href: "/passenger/rides",
              icon: "calendar",
              labelKey: "pax.tab.rides",
            },
            {
              href: "/passenger/chats",
              icon: "chat",
              labelKey: "pax.tab.chats",
              dot: anyUnread,
            },
            {
              href: "/passenger/profile",
              icon: "user",
              labelKey: "pax.tab.profile",
            },
          ]}
        />
      )}
    </PassengerCtx.Provider>
  );
}
