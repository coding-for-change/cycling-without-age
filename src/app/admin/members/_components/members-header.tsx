"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDrawerParam } from "../../_components/use-drawer-param";
import { type AdminViewer, viewerScope } from "../../_components/viewer-scope";

export function MembersActions({
  viewer,
  inviteLabel,
}: {
  viewer: AdminViewer;
  inviteLabel: string;
}) {
  const { openHref } = useDrawerParam();
  if (!viewerScope(useSearchParams(), viewer).chapterId) return null;

  return (
    <Button
      asChild
      variant="outline"
      className="min-h-11"
    >
      <Link
        href={openHref}
        scroll={false}
      >
        <Send aria-hidden />
        {inviteLabel}
      </Link>
    </Button>
  );
}
