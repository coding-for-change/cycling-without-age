"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ExpandableItem = { key: string; node: ReactNode };

const EASE = [0.32, 0.72, 0, 1] as const;
const FALLBACK = 6;
const MIN = 3;
const FOOTER = 44;
const PAGE_BOTTOM = 32;
const FIT_FROM = "(min-width: 1024px)";

export function fittingCount({
  top,
  viewport,
  rowHeight,
  total,
}: {
  top: number;
  viewport: number;
  rowHeight: number;
  total: number;
}) {
  if (rowHeight <= 0) return Math.min(total, FALLBACK);
  const space = viewport - top - PAGE_BOTTOM;
  if (Math.floor(space / rowHeight) >= total) return total;
  return Math.max(MIN, Math.floor((space - FOOTER) / rowHeight));
}

function useFittingLimit(
  list: React.RefObject<HTMLUListElement | null>,
  total: number,
) {
  const [limit, setLimit] = useState(FALLBACK);

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const wide = window.matchMedia(FIT_FROM);
    const measure = () => {
      if (!wide.matches) {
        setLimit(FALLBACK);
        return;
      }
      const rows = [...element.children] as HTMLElement[];
      const shown = rows.slice(0, Math.min(rows.length, FALLBACK));
      const height = shown.reduce((sum, row) => sum + row.offsetHeight, 0);
      setLimit(
        fittingCount({
          top: element.getBoundingClientRect().top + window.scrollY,
          viewport: window.innerHeight,
          rowHeight: shown.length ? height / shown.length : 0,
          total,
        }),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    wide.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wide.removeEventListener("change", measure);
    };
  }, [list, total]);

  return limit;
}

export function ExpandableList({
  items,
  labels,
  words,
  trailing,
  className,
}: {
  items: ExpandableItem[];
  labels: { showAll: string; showLess: string };
  words: Locale;
  trailing?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const list = useRef<HTMLUListElement>(null);
  const limit = useFittingLimit(list, items.length);
  const head = items.slice(0, limit);
  const rest = items.slice(limit);
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: EASE };

  return (
    <div className="flex flex-col">
      <ul
        ref={list}
        className={cn("flex flex-col divide-y divide-line", className)}
      >
        {head.map((item) => (
          <li key={item.key}>{item.node}</li>
        ))}
        <AnimatePresence initial={false}>
          {open
            ? rest.map((item, index) => (
                <motion.li
                  key={item.key}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      ...transition,
                      delay: reduceMotion ? 0 : Math.min(index, 8) * 0.02,
                    },
                  }}
                  exit={{ height: 0, opacity: 0, transition }}
                  className="overflow-hidden"
                >
                  {item.node}
                </motion.li>
              ))
            : null}
        </AnimatePresence>
      </ul>
      {rest.length || trailing ? (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 pt-1">
          {rest.length ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="flex min-h-9 items-center gap-1.5 px-1 text-2sm text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none"
            >
              {open
                ? labels.showLess
                : formatMessage(labels.showAll, { count: rest.length }, words)}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 transition-transform duration-300 motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            </button>
          ) : (
            <span />
          )}
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
