"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { canTakePhoto, takePhoto } from "@/lib/native/camera";
import type { NotifyLabels } from "@/components/action-feedback";
import { haptics } from "@/lib/native/haptics";
import { acceptAttribute, type FileKind } from "@/lib/storage/limits";
import { cn, fill } from "@/lib/utils";
import type { FleetResult } from "../actions";
import { fileUrl } from "./file-image";
import {
  PhotoLightbox,
  photoTransitionName,
  type LightboxLabels,
} from "./photo-lightbox";
import { TileRemoveButton, UploadDropzone, useFileDrop } from "./upload-parts";
import { useUpload } from "./use-upload";

export type PhotoGalleryLabels = LightboxLabels & {
  upload: string;
  hint: string;
  add: string;
  remove: string;
  open: string;
  cover: string;
  full: string;
  failed: string;
  errors: NotifyLabels["errors"];
};

type Pending = { key: string; preview: string };

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function PhotoGallery({
  kind,
  value,
  onChange,
  alt,
  labels,
  max = 12,
  readOnly = false,
  camera = false,
  className,
}: {
  kind: FileKind;
  value: string[];
  onChange: (fileIds: string[]) => Promise<FleetResult> | void;
  alt: string;
  labels: PhotoGalleryLabels;
  max?: number;
  readOnly?: boolean;
  camera?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const { upload } = useUpload(kind);
  const [photos, setPhotos] = useState(value);
  const [synced, setSynced] = useState(value);
  if (!sameIds(synced, value)) {
    setSynced(value);
    setPhotos(value);
  }
  const [pending, setPending] = useState<Pending[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const room = max - photos.length - pending.length;

  async function persist(next: string[], previous: string[]) {
    setPhotos(next);
    const result = await onChange(next);
    if (result && !result.ok) {
      setPhotos(previous);
      haptics.error();
      toast.error(labels.errors[result.error] ?? labels.errors.generic);
    }
    return !result || result.ok;
  }

  async function add(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    if (images.length > room)
      toast.message(fill(labels.full, { max: String(max) }));
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
      else toast.error(fill(labels.failed, { name: item.file.name }));
    }
    if (!uploaded.length) return;
    const previous = photos;
    if (await persist([...previous, ...uploaded], previous)) haptics.success();
  }

  async function pick() {
    if (camera && canTakePhoto()) {
      const photo = await takePhoto();
      if (photo)
        await add([
          new File([photo], `photo-${Date.now()}.jpg`, {
            type: photo.type || "image/jpeg",
          }),
        ]);
      return;
    }
    input.current?.click();
  }

  function remove(fileId: string) {
    haptics.tap();
    void persist(
      photos.filter((id) => id !== fileId),
      photos,
    );
  }

  function transition(update: () => void) {
    if (!("startViewTransition" in document)) return update();
    document.startViewTransition(() => flushSync(update));
  }

  function show(index: number) {
    flushSync(() => setActive(photos[index]));
    transition(() => setOpen(index));
  }

  function close() {
    if (open === null) return;
    const fileId = photos[open];
    flushSync(() => setActive(fileId));
    transition(() => setOpen(null));
  }

  function chosen(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void add(files);
  }

  const { dragging, handlers: dropzone } = useFileDrop(
    (files) => void add(files),
    !readOnly,
  );

  const picker = (
    <input
      ref={input}
      id={inputId}
      type="file"
      accept={acceptAttribute(kind)}
      multiple
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={chosen}
    />
  );

  if (!photos.length && !pending.length) {
    if (readOnly) return null;
    return (
      <UploadDropzone
        label={labels.upload}
        hint={labels.hint}
        onPick={() => void pick()}
        onFiles={(files) => void add(files)}
        className={className}
      >
        {picker}
      </UploadDropzone>
    );
  }

  const count = photos.length;

  return (
    <div
      {...dropzone}
      className={cn(
        "grid grid-cols-3 gap-3 rounded-xl transition-colors sm:grid-cols-4",
        dragging &&
          "bg-canvas-deep outline-2 outline-offset-4 outline-ink-soft outline-dashed",
        className,
      )}
    >
      {photos.map((fileId, index) => (
        <div
          key={fileId}
          className={cn(
            "group relative aspect-square overflow-hidden rounded-xl border border-line bg-white",
            index === 0 && "col-span-2 row-span-2",
          )}
        >
          <button
            type="button"
            aria-label={fill(labels.open, {
              index: String(index + 1),
              count: String(count),
            })}
            onClick={() => show(index)}
            className="block size-full cursor-zoom-in outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl(fileId)}
              alt={`${alt} ${index + 1}`}
              loading="lazy"
              decoding="async"
              style={
                active === fileId && open === null
                  ? { viewTransitionName: photoTransitionName(fileId) }
                  : undefined
              }
              className={cn(
                "size-full",
                index === 0 ? "object-contain p-2" : "object-cover",
              )}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25"
            />
          </button>
          {index === 0 && count > 1 ? (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-canvas/90 px-2 py-0.5 text-xs font-medium text-ink">
              {labels.cover}
            </span>
          ) : null}
          {readOnly ? null : (
            <TileRemoveButton
              label={labels.remove}
              onClick={() => remove(fileId)}
            />
          )}
        </div>
      ))}

      {pending.map((item) => (
        <div
          key={item.key}
          className="relative aspect-square overflow-hidden rounded-xl border border-line bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.preview}
            alt=""
            className="size-full object-cover opacity-60"
          />
          <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-ink" />
        </div>
      ))}

      {!readOnly && room > 0 ? (
        <button
          type="button"
          aria-label={labels.add}
          onClick={() => void pick()}
          className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line bg-canvas-deep text-ink transition-colors hover:border-ink-soft hover:bg-canvas-deeper focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Plus className="size-5" />
        </button>
      ) : null}

      {readOnly ? null : picker}

      {open !== null ? (
        <PhotoLightbox
          fileIds={photos}
          index={open}
          alt={alt}
          onIndex={(next) => {
            setActive(photos[next]);
            setOpen(next);
          }}
          onClose={close}
          labels={labels}
        />
      ) : null}
    </div>
  );
}
