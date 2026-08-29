import { reg } from "./engine";
import { common } from "./common";
import { shared } from "./shared";

reg(common);
reg(shared);

export { reg, t, fmt, useI18n, useLangStore, bootLang, LANGS } from "./engine";
export type { Lang, Dict } from "./engine";
