import { defaultLocale, hasLocale, type Locale } from "./locales";

export type ReportProblemStrings = {
  title: string;
  description: string;
  placeholder: string;
  submit: string;
  cancel: string;
  tooShort: string;
  done: string;
  failed: string;
};

export type ErrorStrings = {
  title: string;
  body: string;
  errorId: string;
  retry: string;
  report: string;
  drawer: ReportProblemStrings;
};

const en: ErrorStrings = {
  title: "The chain came off",
  body: "This page stopped mid-ride. Try again — and if it keeps happening, tell us what you were doing.",
  errorId: "Error ID: {id}",
  retry: "Try again",
  report: "Tell us what happened",
  drawer: {
    title: "Tell us what happened",
    description:
      "A sentence or two is plenty. It goes straight to the people who can fix it.",
    placeholder: "I tapped Save on my profile and the screen went blank.",
    submit: "Send it",
    cancel: "Cancel",
    tooShort: "A few more words, please — at least ten characters.",
    done: "Thank you. That helps more than you'd think.",
    failed: "That didn't send. Try again in a moment.",
  },
};

const de: ErrorStrings = {
  title: "Die Kette ist abgesprungen",
  body: "Diese Seite ist mitten in der Fahrt stehen geblieben. Noch einmal versuchen — und wenn es wieder passiert, gern kurz Bescheid geben.",
  errorId: "Fehler-ID: {id}",
  retry: "Noch einmal versuchen",
  report: "Erzählen, was passiert ist",
  drawer: {
    title: "Was ist passiert?",
    description:
      "Ein, zwei Sätze reichen völlig. Sie landen direkt bei den Leuten, die es reparieren.",
    placeholder:
      "Im Profil auf Speichern getippt, dann war der Bildschirm leer.",
    submit: "Abschicken",
    cancel: "Abbrechen",
    tooShort: "Ein paar Worte mehr bitte — mindestens zehn Zeichen.",
    done: "Danke. Das hilft mehr, als man denkt.",
    failed: "Das ging nicht raus. Gleich noch einmal versuchen.",
  },
};

const da: ErrorStrings = {
  title: "Kæden røg af",
  body: "Siden gik i stå midt i turen. Prøv igen — og sker det igen, så fortæl os gerne, hvad du lavede.",
  errorId: "Fejl-ID: {id}",
  retry: "Prøv igen",
  report: "Fortæl hvad der skete",
  drawer: {
    title: "Hvad skete der?",
    description:
      "En sætning eller to er rigeligt. Den går direkte til dem, der kan rette det.",
    placeholder: "Jeg trykkede Gem på min profil, og så blev skærmen tom.",
    submit: "Send",
    cancel: "Annuller",
    tooShort: "Et par ord mere, tak — mindst ti tegn.",
    done: "Tak. Det hjælper mere, end du tror.",
    failed: "Det blev ikke sendt. Prøv igen om lidt.",
  },
};

const ERROR_STRINGS: Record<Locale, ErrorStrings> = { en, de, da };

const normalise = (value: string | null | undefined): Locale | null => {
  const candidate = (value ?? "").slice(0, 2).toLowerCase();
  return hasLocale(candidate) ? candidate : null;
};

// The root boundary replaces <html>, so its lang attribute is back to the
// default — the cookie is the only locale that survives a global error.
export function currentErrorLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const cookie = /(?:^|;\s*)NEXT_LOCALE=([^;]*)/.exec(document.cookie)?.[1];
  return (
    normalise(cookie ? decodeURIComponent(cookie) : null) ??
    normalise(document.documentElement.lang) ??
    normalise(navigator.language) ??
    defaultLocale
  );
}

export const errorStrings = (
  locale: Locale = currentErrorLocale(),
): ErrorStrings => ERROR_STRINGS[locale];
