"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Step } from "../../_components/step";
import { useFlow } from "../../_components/flow-state";

const RESEND_AFTER_MS = 30_000;

type Strings = {
  title: string;
  sentToEmail: string;
  sentToPhone: string;
  label: string;
  resend: string;
  resendWait: string;
  resent: string;
  change: string;
  errors: Record<string, string>;
};

export function CodeStep({ strings }: { strings: Strings }) {
  const router = useRouter();
  const { flow, update } = useFlow();
  const { say, oops } = useCharacter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [pending, startTransition] = useTransition();

  const { channel, identifier, display } = flow;

  useEffect(() => {
    if (!identifier) router.replace("/sign-in");
  }, [identifier, router]);

  useEffect(() => {
    const timer = setTimeout(() => setCanResend(true), RESEND_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!identifier || !channel) return <Step title={strings.title} />;

  const failWith = (key: string) => {
    haptics.error();
    oops();
    say("triste");
    setError(strings.errors[key] ?? strings.errors.generic);
    setCode("");
  };

  const verify = (value: string) => {
    setError(null);
    startTransition(async () => {
      const { error: verifyError } =
        channel === "email"
          ? await authClient.signIn.emailOtp({ email: identifier, otp: value })
          : await authClient.phoneNumber.verify({
              phoneNumber: identifier,
              code: value,
            });

      if (verifyError) {
        return failWith(
          verifyError.status === 429
            ? "rateLimited"
            : verifyError.status === 400
              ? "invalid"
              : "generic",
        );
      }

      haptics.success();
      say("heureux", 4000);
      update({ role: null });
      router.replace("/onboarding");
    });
  };

  const resend = () => {
    setCanResend(false);
    setError(null);
    startTransition(async () => {
      const { error: sendError } =
        channel === "email"
          ? await authClient.emailOtp.sendVerificationOtp({
              email: identifier,
              type: "sign-in",
            })
          : await authClient.phoneNumber.sendOtp({ phoneNumber: identifier });
      if (sendError) return failWith("generic");
      setNotice(strings.resent);
      setTimeout(() => setCanResend(true), RESEND_AFTER_MS);
    });
  };

  return (
    <Step
      title={strings.title}
      description={fill(
        channel === "email" ? strings.sentToEmail : strings.sentToPhone,
        { identifier: display ?? identifier },
      )}
      action={
        <div className="space-y-3 text-center">
          <Button
            variant="ghost"
            disabled={!canResend || pending}
            onClick={resend}
            className="h-12 w-full rounded-full text-base"
          >
            {canResend ? strings.resend : strings.resendWait}
          </Button>
          <Button
            variant="link"
            onClick={() => router.replace("/sign-in")}
            className="h-11 w-full text-base text-ink-soft"
          >
            {strings.change}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <label
          htmlFor="code"
          className="sr-only"
        >
          {strings.label}
        </label>
        <InputOTP
          id="code"
          maxLength={6}
          value={code}
          disabled={pending}
          onChange={(next) => {
            setError(null);
            setCode(next);
            if (next.length === 6) verify(next);
          }}
          autoFocus
          // Explicit although input-otp already defaults to both: SMS
          // auto-fill on iOS and Android is an acceptance criterion, not an
          // implementation detail to inherit silently.
          autoComplete="one-time-code"
          inputMode="numeric"
          containerClassName="gap-2"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "code-error" : undefined}
        >
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-13 rounded-xl border border-line text-2xl font-bold first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-ink data-[active=true]:ring-0"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && (
          <p
            id="code-error"
            role="alert"
            className="mt-4 text-sm text-red"
          >
            {error}
          </p>
        )}
        {!error && notice && (
          <p
            role="status"
            className="mt-4 text-sm text-ink-soft"
          >
            {notice}
          </p>
        )}
      </div>
    </Step>
  );
}
