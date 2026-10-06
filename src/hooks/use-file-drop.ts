"use client";

import { useState, type DragEvent } from "react";

const carriesFiles = (event: DragEvent) =>
  event.dataTransfer.types.includes("Files");

export function useFileDrop(onFiles: (files: File[]) => void, enabled = true) {
  const [dragging, setDragging] = useState(false);
  const handlers = enabled
    ? {
        onDragOver: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (event: DragEvent) => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          setDragging(false);
          onFiles(Array.from(event.dataTransfer.files));
        },
      }
    : {};
  return { dragging, handlers };
}
