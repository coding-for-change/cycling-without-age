"use client";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { formatMessage } from "@/lib/i18n/format";
import type { ChatThreadStrings } from "./strings";

const DOTS = [0, 1, 2];

export function typingLabel(
  names: string[],
  strings: ChatThreadStrings,
  language: string,
): string | null {
  if (names.length === 0) return null;
  if (names.length === 1)
    return formatMessage(strings.typingOne, { name: names[0] }, language);
  if (names.length === 2)
    return formatMessage(
      strings.typingTwo,
      { first: names[0], second: names[1] },
      language,
    );
  return formatMessage(
    strings.typingMany,
    { first: names[0], count: names.length - 1 },
    language,
  );
}

export function TypingIndicator({
  names,
  strings,
  language,
  showNames = false,
}: {
  names: string[];
  strings: ChatThreadStrings;
  language: string;
  showNames?: boolean;
}) {
  const label = typingLabel(names, strings, language);
  if (!label) return null;

  return (
    <div className="flex flex-col gap-1">
      {showNames ? (
        <span className="px-3 text-xs text-ink-soft">{label}</span>
      ) : null}
      <Bubble variant="secondary">
        <BubbleContent className="bg-canvas-deep text-ink">
          <span className="sr-only">{label}</span>
          <span
            aria-hidden
            className="flex items-center gap-1 py-1"
          >
            {DOTS.map((dot) => (
              <span
                key={dot}
                className="size-1.5 animate-bounce rounded-full bg-ink-faint motion-reduce:animate-none"
                style={{ animationDelay: `${dot * 140}ms` }}
              />
            ))}
          </span>
        </BubbleContent>
      </Bubble>
    </div>
  );
}
