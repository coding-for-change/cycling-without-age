import { IntlMessageFormat } from "intl-messageformat";

export type MessageValues = Record<string, string | number>;

export const COMPILED_CACHE_SIZE = 2000;

const compiled = new Map<string, IntlMessageFormat>();

function compile(template: string, locale: string): IntlMessageFormat {
  const id = `${locale}\u0000${template}`;
  const cached = compiled.get(id);
  if (cached) {
    compiled.delete(id);
    compiled.set(id, cached);
    return cached;
  }
  const format = new IntlMessageFormat(template, locale);
  compiled.set(id, format);
  if (compiled.size > COMPILED_CACHE_SIZE)
    compiled.delete(compiled.keys().next().value as string);
  return format;
}

export const compiledCacheSize = () => compiled.size;

export function formatMessage(
  template: string,
  values: MessageValues,
  locale: string,
): string {
  return String(compile(template, locale).format(values));
}
