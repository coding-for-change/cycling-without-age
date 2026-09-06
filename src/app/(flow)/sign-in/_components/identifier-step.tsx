"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AsYouType, type CountryCode } from "libphonenumber-js";
import { authClient } from "@/lib/auth-client";
import { useCharacter } from "@/components/character";
import { dialCodeOf, looksLikePhone, parseIdentity } from "@/lib/identity";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Step } from "../../_components/step";
import { useFlow } from "../../_components/flow-state";
import { GoogleButton } from "./google-button";
import { PasskeyButton } from "./passkey-button";

type Strings = {
  title: string;
  label: string;
  placeholder: string;
  changeCountry: string;
  google: string;
  passkey: string;
  separator: string;
  errors: Record<string, string>;
};

export function IdentifierStep({
  strings,
  common,
  defaultCountry,
  googleEnabled,
}: {
  strings: Strings;
  common: { continue: string };
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
        if (!(await PublicKeyCredential.isConditionalMediationAvailable?.()))
          return;
        if (!cancelled) await authClient.signIn.passkey({ autoFill: true });
      } catch {
        // No passkey enrolled, or the browser declined. Typing still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          ? strings.errors.invalidPhone.replace(
              "{country}",
              dialCodeOf(country),
            )
          : strings.errors[result.problem],
      );
      input.current?.focus();
      return;
    }

    const { channel, value: identifier } = result.identity;
    startTransition(async () => {
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

      update({ channel, identifier, display: value, country });
      router.push("/sign-in/code", { transitionTypes: ["nav-forward"] });
    });
  };

  return (
    <Step
      title={<label htmlFor="identifier">{strings.title}</label>}
      action={
        <div className="space-y-4">
          <Button
            size="lg"
            disabled={pending || value.trim().length === 0}
            onClick={submit}
            className="h-14 w-full rounded-full bg-red text-base text-white hover:bg-red-hover disabled:bg-grey-tint disabled:text-ink-faint"
          >
            {common.continue}
          </Button>
          {}
          <div className="space-y-3 empty:hidden">
            <p className="text-center text-sm text-ink-faint">
              {strings.separator}
            </p>
            <PasskeyButton label={strings.passkey} />
            {googleEnabled && <GoogleButton label={strings.google} />}
          </div>
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
          className="mt-3 text-sm text-red"
        >
          {error}
        </p>
      )}
    </Step>
  );
}
