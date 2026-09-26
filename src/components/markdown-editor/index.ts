export { MarkdownEditor } from "./markdown-editor";
export { HighlightedTextarea } from "./highlighted-textarea";
export { MarkdownToolbar } from "./toolbar";
export { useMarkdownTools, type MarkdownToolLabels } from "./tools";

import type { Dictionary } from "@/lib/i18n";
import type { MarkdownToolLabels } from "./tools";

export const markdownToolLabels = (dict: Dictionary): MarkdownToolLabels =>
  dict.common.markdown;
