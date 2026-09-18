"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const DISALLOWED = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "input",
  "hr",
];

export function ChatMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-1 text-pretty *:last:mb-0 [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-current/40 [&_blockquote]:pl-2",
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        unwrapDisallowed
        disallowedElements={DISALLOWED}
        components={{
          a: ({ children, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children, ...props }) => (
            <code
              {...props}
              className="rounded bg-current/10 px-1 py-0.5 font-mono text-2sm"
            >
              {children}
            </code>
          ),
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="overflow-x-auto rounded-md bg-current/10 p-2 font-mono text-2sm"
            >
              {children}
            </pre>
          ),
          p: ({ children, ...props }) => (
            <p
              {...props}
              className="text-pretty"
            >
              {children}
            </p>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
