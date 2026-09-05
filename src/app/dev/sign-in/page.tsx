"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function DevSignInPage() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [status, setStatus] = useState("");

  const report = (
    label: string,
    error: { message?: string; status?: number } | null,
  ) =>
    setStatus(
      error
        ? `${label} failed: ${error.message ?? `status ${error.status}`}`
        : `${label} ok`,
    );

  return (
    <main>
      <h1>Dev sign-in (COD-157, deleted with COD-160)</h1>
      <p>{status}</p>

      <h2>Email OTP</h2>
      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={async () => {
          const { error } = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "sign-in",
          });
          report("email send", error);
        }}
      >
        Send email code
      </button>
      <input
        placeholder="code"
        value={emailCode}
        onChange={(e) => setEmailCode(e.target.value)}
      />
      <button
        onClick={async () => {
          const { error } = await authClient.signIn.emailOtp({
            email,
            otp: emailCode,
          });
          report("email verify", error);
        }}
      >
        Verify email code
      </button>

      <h2>Phone OTP</h2>
      <input
        type="tel"
        placeholder="+4512345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        onClick={async () => {
          const { error } = await authClient.phoneNumber.sendOtp({
            phoneNumber: phone,
          });
          report("phone send", error);
        }}
      >
        Send phone code
      </button>
      <input
        placeholder="code"
        value={phoneCode}
        onChange={(e) => setPhoneCode(e.target.value)}
      />
      <button
        onClick={async () => {
          const { error } = await authClient.phoneNumber.verify({
            phoneNumber: phone,
            code: phoneCode,
          });
          report("phone verify", error);
        }}
      >
        Verify phone code
      </button>

      <h2>Google</h2>
      <button
        onClick={async () => {
          const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/dev/sign-in",
          });
          if (error) report("google", error);
        }}
      >
        Sign in with Google
      </button>

      <h2>Session</h2>
      <pre>{isPending ? "loading..." : JSON.stringify(session, null, 2)}</pre>
      <button
        onClick={async () => {
          const { error } = await authClient.signOut();
          report("sign out", error);
        }}
      >
        Sign out
      </button>
    </main>
  );
}
