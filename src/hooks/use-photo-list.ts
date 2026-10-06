"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";

export type PhotoListLabels = {
  full: string;
  failed: string;
  errors: { generic: string } & Partial<Record<string, string>>;
};

type Pending = { key: string; preview: string };

type Saved = { ok: true } | { ok: false; error: string };

export type PhotoListChange = (
  fileIds: string[],
  previous: string[],
) => Promise<Saved> | void;

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function usePhotoList({
  value,
  onChange,
  upload,
  max,
  labels,
  locale,
}: {
  value: string[];
  onChange: PhotoListChange;
  upload: (
    file: File,
  ) => Promise<{ ok: true; fileId: string } | { ok: false; error: string }>;
  max: number;
  labels: PhotoListLabels;
  locale: string;
}) {
  const [photos, setPhotos] = useState(value);
  const [synced, setSynced] = useState(value);
  if (!sameIds(synced, value)) {
    setSynced(value);
    setPhotos(value);
  }
  const latest = useRef(photos);
  useLayoutEffect(() => {
    latest.current = photos;
  }, [photos]);
  const [pending, setPending] = useState<Pending[]>([]);

  const room = max - photos.length - pending.length;

  function commit(next: string[]) {
    latest.current = next;
    setPhotos(next);
  }

  async function persist(
    change: (current: string[]) => string[],
    undo: (current: string[]) => string[],
  ) {
    const previous = latest.current;
    const next = change(previous);
    commit(next);
    const result = await onChange(next, previous);
    if (result && !result.ok) {
      commit(undo(latest.current));
      haptics.error();
      toast.error(labels.errors[result.error] ?? labels.errors.generic);
      return false;
    }
    return true;
  }

  async function add(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    if (images.length > room)
      toast.message(formatMessage(labels.full, { max }, locale));
    const batch = images.slice(0, Math.max(room, 0)).map((file) => ({
      file,
      key: `${file.name}-${file.size}-${Math.random()}`,
      preview: URL.createObjectURL(file),
    }));
    if (!batch.length) return;
    setPending((current) => [...current, ...batch]);

    const uploaded: string[] = [];
    for (const item of batch) {
      const result = await upload(item.file);
      setPending((current) => current.filter((p) => p.key !== item.key));
      URL.revokeObjectURL(item.preview);
      if (result.ok) uploaded.push(result.fileId);
      else
        toast.error(
          (result.error === "rateLimited" && labels.errors.rateLimited) ||
            formatMessage(labels.failed, { name: item.file.name }, locale),
        );
    }
    if (!uploaded.length) return;
    const saved = await persist(
      (current) => [...current, ...uploaded],
      (current) => current.filter((id) => !uploaded.includes(id)),
    );
    if (saved) haptics.success();
  }

  function remove(fileId: string) {
    haptics.tap();
    const index = latest.current.indexOf(fileId);
    void persist(
      (current) => current.filter((id) => id !== fileId),
      (current) =>
        current.includes(fileId)
          ? current
          : [...current.slice(0, index), fileId, ...current.slice(index)],
    );
  }

  function reorder(next: string[]) {
    const before = latest.current;
    if (sameIds(before, next)) return;
    void persist(
      () => next,
      () => before,
    );
  }

  return { photos, pending, room, add, remove, reorder };
}
