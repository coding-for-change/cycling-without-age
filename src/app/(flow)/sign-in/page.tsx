import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guards";
import { readJoinPreset } from "@/lib/join-preset";
import { resolveDestination } from "@/use-cases/onboarding-progress";
import { getDictionary } from "@/lib/i18n";
import { resolveLocale } from "@/lib/format";
import { defaultCountryFor } from "@/lib/identity";
import { IdentifierStep } from "./_components/identifier-step";
import { StepSkeleton } from "../_components/step";
import { StepTransition } from "../_components/step-transition";

export default function SignInPage() {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <Identifier />
      </Suspense>
    </StepTransition>
  );
}

/* The notation locale carries a region (`de-DE` → DE), which is enough to open
   the phone field on the right country prefix without asking. Resolved here on
   the server; reading navigator.language during render would disagree with it. */
async function Identifier() {
  // Someone already signed in has no business on a sign-in screen — reaching it
  // by back button or a stale bookmark forwards them to wherever they belong.
  // Only this exact route: `/sign-in/code` and `/sign-in/role` are steps of the
  // flow and a session is expected there.
  const session = await getSession();
  if (session)
    redirect(await resolveDestination(session, await readJoinPreset()));

  const [dict, head] = await Promise.all([getDictionary(), headers()]);
  const locale = resolveLocale(head.get("accept-language"));

  return (
    <IdentifierStep
      strings={dict.signIn.identifier}
      common={dict.common}
      defaultCountry={defaultCountryFor(locale)}
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
    />
  );
}
