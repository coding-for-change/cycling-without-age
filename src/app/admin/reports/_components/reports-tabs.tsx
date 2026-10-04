"use client";

import { useSearchParams } from "next/navigation";
import { AdminTabs } from "../../_components/admin-tabs";

export function ReportsTabs({
  strings,
}: {
  strings: { label: string; activity: string; finance: string; soon: string };
}) {
  const searchParams = useSearchParams();
  const scope = new URLSearchParams();
  for (const key of ["chapter", "country"]) {
    const value = searchParams.get(key);
    if (value) scope.set(key, value);
  }
  const scopeQuery = scope.size > 0 ? `?${scope}` : "";

  return (
    <AdminTabs
      label={strings.label}
      current="activity"
      scopeQuery={scopeQuery}
      tabs={[
        { key: "activity", href: "/admin/reports", label: strings.activity },
        {
          key: "finance",
          href: "/admin/reports",
          label: strings.finance,
          disabled: true,
          badge: strings.soon,
        },
      ]}
    />
  );
}
