"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { CalendarDays, List } from "lucide-react";
import { haptics } from "@/lib/native/haptics";
import { Segmented } from "../../_components/segmented";

export type RidesView = "calendar" | "list";

export function RidesViewSwitch({
  value,
  hrefs,
  strings,
}: {
  value: RidesView;
  hrefs: Record<RidesView, string>;
  strings: { label: string; calendar: string; list: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch(hrefs.calendar);
    router.prefetch(hrefs.list);
  }, [router, hrefs.calendar, hrefs.list]);

  return (
    <Segmented
      value={value}
      label={strings.label}
      options={[
        { value: "calendar", label: strings.calendar, icon: CalendarDays },
        { value: "list", label: strings.list, icon: List },
      ]}
      onChange={(next) => {
        haptics.tap();
        startTransition(() => router.replace(hrefs[next], { scroll: false }));
      }}
    />
  );
}
