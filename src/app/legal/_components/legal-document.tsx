import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { legal } from "@/features/legal";
import {
  LegalDocumentView,
  LegalDocumentViewSkeleton,
} from "@/components/legal-document-view";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  editionLine,
  LEGAL_DOCUMENTS,
  legalHref,
  type LegalDocument,
} from "@/lib/legal";

export async function legalMetadata(
  document: LegalDocument,
): Promise<Metadata> {
  const { legal } = await getDictionary();
  return { title: `${legal.documents[document]} · Cycling Without Age` };
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <Suspense fallback={<LegalDocumentSkeleton />}>
      <LegalDocumentBody document={document} />
    </Suspense>
  );
}

async function LegalDocumentBody({ document }: { document: LegalDocument }) {
  const [dict, locale, head] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const page = await legal.getLegalText(document, locale);
  const strings = dict.legal;

  return (
    <article>
      <h1 className="text-3xl leading-tight tracking-tight">
        {strings.documents[document]}
      </h1>
      <LegalDocumentView
        edition={editionLine(
          strings.edition,
          page,
          resolveLocale(head.get("accept-language")),
          locale,
        )}
        draftNotice={page.draft ? strings.draft : null}
        text={page.text}
      />
      <nav
        aria-label={strings.label}
        className="mt-16 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm"
      >
        {LEGAL_DOCUMENTS.filter((other) => other !== document).map((other) => (
          <Link
            key={other}
            href={legalHref(other)}
            className="rounded-sm text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink motion-reduce:transition-none"
          >
            {strings.documents[other]}
          </Link>
        ))}
      </nav>
    </article>
  );
}

function LegalDocumentSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-2/3" />
      <LegalDocumentViewSkeleton />
    </div>
  );
}
