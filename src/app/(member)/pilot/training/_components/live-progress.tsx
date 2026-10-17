"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LiveLesson = { ratio: number; completed: boolean; fresh: boolean };

type LiveProgress = {
  lessons: Record<string, LiveLesson>;
  report: (lessonId: string, update: Partial<LiveLesson>) => void;
};

const LiveProgressContext = createContext<LiveProgress | null>(null);

export function LiveProgressProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<Record<string, LiveLesson>>({});

  const report = useCallback(
    (lessonId: string, update: Partial<LiveLesson>) =>
      setLessons((current) => {
        const previous = current[lessonId] ?? {
          ratio: 0,
          completed: false,
          fresh: false,
        };
        const next = {
          ratio: Math.max(previous.ratio, update.ratio ?? 0),
          completed: previous.completed || (update.completed ?? false),
          fresh: previous.fresh || (update.fresh ?? false),
        };
        if (
          next.ratio === previous.ratio &&
          next.completed === previous.completed &&
          next.fresh === previous.fresh &&
          lessonId in current
        )
          return current;
        return { ...current, [lessonId]: next };
      }),
    [],
  );

  const value = useMemo(() => ({ lessons, report }), [lessons, report]);
  return <LiveProgressContext value={value}>{children}</LiveProgressContext>;
}

export const useLiveProgress = () => use(LiveProgressContext);
