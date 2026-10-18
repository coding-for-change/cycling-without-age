"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AsYouType, type CountryCode } from "libphonenumber-js";
import { authClient } from "@/lib/auth-client";
import { useCharacter } from "@/components/character";
import { dialCodeOf, looksLikePhone, parseIdentity } from "@/lib/identity";
import { haptics } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { Button } from "@/components/ui/button";
import { Step } from "../../_components/step";
import { useFlow, type FlowMode } from "../../_components/flow-state";
import { setSignUpIntentAction } from "../actions";
import { GoogleButton } from "./google-button";
import { PasskeyButton } from "./passkey-button";
import { clearOfflineCaches } from "@/lib/offline-caches";

type Strings = {
  title: string;
  titleRegister: string;
  hintRegister: string;
  noAccount: string;
  label: string;
  placeholder: string;
  changeCountry: string;
  google: string;
  passkey: string;
  separator: string;
  errors: Record<string, string>;
};

type ModeStrings = { label: string; signIn: string; register: string };

export function IdentifierStep({
  mode,
  noAccount,
  modeStrings,
  strings,
  common,
  language,
  defaultCountry,
  googleEnabled,
}: {
  mode: FlowMode;
  noAccount: boolean;
  modeStrings: ModeStrings;
  strings: Strings;
  common: { continue: string };
  language: Locale;
  defaultCountry: CountryCode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const { flow, update } = useFlow();
  const { say, oops } = useCharacter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(flow.display ?? "");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const country = (flow.country as CountryCode | null) ?? defaultCountry;
  const isPhone = looksLikePhone(value);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (isNative()) return;
        if (!(await PublicKeyCredential.isConditionalMediationAvailable?.()))
          return;
        if (cancelled) return;
        const result = await authClient.signIn.passkey({ autoFill: true });
        if (cancelled || result?.error) return;

        haptics.success();
        await clearOfflineCaches().catch(() => {});
        router.replace("/onboarding");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onChange = (next: string) => {
    setError(null);
    if (!looksLikePhone(next)) return setValue(next);

    const atEnd = input.current?.selectionStart === next.length;
    setValue(atEnd ? new AsYouType(country).input(next) : next);
  };

  const submit = () => {
    const result = parseIdentity(value, country);
    if (!result.ok) {
      haptics.error();
      oops();
      say("confus");
      setError(
        result.problem === "invalidPhone"
          ? formatMessage(
              strings.errors.invalidPhone,
              { country: dialCodeOf(country) },
              language,
            )
          : strings.errors[result.problem],
      );
      input.current?.focus();
      return;
    }

    const { channel, value: identifier } = result.identity;
    startTransition(async () => {
      await setSignUpIntentAction(mode === "register");
      const { error: sendError } =
        channel === "email"
          ? await authClient.emailOtp.sendVerificationOtp({
              email: identifier,
              type: "sign-in",
            })
          : await authClient.phoneNumber.sendOtp({ phoneNumber: identifier });

      if (sendError) {
        haptics.error();
        oops();
        say("triste");
        setError(
          sendError.status === 429
            ? strings.errors.rateLimited
            : strings.errors.generic,
        );
        return;
      }

      update({ channel, identifier, display: value, country, mode });
      router.push("/sign-in/code", { transitionTypes: ["nav-forward"] });
    });
  };

  const register = mode === "register";

  return (
    <Step
      lead={
        <ModeSwitch
          mode={mode}
          strings={modeStrings}
        />
      }
      title={
        <label htmlFor="identifier">
          {register ? strings.titleRegister : strings.title}
        </label>
      }
      description={
        noAccount ? (
          <span role="status">{strings.noAccount}</span>
        ) : register ? (
          strings.hintRegister
        ) : undefined
      }
      action={
        <div className="space-y-4">
          <Button
            disabled={pending || value.trim().length === 0}
            onClick={submit}
            variant="brand"
            size="hero"
          >
            {register ? modeStrings.register : common.continue}
          </Button>
          {register && !googleEnabled ? null : (
            <div className="space-y-3 empty:hidden">
              <p className="text-center text-sm text-ink-faint">
                {strings.separator}
              </p>
              {register ? null : <PasskeyButton label={strings.passkey} />}
              {googleEnabled && (
                <GoogleButton
                  label={strings.google}
                  register={register}
                />
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="flex items-baseline gap-3">
        {isPhone && (
          <button
            type="button"
            onClick={() => {
              update({ display: value });
              router.push("/sign-in/country", {
                transitionTypes: ["nav-forward"],
              });
            }}
            className="shrink-0 rounded-lg px-1 py-2 text-3xl font-bold tracking-tight text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            {dialCodeOf(country)}
            <span className="sr-only"> — {strings.changeCountry}</span>
          </button>
        )}
        <input
          id="identifier"
          ref={input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          type="text"
          inputMode={isPhone ? "tel" : "email"}
          autoComplete={isPhone ? "tel webauthn" : "email webauthn"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={isPhone ? "" : strings.placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "identifier-error" : undefined}
          className={cn(
            "w-full min-w-0 border-0 bg-transparent px-1 py-2 text-3xl font-bold tracking-tight",
            "text-ink placeholder:text-ink-faint focus:outline-none",
          )}
        />
      </div>
      <div
        className={cn(
          "mt-2 h-px w-full transition-colors",
          error ? "bg-red" : "bg-line",
        )}
      />
      {error && (
        <p
          id="identifier-error"
          role="alert"
          className="mt-3 text-sm text-red-ink"
        >
          {error}
        </p>
      )}
    </Step>
  );
}

/**
 * Sign in or create an account — one flow underneath, so the switch only
 * changes what the screen says and whether the code may open a new account.
 * Kept in the URL, never the identifier.
 */
function ModeSwitch({
  mode,
  strings,
}: {
  mode: FlowMode;
  strings: ModeStrings;
}) {
  const options: { value: FlowMode; href: string; label: string }[] = [
    { value: "signIn", href: "/sign-in", label: strings.signIn },
    {
      value: "register",
      href: "/sign-in?mode=register",
      label: strings.register,
    },
  ];
  return (
    <nav
      aria-label={strings.label}
      className="flex rounded-full bg-canvas-deeper p-1"
    >
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.href}
          replace
          scroll={false}
          aria-current={option.value === mode ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-medium transition-[color,background-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ink motion-reduce:transition-none",
            option.value === mode
              ? "bg-canvas text-ink shadow-soft"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
