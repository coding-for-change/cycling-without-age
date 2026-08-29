"use client";

/* The shared sign-in machinery — both mobile apps run the exact same flow with
   their own copy and art:  welcome → (passkey | phone → one-time code) → app.
   The mock is honest about the real thing: the passkey ceremony has a verify
   moment, the SMS code arrives and autofills digit by digit. cfg.keys remaps
   any shared auth.* string so the pilot app can speak du-form. */

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/lib/ui";
import { Hero } from "@/lib/art";
import { Icon } from "@/components/Icon";
import { BrandLockup } from "@/components/chrome";
import { LangMenu, BtnHero } from "@/components/bits";

export interface LoginFlowProps {
  art: string;
  title: string;
  sub: string;
  passkeyHint: string;
  signupLabel: string;
  onSignup: () => void;
  code: string; // demo one-time code, e.g. "428 315"
  phone: string; // pre-filled demo phone
  onLogin: () => void;
  /** remap shared auth.* keys (pilot app speaks du-form via pauth.*) */
  keys?: Record<string, string>;
}

type Stage =
  | { name: "welcome" }
  | { name: "passkey"; ok: boolean }
  | { name: "phone" }
  | { name: "code" }
  | { name: "celebrate" };

export function OtpRow({
  digits,
  onChange,
  onComplete,
  error,
}: {
  digits: string[];
  onChange: (d: string[]) => void;
  onComplete: (code: string) => void;
  error?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && rowRef.current) {
      rowRef.current.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-8px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 260 },
      );
    }
  }, [error]);

  useEffect(() => {
    if (!digits.some(Boolean)) setTimeout(() => refs.current[0]?.focus(), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDigit(i: number, v: string) {
    const next = [...digits];
    next[i] = v;
    onChange(next);
    if (v && refs.current[i + 1]) refs.current[i + 1]?.focus();
    if (next.filter(Boolean).length === 6) onComplete(next.join(""));
  }

  return (
    <div
      className="otp-row"
      ref={rowRef}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`otp-box${digits[i] ? " filled" : ""}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete="one-time-code"
          aria-label={String(i + 1)}
          value={digits[i] || ""}
          onChange={(e) =>
            setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))
          }
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && refs.current[i - 1]) {
              refs.current[i - 1]?.focus();
              const next = [...digits];
              next[i - 1] = "";
              onChange(next);
            }
          }}
          onPaste={(e) => {
            const txt = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, 6);
            if (!txt) return;
            e.preventDefault();
            const next = txt.split("");
            while (next.length < 6) next.push("");
            onChange(next);
            if (txt.length === 6) onComplete(txt);
          }}
        />
      ))}
    </div>
  );
}

export function LoginFlow(cfg: LoginFlowProps) {
  const { t } = useI18n();
  const K = (name: string) => (cfg.keys && cfg.keys[name]) || name;
  const [stage, setStage] = useState<Stage>({ name: "welcome" });
  const [phone, setPhone] = useState(cfg.phone);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  /* passkey ceremony: verify → confirmed → in */
  useEffect(() => {
    if (stage.name !== "passkey") return;
    if (!stage.ok) later(() => setStage({ name: "passkey", ok: true }), 1300);
    else later(cfg.onLogin, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /* SMS autofill playback — the digits drop in one by one, like a real phone */
  useEffect(() => {
    if (stage.name !== "code" || digits.some(Boolean) || error) return;
    const chars = cfg.code.replace(/\s/g, "").split("");
    let i = 0;
    const tick = () => {
      i++;
      setDigits((prev) => {
        const next = [...prev];
        for (let k = 0; k < i; k++) next[k] = chars[k];
        return next;
      });
      if (i < 6) later(tick, 110);
      else later(() => complete(chars.join("")), 150);
    };
    later(tick, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, error]);

  function complete(entered: string) {
    if (entered !== cfg.code.replace(/\s/g, "")) {
      setError(true);
      setDigits(["", "", "", "", "", ""]);
      return;
    }
    setStage({ name: "celebrate" });
    later(cfg.onLogin, 1200);
  }

  if (stage.name === "passkey") {
    return (
      <div className="auth-screen items-center justify-center gap-6 text-center">
        <div className={`passkey-orb${stage.ok ? " ok" : ""}`}>
          <Icon name={stage.ok ? "check" : "key"} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="display display-sm">
            {t(K(stage.ok ? "auth.welcomeBack" : "auth.verifying"))}
          </div>
          {!stage.ok && <p className="muted">{cfg.passkeyHint}</p>}
        </div>
      </div>
    );
  }

  if (stage.name === "celebrate") {
    return (
      <div className="auth-screen items-center justify-center gap-4 text-center">
        <div className="w-[min(20rem,80%)]">
          <Hero name="celebrate" />
        </div>
        <div className="display display-sm">{t(K("auth.welcomeBack"))}</div>
      </div>
    );
  }

  if (stage.name === "phone") {
    return (
      <div className="auth-screen gap-6">
        <div className="flex items-center py-2">
          <button
            type="button"
            className="icon-pill"
            aria-label={t("common.back")}
            onClick={() => setStage({ name: "welcome" })}
          >
            <Icon name="arrowLeft" />
          </button>
        </div>
        <div className="reveal flex flex-col gap-2">
          <div className="display display-sm">{t(K("auth.phoneTitle"))}</div>
          <p className="muted">{t(K("auth.phoneSub"))}</p>
        </div>
        <div
          className="field reveal"
          style={{ ["--i" as string]: 1 }}
        >
          <label
            className="label"
            htmlFor="ph-in"
          >
            {t("common.phone")}
          </label>
          <input
            id="ph-in"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <BtnHero
          className="reveal"
          style={{ ["--i" as string]: 2 }}
          label={t(K("auth.sendCode"))}
          disabled={phone.replace(/\D/g, "").length < 6}
          onClick={() => {
            setDigits(["", "", "", "", "", ""]);
            setError(false);
            setStage({ name: "code" });
          }}
        />
      </div>
    );
  }

  if (stage.name === "code") {
    return (
      <div className="auth-screen gap-6">
        <div className="flex items-center py-2">
          <button
            type="button"
            className="icon-pill"
            aria-label={t("common.back")}
            onClick={() => setStage({ name: "phone" })}
          >
            <Icon name="arrowLeft" />
          </button>
        </div>
        <div className="reveal flex flex-col gap-2">
          <div className="display display-sm">{t(K("auth.codeTitle"))}</div>
          <p className="muted">{t(K("auth.codeSub"), { phone })}</p>
        </div>
        <div
          className="reveal"
          style={{ ["--i" as string]: 1 }}
        >
          <OtpRow
            digits={digits}
            onChange={setDigits}
            onComplete={complete}
            error={error}
          />
        </div>
        {error && (
          <p className="text-center text-sm font-bold">
            {t(K("auth.wrongCode"))}
          </p>
        )}
        <div
          className="reveal text-center"
          style={{ ["--i" as string]: 2 }}
        >
          <span className="code-hint">
            <Icon name="mail" />
            {t(K("auth.codeDemo"), { code: cfg.code })}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-block reveal"
          style={{ ["--i" as string]: 3 }}
          onClick={() => {
            setDigits(["", "", "", "", "", ""]);
            setError(false);
            toast(t(K("auth.resent")), "info");
          }}
        >
          {t(K("auth.resend"))}
        </button>
      </div>
    );
  }

  /* welcome */
  return (
    <div className="auth-screen">
      <div className="flex items-center justify-between py-2">
        <BrandLockup />
        <LangMenu />
      </div>
      <div className="auth-art reveal">
        <Hero name={cfg.art} />
      </div>
      <div className="flex flex-1 flex-col gap-5">
        <div
          className="reveal flex flex-col gap-2"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="display">{cfg.title}</div>
          <p className="muted">{cfg.sub}</p>
        </div>
        <div
          className="reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 2 }}
        >
          <BtnHero
            label={t(K("auth.passkey"))}
            sub={cfg.passkeyHint}
            icon="key"
            onClick={() => setStage({ name: "passkey", ok: false })}
          />
          <button
            type="button"
            className="btn btn-outline btn-lg btn-block"
            onClick={() => setStage({ name: "phone" })}
          >
            <Icon name="phone" />
            {t(K("auth.usePhone"))}
          </button>
        </div>
        <div
          className="reveal flex items-center gap-3"
          style={{ ["--i" as string]: 3 }}
        >
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs muted">{t(K("auth.or"))}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-lg btn-block reveal"
          style={{ ["--i" as string]: 4 }}
          onClick={cfg.onSignup}
        >
          <Icon name="plus" />
          {cfg.signupLabel}
        </button>
        <p
          className="reveal text-center text-xs muted"
          style={{ ["--i" as string]: 5 }}
        >
          {t(K("auth.terms"))}
        </p>
      </div>
    </div>
  );
}
