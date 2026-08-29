"use client";

/* The pilot app's session gate + shared context.

   Logged out : welcome → passkey | phone → one-time code · sign-up → onboarding
   Logged in  : the app (children), floating tab dock, notifications sheet.   */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore, notify, find } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { auth, DEMO_SESSIONS, type Session } from "@/lib/auth";
import { toast } from "@/lib/ui";
import { eventTitle } from "@/lib/selectors";
import { LoginFlow } from "@/components/auth/LoginFlow";
import { Onboarding } from "@/components/auth/Onboarding";
import { Modal } from "@/components/Modal";
import { TabBar, BellButton, EmptyState } from "@/components/chrome";
import { Icon } from "@/components/Icon";
import { cleared, freeTrishaw, DEMO_PHONE, DEMO_CODE } from "./lib";
import { SignupWizard } from "./signup";

interface PilotCtx {
  pilotId: string;
  pilotName: string;
  openNotifs: () => void;
  rename: (name: string) => void;
  logout: () => void;
  hasFreshNotifs: boolean;
  bell: ReactNode;
}

const Ctx = createContext<PilotCtx | null>(null);

export function usePilot(): PilotCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePilot outside PilotGate");
  return ctx;
}

/* du-form remaps for the shared auth flow */
const PAUTH_KEYS = {
  "auth.usePhone": "pauth.usePhone",
  "auth.terms": "pauth.terms",
  "auth.verifying": "pauth.verifying",
  "auth.welcomeBack": "pauth.welcomeBack",
  "auth.phoneTitle": "pauth.phoneTitle",
  "auth.phoneSub": "pauth.phoneSub",
  "auth.codeSub": "pauth.codeSub",
};

export function PilotGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const db = useStore((s) => s.db)!;

  const [session, setSession] = useState<Session | null>(() => {
    const s = auth.boot("pilot", DEMO_SESSIONS.pilot);
    // golden path: the auto-logged-in demo persona never sees onboarding
    if (s && s.userId === DEMO_SESSIONS.pilot.userId)
      auth.markOnboarded("pilot");
    return s;
  });
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showOnb, setShowOnb] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  /* demo data may have been reseeded under a signed-up pilot → fall back */
  useEffect(() => {
    if (session && !find(db.pilots, session.userId)) {
      setSession(auth.save("pilot", DEMO_SESSIONS.pilot));
    }
    if (session && session.userId === DEMO_SESSIONS.pilot.userId)
      auth.markOnboarded("pilot");
  }, [session, db]);

  const pilotId = session?.userId ?? "";
  const pilotName = session?.name ?? "";

  const notifs = useMemo(
    () =>
      db.notifications
        .filter(
          (n) => n.audience === "pilot" || n.audience === `pilot:${pilotId}`,
        )
        .slice()
        .sort((a, b) => b.ts - a.ts),
    [db, pilotId],
  );
  // eslint-disable-next-line react-hooks/purity -- live "now" read, intentional in this ported mock (SOURCE downgrades this rule repo-wide)
  const hasFreshNotifs = notifs.some((n) => n.ts > Date.now() - 864e5);

  const anyUnread = db.chats.some((c) => {
    const r = find(db.rides, c.rideId);
    if (!r) return false;
    const mine =
      r.pilotId === pilotId ||
      (r.pilots ? Object.values(r.pilots).includes(pilotId) : false);
    if (!mine) return false;
    const last = c.messages[c.messages.length - 1];
    return !!last && last.from !== "pilot" && last.from !== "system";
  });

  const ctx = useMemo<PilotCtx>(
    () => ({
      pilotId,
      pilotName,
      hasFreshNotifs,
      openNotifs: () => setNotifsOpen(true),
      bell: (
        <BellButton
          hasNew={hasFreshNotifs}
          onClick={() => setNotifsOpen(true)}
        />
      ),
      rename: (name: string) =>
        setSession(
          auth.save("pilot", { userId: pilotId, name, loggedIn: true }),
        ),
      logout: () => {
        auth.logout("pilot");
        setMode("login");
        setSession(null);
      },
    }),

    [pilotId, pilotName, hasFreshNotifs],
  );

  if (!session) {
    if (mode === "signup") {
      return (
        <div className="app">
          <SignupWizard
            onBack={() => setMode("login")}
            onCreated={(s) => {
              setSession(s);
              setShowOnb(true);
            }}
          />
        </div>
      );
    }
    return (
      <div className="app">
        <LoginFlow
          art="trishaw"
          title={t("pilot.welcome.title")}
          sub={t("pilot.welcome.sub")}
          passkeyHint={t("pauth.passkeyHint")}
          signupLabel={t("pilot.welcome.become")}
          onSignup={() => setMode("signup")}
          phone={DEMO_PHONE}
          code={DEMO_CODE}
          keys={PAUTH_KEYS}
          onLogin={() => {
            const s = auth.save("pilot", DEMO_SESSIONS.pilot);
            setSession(s);
            if (!auth.onboarded("pilot")) setShowOnb(true);
          }}
        />
      </div>
    );
  }

  if (showOnb || !auth.onboarded("pilot")) {
    return (
      <div className="app">
        <Onboarding
          slides={[
            {
              art: "trishaw",
              title: t("pilot.onb1.t"),
              body: t("pilot.onb1.b"),
            },
            {
              art: "helmet",
              title: t("pilot.onb2.t"),
              body: t("pilot.onb2.b"),
            },
            {
              art: "calendar",
              title: t("pilot.onb3.t"),
              body: t("pilot.onb3.b"),
            },
            { art: "hands", title: t("pilot.onb4.t"), body: t("pilot.onb4.b") },
          ]}
          onDone={() => {
            auth.markOnboarded("pilot");
            setShowOnb(false);
            router.push(cleared(db, pilotId) ? "/pilot" : "/pilot/training");
          }}
        />
      </div>
    );
  }

  /* chat threads run chromeless (no dock, full height) */
  const chromeless = /^\/pilot\/chats\/./.test(pathname);

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">{children}</div>
      {!chromeless && (
        <TabBar
          tabs={[
            {
              href: "/pilot",
              icon: "home",
              labelKey: "pilot.tab.home",
              exact: true,
            },
            { href: "/pilot/rides", icon: "bike", labelKey: "pilot.tab.rides" },
            {
              href: "/pilot/chats",
              icon: "chat",
              labelKey: "pilot.tab.chats",
              dot: anyUnread,
            },
            {
              href: "/pilot/profile",
              icon: "user",
              labelKey: "pilot.tab.profile",
            },
          ]}
        />
      )}
      <NotifSheet
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
        notifs={notifs}
      />
    </Ctx.Provider>
  );
}

