"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronRight, Minus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableStrings } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { hrefWith } from "../../_components/href-with";
import { hoverProps, useHighlight } from "./highlight-provider";
import { ReportCard } from "./report-card";
import { EmptyCard } from "./empty-card";
import { RankingDrawer } from "./ranking-drawer";
import { ReportLink } from "./report-nav";
import { ShareBar } from "./share-bar";
import {
  formatRankValue,
  rankEntries,
  rankingEntries,
  type RankingChapter,
  type RankingCountry,
  type RankingEntry,
  type RankingPerson,
  type RankingsStrings,
} from "./ranking-entries";
import {
  RANK_PARAM,
  RANKING_PARAM,
  metricsFor,
  parseRankMetric,
  parseRankingTab,
  rankingTabs,
  type RankMetric,
  type RankedRow,
  type RankingTab,
  type ScopeKind,
} from "./ranking-model";

export type { RankingChapter, RankingCountry, RankingPerson, RankingsStrings };

const TOP = 10;
const SPRING = { type: "spring", stiffness: 520, damping: 42 } as const;

function Movement({
  movement,
  language,
  strings,
}: {
  movement: number | null;
  language: Language;
  strings: RankingsStrings;
}) {
  if (movement === null)
    return (
      <span
        title={strings.newAria}
        aria-label={strings.newAria}
        className="rounded-full bg-mint-tint px-1.5 py-0.5 text-xs font-medium text-ink"
      >
        {strings.new}
      </span>
    );
  if (movement === 0)
    return (
      <Minus
        role="img"
        aria-label={strings.same}
        className="size-3.5 text-ink-faint"
      />
    );
  const up = movement > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  const label = formatMessage(
    up ? strings.up : strings.down,
    { count: Math.abs(movement) },
    language,
  );
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up ? "text-mint-deep" : "text-ink-soft",
      )}
    >
      <Icon
        aria-hidden
        className="size-3"
      />
      {Math.abs(movement)}
    </span>
  );
}

