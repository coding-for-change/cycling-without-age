"use client";

import { Suspense, use } from "react";
import { ChevronLeft } from "lucide-react";
import {
  LegalDocumentView,
  LegalDocumentViewSkeleton,
} from "@/components/legal-document-view";
import { Button } from "@/components/ui/button";
import { editionLine } from "@/lib/legal";
import { openLegalDocument, type OpenLegalDocument } from "./account-state";
import type { AccountData } from "./types";

export function LegalDocumentPane({
  legalDocument,
  data,
  onBack,
}: {
  legalDocument: OpenLegalDocument;
  data: AccountData;
  onBack: () => void;
}) {
  const title = data.legal.documents[legalDocument.name];

  return (
    <section
      aria-label={title}
      className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-8"
    >
      <button
        type="button"
        autoFocus
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink motion-reduce:transition-none"
      >
        <ChevronLeft
          aria-hidden
          className="size-4"
        />
        {data.legal.label}
      </button>
      <h2 className="mt-3 text-2xl leading-tight font-bold tracking-tight">
        {title}
      </h2>
      <Suspense fallback={<LegalDocumentViewSkeleton />}>
        <LegalDocumentContent
          legalDocument={legalDocument}
          data={data}
        />
      </Suspense>
    </section>
  );
}

function LegalDocumentContent({
  legalDocument,
  data,
}: {
  legalDocument: OpenLegalDocument;
  data: AccountData;
}) {
  const text = use(legalDocument.text);

  if (!text)
    return (
      <div className="mt-5 grid justify-items-start gap-3">
        <p
          role="alert"
          className="text-sm text-ink-soft"
        >
          {data.legal.loadFailed}
        </p>
        <Button
          variant="outline"
          onClick={() => openLegalDocument(legalDocument.name, data.language)}
        >
          {data.legal.retry}
        </Button>
      </div>
    );

  return (
    <LegalDocumentView
      edition={editionLine(
        data.legal.edition,
        text,
        data.notation,
        data.language,
      )}
      draftNotice={text.draft ? data.legal.draft : null}
      text={text.text}
    />
  );
}
