"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDrawerParam } from "../../_components/use-drawer-param";
import { type AdminViewer, viewerScope } from "../../_components/viewer-scope";

export function PassengersActions({
  viewer,
  addLabel,
  pickChapter,
}: {
  viewer: AdminViewer;
  addLabel: string;
  pickChapter: string;
}) {
  const { openHref } = useDrawerParam();

  if (!viewerScope(useSearchParams(), viewer).chapterId)
    return <p className="text-sm text-ink-soft">{pickChapter}</p>;

  return (
    <Button
      asChild
      variant="brand"
      className="min-h-11"
    >
      <Link
        href={openHref}
        scroll={false}
      >
        <UserPlus aria-hidden />
        {addLabel}
      </Link>
    </Button>
  );
}