function RankRow({
  ranked,
  metric,
  notation,
  language,
  strings,
}: {
  ranked: RankedRow<RankingEntry>;
  metric: RankMetric;
  notation: Locale;
  language: Language;
  strings: RankingsStrings;
}) {
  const { highlight, highlighted } = useHighlight();
  const entry = ranked.row;
  const focused =
    entry.highlightKey !== undefined && highlighted === entry.highlightKey;

  const body = (
    <>
      <span className="w-5 shrink-0 text-right text-2sm text-ink-faint tabular-nums">
        {ranked.rank}
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-2sm font-medium text-ink">
              {entry.name}
            </span>
            {entry.detail ? (
              <span className="hidden truncate text-xs text-ink-faint sm:inline">
                {entry.detail}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-2sm font-semibold text-ink tabular-nums">
            {formatRankValue(ranked.value, metric, notation, language, strings)}
          </span>
        </span>
        <ShareBar
          value={ranked.share}
          max={1}
          tone={focused ? "deep" : "mint"}
          thin
        />
      </span>
      <span className="flex w-10 shrink-0 justify-end">
        <Movement
          movement={ranked.movement}
          language={language}
          strings={strings}
        />
      </span>
    </>
  );

  const shell = cn(
    "-mx-2 flex min-h-11 items-center gap-3 rounded-(--r-card) px-2 py-1.25 transition-colors",
    focused && "bg-canvas-deep",
  );
  const hover = entry.highlightKey
    ? hoverProps(entry.highlightKey, highlight)
    : {};

  if (!entry.href)
    return (
      <div
        className={shell}
        {...hover}
      >
        {body}
      </div>
    );

  return (
    <ReportLink
      href={entry.href}
      aria-label={formatMessage(strings.open, { name: entry.name }, language)}
      className={cn(
        shell,
        "hover:bg-canvas-deep focus-visible:outline-2 focus-visible:outline-mint-deep",
      )}
      {...hover}
    >
      {body}
      <ChevronRight
        aria-hidden
        className="hidden size-4 shrink-0 text-ink-faint sm:block"
      />
    </ReportLink>
  );
}

function MetricSwitch({
  metrics,
  value,
  onChange,
  strings,
}: {
  metrics: RankMetric[];
  value: RankMetric;
  onChange: (metric: RankMetric) => void;
  strings: RankingsStrings;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        const picked = metrics.find((metric) => metric === next);
        if (picked) onChange(picked);
      }}
      aria-label={strings.metricLabel}
      spacing={0.5}
      className="rounded-(--r-card) bg-canvas-deep p-0.5"
    >
      {metrics.map((metric) => (
        <ToggleGroupItem
          key={metric}
          value={metric}
          className="h-auto min-h-8 rounded-md px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-transparent hover:text-ink focus-visible:ring-2 focus-visible:ring-ink data-[state=on]:bg-canvas data-[state=on]:text-ink data-[state=on]:shadow-soft"
        >
          {strings.metrics[metric]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function Rankings({
  scope,
  chapters,
  countries,
  pilots,
  riders,
  scopeCountries,
  periodLabel,
  notation,
  language,
  strings,
  tableStrings,
  showYear,
}: {
  scope: ScopeKind;
  chapters: RankingChapter[];
  countries: RankingCountry[];
  pilots: RankingPerson[] | null;
  riders: RankingPerson[] | null;
  scopeCountries: string[];
  periodLabel: string;
  notation: Locale;
  language: Language;
  strings: RankingsStrings;
  tableStrings: DataTableStrings;
  showYear?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const reduceMotion = useReducedMotion();
  const drawer = useDrawerParam();
  const tabs = rankingTabs(scope, countries.length);
  const [tab, setTab] = useState<RankingTab>(tabs[0]);
  const active = tabs.includes(tab) ? tab : tabs[0];
  const drawerTab = parseRankingTab(searchParams.get(RANKING_PARAM), tabs);

  const setMetric = (metric: RankMetric) =>
    window.history.replaceState(
      null,
      "",
      hrefWith(pathname, search, {
        [RANK_PARAM]: metric === "rides" ? null : metric,
      }),
    );

  const entriesFor = (which: RankingTab) =>
    rankingEntries({
      tab: which,
      scope,
      chapters,
      countries,
      pilots,
      riders,
      scopeCountries,
      pathname,
      search,
    });

  const list = (which: RankingTab) => {
    const metric = parseRankMetric(searchParams.get(RANK_PARAM), which);
    const ranked = rankEntries(entriesFor(which), metric);
    if (ranked.length === 0)
      return (
        <EmptyCard
          icon={Trophy}
          title={strings.empty.title}
          body={strings.empty.body}
          showYear={showYear}
        />
      );
    return (
      <div className="grid gap-3">
        <ol className="grid gap-0.5">
          <AnimatePresence
            initial={false}
            mode="popLayout"
          >
            {ranked.slice(0, TOP).map((entry) => (
              <motion.li
                key={entry.row.key}
                layout={reduceMotion ? false : "position"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : SPRING}
              >
                <RankRow
                  ranked={entry}
                  metric={metric}
                  notation={notation}
                  language={language}
                  strings={strings}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start text-ink-soft"
          onClick={() =>
            drawer.go((params) => params.set(RANKING_PARAM, which))
          }
        >
          {strings.seeAll}
          <ChevronRight aria-hidden />
        </Button>
      </div>
    );
  };

  const metric = parseRankMetric(searchParams.get(RANK_PARAM), active);

  return (
    <ReportCard
      title={strings.title}
      action={
        <MetricSwitch
          metrics={metricsFor(active)}
          value={metric}
          onChange={setMetric}
          strings={strings}
        />
      }
    >
      <Tabs
        value={active}
        onValueChange={(value) =>
          setTab(parseRankingTab(value, tabs) ?? tabs[0])
        }
        className="gap-4"
      >
        {tabs.length > 1 ? (
          <TabsList
            variant="line"
            aria-label={strings.tabsLabel}
            className="h-auto w-full justify-start border-b border-line"
          >
            {tabs.map((which) => (
              <TabsTrigger
                key={which}
                value={which}
                className="min-h-9 flex-none px-3 text-2sm"
              >
                {strings.tabs[which]}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}
        {tabs.map((which) => (
          <TabsContent
            key={which}
            value={which}
          >
            {list(which)}
          </TabsContent>
        ))}
      </Tabs>

      <RankingDrawer
        tab={drawerTab}
        entries={drawerTab ? entriesFor(drawerTab) : []}
        metric={
          drawerTab
            ? parseRankMetric(searchParams.get(RANK_PARAM), drawerTab)
            : "rides"
        }
        periodLabel={periodLabel}
        onClose={() => drawer.go((params) => params.delete(RANKING_PARAM))}
        notation={notation}
        language={language}
        strings={strings}
        tableStrings={tableStrings}
      />
    </ReportCard>
  );
}
