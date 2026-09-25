"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { fill } from "@/lib/utils";
import { fileUrl } from "./file-image";

export type LightboxLabels = {
  close: string;
  previous: string;
  next: string;
  position: string;
};

export const photoTransitionName = (fileId: string) => `photo-${fileId}`;

export function PhotoLightbox({
  fileIds,
  index,
  alt,
  onIndex,
  onClose,
  labels,
}: {
  fileIds: string[];
  index: number;
  alt: string;
  onIndex: (next: number) => void;
  onClose: () => void;
  labels: LightboxLabels;
}) {
  const count = fileIds.length;
  const fileId = fileIds[index];
  const step = (delta: number) => onIndex((index + delta + count) % count);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && count > 1) step(-1);
      if (event.key === "ArrowRight" && count > 1) step(1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  });

  if (!fileId) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-state="open"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-12"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl(fileId)}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        style={{ viewTransitionName: photoTransitionName(fileId) }}
        className="max-h-full max-w-full rounded-xl object-contain shadow-lift"
      />
      <button
        type="button"
        aria-label={labels.close}
        onClick={onClose}
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/50 focus-visible:outline-none"
      >
        <X className="size-5" />
      </button>
      {count > 1 ? (
        <>
          <LightboxStep
            label={labels.previous}
            className="left-4"
            onClick={() => step(-1)}
          >
            <ChevronLeft className="size-6" />
          </LightboxStep>
          <LightboxStep
            label={labels.next}
            className="right-4"
            onClick={() => step(1)}
          >
            <ChevronRight className="size-6" />
          </LightboxStep>
          <p className="text-2sm absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-white tabular-nums">
            {fill(labels.position, {
              index: String(index + 1),
              count: String(count),
            })}
          </p>
        </>
      ) : null}
    </div>,
    document.body,
  );
}

function LightboxStep({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/50 focus-visible:outline-none ${className}`}
    >
      {children}
    </button>
  );
}
