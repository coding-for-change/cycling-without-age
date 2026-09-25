import type { Locale } from "./locales";
import type { Dictionary } from "./messages";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Dictionary;
  }
}
