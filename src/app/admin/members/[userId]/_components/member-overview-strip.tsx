import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ReadyBadge } from "../../../_components/training-status";
import { TrainingGauge } from "./training-meters";

export type OverviewStripView = {
  label: string;
  training: {
    title: string;
    percent: number;
    percentLabel: string;
    gaugeLabel: string;
    ready: boolean;
    readyLabel: string;
    readyTitle: string;
  } | null;
  rides: { title: string; value: string; detail: string } | null;
  lastRide: {
    title: string;
    label: string;
    at: string | null;
    absolute: string | null;
  } | null;
  attention: {
    title: string;
    count: string;
    items: string[];
    more: string | null;
    allGood: string;
  } | null;
};

const FOUR = "@2xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)]";

export function MemberOverviewStrip({ view }: { view: OverviewStripView }) {
  const tiles = [
    view.training,
    view.rides,
    view.lastRide,
    view.attention,
  ].filter(Boolean).length;
  if (tiles === 0) return null;

  return (
    <section
      aria-label={view.label}
      className="@container"
    >
      <div
        className={cn(
          "grid grid-cols-2 gap-3",
          tiles === 4 ? FOUR : tiles === 3 && "@2xl:grid-cols-3",
        )}
      >
        {view.training ? (
          <Tile title={view.training.title}>
            <div className="grid justify-items-center gap-1 pt-1">
              <TrainingGauge
                percent={view.training.percent}
                label={view.training.gaugeLabel}
              />
              <span className="text-lg leading-none font-medium tabular-nums">
                {view.training.percentLabel}
              </span>
              <span
                title={view.training.readyTitle}
                className="max-w-full"
              >
                <ReadyBadge
                  ready={view.training.ready}
                  label={view.training.readyLabel}
                />
              </span>
            </div>
          </Tile>
        ) : null}

        {view.rides ? (
          <Tile title={view.rides.title}>
            <Figure>{view.rides.value}</Figure>
            <Detail>{view.rides.detail}</Detail>
          </Tile>
        ) : null}

        {view.lastRide ? (
          <Tile title={view.lastRide.title}>
            {view.lastRide.at ? (
              <time
                dateTime={view.lastRide.at}
                title={view.lastRide.absolute ?? undefined}
                className="text-2xl leading-tight font-medium text-balance"
              >
                {view.lastRide.label}
              </time>
            ) : (
              <Detail>{view.lastRide.label}</Detail>
            )}
            {view.lastRide.at && view.lastRide.absolute ? (
              <Detail>{view.lastRide.absolute}</Detail>
            ) : null}
          </Tile>
        ) : null}

        {view.attention ? (
          <Tile
            title={view.attention.title}
            className={cn(tiles % 2 === 1 && "col-span-2 @2xl:col-span-1")}
            meta={
              view.attention.items.length > 0 ? (
                <span className="inline-grid min-w-5 place-items-center rounded-full bg-canvas-deep px-1.5 text-xs leading-5 font-medium tabular-nums">
                  {view.attention.count}
                </span>
              ) : null
            }
          >
            {view.attention.items.length > 0 ? (
              <ul className="grid gap-1 text-2sm">
                {view.attention.items.map((item) => (
                  <li
                    key={item}
                    className="flex min-w-0 items-start gap-2"
                  >
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-soft"
                    />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
                {view.attention.more ? (
                  <li className="pl-3.5 text-ink-soft">
                    {view.attention.more}
                  </li>
                ) : null}
              </ul>
            ) : (
              <span className="inline-flex items-center gap-2 text-2sm text-mint-ink">
                <CircleCheck
                  aria-hidden
                  className="size-4"
                />
                {view.attention.allGood}
              </span>
            )}
          </Tile>
        ) : null}
      </div>
    </section>
  );
}

function Tile({
  title,
  meta,
  className,
  children,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 content-start gap-2 rounded-xl border border-line p-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="truncate text-2sm font-normal text-ink-soft">{title}</h3>
        {meta}
      </div>
      {children}
    </div>
  );
}

function Figure({ children }: { children: ReactNode }) {
  return (
    <span className="text-2xl leading-tight font-medium tabular-nums">
      {children}
    </span>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return <span className="text-2sm text-ink-soft">{children}</span>;
}

export function MemberOverviewSkeleton() {
  return (
    <div className="@container">
      <div className={cn("grid grid-cols-2 gap-3", FOUR)}>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton
            key={index}
            className="h-40 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
