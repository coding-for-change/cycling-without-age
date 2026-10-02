import { IntlMessageFormat } from "intl-messageformat";

export type MessageValues = Record<string, string | number>;

const compiled = new Map<string, IntlMessageFormat>();

export function formatMessage(
  template: string,
  values: MessageValues,
  locale: string,
): string {
  const id = `${locale}\u0000${template}`;
  let format = compiled.get(id);
  if (!format) {
    format = new IntlMessageFormat(template, locale);
    compiled.set(id, format);
  }
  return String(format.format(values));
}
