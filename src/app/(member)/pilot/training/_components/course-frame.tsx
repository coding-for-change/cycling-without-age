"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { LessonOutline } from "./lesson-outline";
import { LiveProgressProvider } from "./live-progress";
import type { OutlineItem, OutlineStrings } from "./outline";

const isElementSegment = (segment: string | null) => segment !== null;

export function CourseFrame({
  outline,
  children,
}: {
  outline: ReactNode;
  children: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();

  return (
    <LiveProgressProvider>
      {isElementSegment(segment) ? (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col pb-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-6 lg:pt-2">
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            {outline}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      ) : (
        children
      )}
    </LiveProgressProvider>
  );
}

export function CourseOutlinePanel({
  title,
  items,
  strings,
}: {
  title: string;
  items: OutlineItem[];
  strings: OutlineStrings;
}) {
  const segment = useSelectedLayoutSegment();
  return (
    <div className="grid max-h-[calc(100dvh-6rem)] gap-3 overflow-y-auto rounded-(--r-tile) border border-line bg-canvas p-3">
      <p className="px-2 pt-1 font-display text-base font-bold text-balance">
        {title}
      </p>
      <LessonOutline
        items={items}
        activeId={isElementSegment(segment) ? segment : null}
        strings={strings}
      />
    </div>
  );
}
