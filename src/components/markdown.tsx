import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const DOCUMENT_DISALLOWED = [
  "img",
  "input",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
];

const VARIANT = {
  document: {
    disallowed: DOCUMENT_DISALLOWED,
    className: cn(
      "text-2sm space-y-2 [&_ol]:ml-5 [&_ul]:ml-5 [&_li]:mt-1",
      "[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold",
      "[&_blockquote]:border-current/30 [&_blockquote]:pl-3",
      "[&_hr]:border-border",
    ),
  },
  chat: {
    disallowed: [
      ...DOCUMENT_DISALLOWED,
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
    ],
    className: cn(
      "space-y-1 [&_ol]:ml-4 [&_ul]:ml-4",
      "[&_blockquote]:border-current/40 [&_blockquote]:pl-2",
      "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-current/10 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-2sm",
    ),
  },
};

const SAFE_HREF = /^(https?:|mailto:|tel:|\/(?!\/))/i;

export function RichText({
  text,
  className,
  variant = "document",
}: {
  text: string;
  className?: string;
  variant?: keyof typeof VARIANT;
}) {
  return (
    <div
      className={cn(
        "text-pretty *:last:mb-0 [&_ol]:list-decimal [&_ul]:list-disc [&_blockquote]:border-l-2",
        VARIANT[variant].className,
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        unwrapDisallowed
        disallowedElements={VARIANT[variant].disallowed}
        urlTransform={(url) => (SAFE_HREF.test(url) ? url : "")}
        components={{
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="text-2sm rounded bg-current/10 px-1 py-0.5 font-mono">
              {children}
            </code>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
