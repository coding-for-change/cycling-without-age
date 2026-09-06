"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";

/**
 * The chapter's logo when it has one that loads, its initials on mint when it
 * does not. `unoptimized` because the URL is whatever the admin pasted, and
 * the image proxy only serves allow-listed hosts.
 */
export function ChapterLogo({
  logo,
  name,
  className,
}: {
  logo: string | null;
  name: string;
  className?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const usable = logo && logo !== broken && /^https?:\/\//.test(logo);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-(--r-card) bg-mint-tint font-display font-bold text-ink",
        className,
      )}
    >
      {usable ? (
        <Image
          src={logo}
          alt=""
          fill
          unoptimized
          sizes="96px"
          className="object-contain p-1"
          onError={() => setBroken(logo)}
        />
      ) : (
        <span aria-hidden>{getInitials(name || "?")}</span>
      )}
    </span>
  );
}
