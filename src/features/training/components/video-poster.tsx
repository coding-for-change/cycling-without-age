"use client";

import Image from "next/image";
import { useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoPoster({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span
      className={cn(
        "relative grid aspect-video shrink-0 place-items-center overflow-hidden rounded-md bg-canvas-deep text-ink-faint",
        className,
      )}
    >
      <Film
        aria-hidden
        className={cn(
          "size-4 transition-opacity duration-300 motion-reduce:transition-none",
          src && loaded && "opacity-0",
        )}
      />
      {src ? (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          unoptimized
          sizes="128px"
          onLoad={() => setLoaded(true)}
          className={cn(
            "object-cover transition-opacity duration-500 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </span>
  );
}
