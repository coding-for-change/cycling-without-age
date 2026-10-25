"use client";

import { useRouter } from "next/navigation";
import { useId, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { haptics } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { LEGAL_DOCUMENTS, legalHref, type LegalDocument } from "@/lib/legal";
import { cn } from "@/lib/utils";

export function Agreement({
  checked,
  onCheckedChange,
  optional = false,
  required = false,
  className,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-(--r-card) border p-3.5 transition-colors",
        optional && "border-dashed",
        checked
          ? "border-transparent bg-mint-tint"
          : "border-line bg-canvas hover:bg-canvas-deep",
        className,
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => {
          haptics.selectionChanged();
          onCheckedChange(next === true);
        }}
        aria-labelledby={labelId}
        aria-required={required || undefined}
        className="mt-0.5 size-5 rounded-[6px]"
      />
      <span
        id={labelId}
        className={cn(
          "text-sm leading-normal",
          optional ? "text-ink-soft" : "text-ink",
        )}
      >
        {children}
        {required ? (
          <span
            aria-hidden
            className="text-ink-soft"
          >
            {" *"}
          </span>
        ) : null}
      </span>
    </label>
  );
}

const PLACEHOLDER = new RegExp(
  `(${LEGAL_DOCUMENTS.map((document) => `\\{${document}\\}`).join("|")})`,
);

export function LegalLinked({
  text,
  labels,
}: {
  text: string;
  labels: Partial<Record<LegalDocument, string>>;
}) {
  const router = useRouter();
  return text.split(PLACEHOLDER).map((part, index) => {
    const document = LEGAL_DOCUMENTS.find((name) => part === `{${name}}`);
    if (!document) return part;
    return (
      <a
        key={index}
        href={legalHref(document)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => {
          event.stopPropagation();
          if (!isNative()) return;
          event.preventDefault();
          router.push(event.currentTarget.pathname);
        }}
        className="underline underline-offset-2 hover:text-ink"
      >
        {labels[document] ?? part}
      </a>
    );
  });
}
