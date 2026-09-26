import en from "@/messages/app/en.json";
import da from "@/messages/app/da.json";
import de from "@/messages/app/de.json";
import type { Locale } from "./locales";
import { isTranslatorMode } from "./translator-mode";

export type Dictionary = typeof en;

const messages: Record<Locale, Dictionary> = { en, da, de };

export async function loadMessages(locale: Locale): Promise<Dictionary> {
  if (!isTranslatorMode()) return messages[locale];
  const { liveMessages } = await import("./translator-messages");
  return liveMessages(locale, messages[locale]);
}
