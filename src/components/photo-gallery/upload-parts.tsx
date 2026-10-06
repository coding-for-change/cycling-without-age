"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileDrop } from "@/hooks/use-file-drop";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  label,
  hint,
  onPick,
  onFiles,
  className,
  children,
}: {
  label: string;
  hint: string;
  onPick: () => void;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const { dragging, handlers } = useFileDrop(onFiles);
  return (
    <div
      {...handlers}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-5 py-10 text-center transition-colors",
        dragging && "border-ink-soft bg-canvas-deep",
        className,
      )}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onPick}
      >
        {label}
      </Button>
      <p className="text-2sm text-ink-soft">{hint}</p>
      {children}
    </div>
  );
}

export function TileRemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onKeyDown={(event) => event.stopPropagation()}
      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-canvas/95 text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-canvas focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:opacity-100"
    >
      <X className="size-4" />
    </button>
  );
}
