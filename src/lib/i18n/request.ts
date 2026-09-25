import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./index";
import { hasLocale } from "./locales";
import { loadMessages } from "./messages";

export default getRequestConfig(async ({ locale: requested }) => {
  const locale =
    requested && hasLocale(requested) ? requested : await getLocale();
  return { locale, messages: await loadMessages(locale) };
});
