"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { haptics } from "@/lib/native/haptics";
import { Segmented } from "../../../_components/segmented";

export function RequestStatusSwitch<T extends string>({
  value,
  label,
  options,
}: {
  value: T;
  label: string;
  options: readonly { value: T; label: string; href: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    for (const option of options) router.prefetch(option.href);
  }, [router, options]);

  return (
    <Segmented
      value={value}
      label={label}
      options={options}
      className="w-fit max-w-full overflow-x-auto"
      onChange={(next) => {
        const href = options.find((option) => option.value === next)?.href;
        if (!href) return;
        haptics.tap();
        startTransition(() => router.replace(href, { scroll: false }));
      }}
    />
  );
}
