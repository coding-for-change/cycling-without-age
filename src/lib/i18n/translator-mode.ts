export const TOLGEE_API_URL = "https://app.tolgee.io";
export const TOLGEE_NAMESPACE = "app";

export const translatorModeBuilt =
  process.env.NEXT_PUBLIC_TRANSLATOR_MODE === "1" &&
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT !== "production";

export const isTranslatorMode = () =>
  translatorModeBuilt && process.env.SENTRY_ENVIRONMENT !== "production";
