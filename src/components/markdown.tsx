import Link from "next/link";
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

type Variant = {
  disallowed: string[];
  className: string;
  localLinksInPlace?: boolean;
};

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
  legal: {
    disallowed: DOCUMENT_DISALLOWED,
    localLinksInPlace: true,
    className: cn(
      "text-base text-ink [&_p]:mt-3 [&_ol]:mt-3 [&_ol]:ml-5 [&_ul]:mt-3 [&_ul]:ml-5 [&_li]:mt-1",
      "[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold",
      "[&_a]:break-words *:first:mt-0",
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
} satisfies Record<string, Variant>;

const SAFE_HREF = /^(https?:|mailto:|tel:|\/(?!\/))/i;
const LOCAL_HREF = /^\/(?![/\\])/;

export function RichText({
  text,
  className,
  variant = "document",
}: {
  text: string;
  className?: string;
  variant?: keyof typeof VARIANT;
}) {
  const config: Variant = VARIANT[variant];
  const inPlace = config.localLinksInPlace === true;
  return (
    <div
      className={cn(
        "text-pretty *:last:mb-0 [&_ol]:list-decimal [&_ul]:list-disc [&_blockquote]:border-l-2",
        config.className,
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        unwrapDisallowed
        disallowedElements={config.disallowed}
        urlTransform={(url) => (SAFE_HREF.test(url) ? url : "")}
        components={{
          a: ({ children, href }) =>
            inPlace && href && LOCAL_HREF.test(href) ? (
              <Link
                href={href}
                className="underline underline-offset-2"
              >
                {children}
              </Link>
            ) : (
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