/* -------------------------- notifications sheet -------------------------- */
const NOTIF_ICON: Record<string, string> = {
  "notif.rideOpen": "bike",
  "notif.message": "chat",
  "notif.approved": "shield",
  "notif.cancelled": "x",
  "notif.scheduled": "calendar",
  "notif.grabbed": "bike",
};

function NotifSheet({
  open,
  onClose,
  notifs,
}: {
  open: boolean;
  onClose: () => void;
  notifs: {
    id: number;
    tKey: string;
    params: Record<string, string>;
    hash: string;
    ts: number;
  }[];
}) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h2">{t("common.notifications")}</div>
          <button
            type="button"
            className="icon-pill"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <Icon name="x" />
          </button>
        </div>
        {notifs.length ? (
          <div className="flex flex-col gap-2.5">
            {notifs.slice(0, 8).map((n) => (
              <button
                key={n.id}
                type="button"
                className="record-card flex items-center gap-3.5"
                onClick={() => {
                  onClose();
                  if (n.hash) router.push(n.hash);
                }}
              >
                <span className="icon-tile icon-tile-sm on-grey">
                  <Icon name={NOTIF_ICON[n.tKey] || "bell"} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {t(`${n.tKey}.t`, n.params)}
                  </span>
                  <span className="block truncate text-xs muted">
                    {t(`${n.tKey}.b`, n.params)}
                  </span>
                </span>
                <span className="text-xs muted">{fmt.rel(n.ts)}</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="bell"
            text={t("pilot.notif.empty")}
          />
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------ grab action ------------------------------ */
export function useGrab() {
  const router = useRouter();
  const { t } = useI18n();
  const { pilotId, pilotName } = usePilot();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);

  return (id: string) => {
    if (!cleared(db, pilotId)) {
      router.push("/pilot/training");
      return;
    }
    const r0 = find(db.rides, id);
    if (!r0) return;
    if (r0.type === "event") {
      update((d) => {
        const r = find(d.rides, id)!;
        const free = freeTrishaw(r);
        if (free && r.pilots) r.pilots[free] = pilotId;
        if (!freeTrishaw(r)) r.status = "staffed";
        const partner = r.partnerId ? find(d.partners, r.partnerId) : undefined;
        notify(
          d,
          "admin",
          "notif.grabbed",
          { pilot: pilotName, name: partner ? partner.name : eventTitle(r, d) },
          `/admin/rides/${id}`,
        );
      });
    } else {
      update((d) => {
        const r = find(d.rides, id)!;
        r.status = "staffed";
        r.pilotId = pilotId;
        if (!r.trishawId) r.trishawId = "t1";
        if (!find(d.chats, `chat-${r.id}`)) {
          d.chats.push({
            id: `chat-${r.id}`,
            rideId: r.id,
            messages: [
              {
                from: "system",
                name: "",
                text: "",
                tKey: "chat.sysCreated",
                ts: Date.now(),
              },
            ],
          });
        }
        const client = find(d.clients, r.clientId);
        notify(
          d,
          `client:${r.clientId}`,
          "notif.pilotAssigned",
          { pilot: pilotName },
          `/passenger/rides/${r.id}`,
        );
        notify(
          d,
          "admin",
          "notif.grabbed",
          { pilot: pilotName, name: client ? client.name : "" },
          `/admin/rides/${r.id}`,
        );
      });
    }
    toast(t("pilot.grabbed"));
    router.push(`/pilot/rides/${id}`);
  };
}
