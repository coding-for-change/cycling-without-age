"use client";

import {
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  type UIEvent,
} from "react";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_CLASS, tokenize } from "./highlight";

type TextareaProps = Omit<
  ComponentProps<"textarea">,
  "value" | "onChange" | "onScroll"
>;

export function HighlightedTextarea({
  ref,
  value,
  onChange,
  fieldClassName,
  className,
  control: Control = "textarea",
  ...props
}: Omit<TextareaProps, "ref"> & {
  ref: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  fieldClassName: string;
  control?: "textarea" | ((props: ComponentProps<"textarea">) => ReactNode);
}) {
  const mirror = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [ref, value]);

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (mirror.current)
      mirror.current.scrollTop = event.currentTarget.scrollTop;
  };

  return (
    <div className="relative w-full">
      <pre
        ref={mirror}
        aria-hidden
        className={cn(
          fieldClassName,
          "pointer-events-none absolute inset-0 overflow-hidden font-sans text-ink",
        )}
      >
        {tokenize(value).map((token, index) => (
          <span
            key={index}
            className={HIGHLIGHT_CLASS[token.type]}
          >
            {token.value}
          </span>
        ))}
        {"\n"}
      </pre>
      <Control
        {...props}
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        className={cn(
          fieldClassName,
          "relative overflow-y-auto bg-transparent text-transparent caret-ink placeholder:text-ink-faint",
          className,
        )}
      />
    </div>
  );
}
