"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDraft } from "@/lib/auth-wall";
import { fill } from "@/lib/utils";
import { rideDraft, type RideWhen } from "./ride-draft";

export function RideConfirmation({
  slug,
  chapterName,
  strings,
}: {
  slug: string;
  chapterName: string;
  strings: {
    title: string;
    summary: string;
    noDraft: string;
    note: string;
    back: string;
    when: Record<RideWhen, string>;
  };
}) {
  const draft = useDraft("ride", rideDraft);
  const mine = draft?.chapterSlug === slug ? draft : null;

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {strings.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed">
        {mine
          ? fill(strings.summary, {
              chapter: chapterName,
              when: strings.when[mine.when],
            })
          : strings.noDraft}
      </p>
      <p className="mt-6 rounded-(--r-card) bg-mint-tint p-4 text-sm text-ink-soft">
        {strings.note}
      </p>
      <Link
        href={`/join/${slug}`}
        className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
      >
        <ArrowLeft
          className="size-4"
          aria-hidden
        />
        {fill(strings.back, { chapter: chapterName })}
      </Link>
    </>
  );
}
