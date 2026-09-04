# 10 — Languages, countries and rollout phases

## Rollout

| Phase | Date | Countries | Languages to add |
| --- | --- | --- | --- |
| **Phase 1** | **January 2026** | Denmark, Netherlands, Belgium, United Kingdom, Ireland, United States, Canada, Portugal, Hungary, Slovakia, Spain, Sweden, Australia, New Zealand, Germany, Austria — **16** | Danish, Dutch, English, French, German, Hungarian, Portuguese, Slovakian, Spanish, Swedish — **10** |
| **Phase 2** | **March 2027** | Switzerland, France, Norway, Poland, Finland — **5** | Finnish, Norwegian, Polish — **3** |

Phase 1 is **16 countries in 10 languages**. Note the asymmetries:

- **Belgium** needs Dutch *and* French; **Switzerland** (phase 2) needs German, French and Italian in
  practice — Italian is on neither list. Flag it rather than assuming.
- **French is a phase-1 language but France is a phase-2 country** — French is there for Belgium and
  Canada.
- **English covers five countries** with genuinely different conventions (UK, Ireland, US, Canada,
  Australia, New Zealand). Language ≠ region.

## Two independent axes

[NFR 7](08-non-functional-requirements.md#nfr-7) asks for **language**: field labels, **error
messages**, and **master data in dropdowns**. [NFR 8](08-non-functional-requirements.md#nfr-8) asks
for **culture**: decimal numbers, currencies, dates and times formatted by the user's culture,
*"usually defined by a country of residence."*

So a Danish speaker living in Canada gets Danish words and Canadian notation. The codebase already
models this correctly: `src/lib/i18n` carries the words
(`en`/`da`/`de`), `src/lib/format.ts` carries the notation
(`en-US`/`en-GB`/`de-DE`/`da-DK`). **Do not collapse them into one locale string.**

### Master data is translatable too

This is the requirement most often missed. Dropdown contents — role labels, cancellation reason codes,
bike types, residence types — are content, not code. Combine with process requirement
ID 115 (*Configure Chapter Nomenclature — alternate
labels, e.g. role names*) and the conclusion is: **a chapter can rename a role, and that renamed label
must then be translatable per language.** Any design that hardcodes role names in the dictionary
breaks this.

## GDPR

[NFR 10](08-non-functional-requirements.md#nfr-10) scopes GDPR to *"countries in scope"* — but phase 1
includes the US, Canada, Australia and New Zealand alongside the EU/EEA and the UK. In practice: build
to GDPR everywhere; the EU set is the strictest and the non-EU countries do not conflict with it.
