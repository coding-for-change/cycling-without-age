"use client";

/* Demo launcher: the front door of the client presentation. Persona tiles,
   the golden-path script, and a way to replay the sign-in flows.

   Ported from book2go-mockup. Scoped to the core golden-path apps for this
   pass — the WhatsApp bot and global multi-country admin views are deferred
   to a follow-up branch, so the WhatsApp tile is intentionally omitted here. */

import "./launcher-i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { auth, type Persona } from "@/lib/auth";
import { Hero } from "@/lib/art";
import { AppBoot } from "@/components/AppBoot";
import { BrandDot } from "@/components/chrome";
import { LangMenu, rev } from "@/components/bits";
import { Icon } from "@/components/Icon";

const personas: {
  href: string;
  icon: string;
  t: string;
  s: string;
  tone: string;
  persona?: Persona;
}[] = [
  {
    href: "/passenger",
    icon: "armchair",
    t: "idx.pax",
    s: "idx.paxSub",
    tone: "tile-mint",
    persona: "passenger",
  },
  {
    href: "/pilot",
    icon: "bike",
    t: "idx.pilot",
    s: "idx.pilotSub",
    tone: "tile-mint-solid",
    persona: "pilot",
  },
  {
    href: "/admin",
    icon: "dashboard",
    t: "idx.admin",
    s: "idx.adminSub",
    tone: "tile-grey",
  },
];

function Launcher() {
  const { t } = useI18n();
  const router = useRouter();
  const reset = useStore((s) => s.reset);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-6 pt-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandDot />
          <div>
            <div className="hero-head-title">{t("brand")}</div>
            <div className="hero-head-sub">{t("idx.kicker")}</div>
          </div>
        </div>
        <LangMenu />
      </div>

      {/* black hero block — white type, art line work flipped for the dark ground */}
      <div
        className="reveal relative overflow-hidden rounded-[2rem] bg-mint-deep p-8 text-white"
        style={{ ["--art-ink" as string]: "#fff" }}
      >
        <div className="relative z-10 max-w-[26rem]">
          <div
            className="display"
            style={{ fontSize: "clamp(2rem, 7vw, 3.25rem)" }}
          >
            {t("idx.title")}
          </div>
          <p className="mt-4 opacity-80">{t("idx.sub")}</p>
        </div>
        <div className="pointer-events-none absolute -right-8 -bottom-4 hidden w-[22rem] max-w-[55%] opacity-95 sm:block">
          <Hero name="trishaw" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {personas.map((p, i) => (
          <div
            key={p.href}
            {...rev(i + 1)}
          >
            <div className={`tile ${p.tone} flex h-full flex-col gap-3.5`}>
              <div className="flex items-center gap-3">
                <span className="icon-tile on-ink">
                  <Icon name={p.icon} />
                </span>
                <span className="font-display text-xl font-extrabold">
                  {t(p.t)}
                </span>
              </div>
              <p className="flex-1 text-sm opacity-80">{t(p.s)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={p.href}
                  className="btn btn-ink"
                >
                  {t("idx.open")} <Icon name="arrowRight" />
                </Link>
                {p.persona && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      auth.replay(p.persona!);
                      router.push(p.href);
                    }}
                  >
                    <Icon name="key" />
                    {t("idx.fromLogin")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile on-mint">
            <Icon name="sparkles" />
          </span>
          <span className="h2">{t("idx.golden")}</span>
        </div>
        <div className="flex flex-col gap-3">
          {["idx.g1", "idx.g2", "idx.g3", "idx.g4", "idx.g5"].map((k, i) => (
            <div
              key={k}
              className="flex items-center gap-3.5"
            >
              <span
                className="av"
                style={{ background: "var(--mint-deep)", color: "#fff" }}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-sm">{t(k)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="alert alert-mint">
        <Icon name="info" />
        <div>
          <div>{t("idx.tip")}</div>
          <div className="mt-2 text-sm muted">{t("idx.langs")}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm muted">{t("idx.resetSub")}</div>
        <button
          type="button"
          className="btn btn-destructive-outline"
          onClick={reset}
        >
          <Icon name="reset" />
          {t("idx.reset")}
        </button>
      </div>
    </div>
  );
}

export default function LauncherPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <AppBoot>
        <Launcher />
      </AppBoot>
      <SloganBar />
    </main>
  );
}

function SloganBar() {
  const { t } = useI18n();
  return <div className="slogan-bar mt-auto">{t("common.slogan")}</div>;
}
