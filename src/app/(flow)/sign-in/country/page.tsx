import { Suspense } from "react";
import { headers } from "next/headers";
import { getDictionary, getLocale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/format";
import { defaultCountryFor } from "@/lib/identity";
import { CountryStep } from "../_components/country-step";
import { StepSkeleton } from "../../_components/step";
import { StepTransition } from "../../_components/step-transition";

export default function CountryPage() {
  return (
    <StepTransition>
      <Suspense fallback={<StepSkeleton />}>
        <Country />
      </Suspense>
    </StepTransition>
  );
}

/* Two locales, deliberately: `words` picks the dictionary, `notation` carries a
   region and so decides both the opening country and how names collate. */
async function Country() {
  const [dict, words, head] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const notation = resolveLocale(head.get("accept-language"));

  return (
    <CountryStep
      strings={dict.signIn.country}
      common={dict.common}
      locale={words}
      defaultCountry={defaultCountryFor(notation)}
    />
  );
}
