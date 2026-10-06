"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import type { NotifyLabels } from "@/components/action-feedback";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableOverlay,
} from "@/components/ui/sortable";
import { useFileDrop } from "@/hooks/use-file-drop";
import { usePhotoList, type PhotoListChange } from "@/hooks/use-photo-list";
import { usePresignedUpload } from "@/hooks/use-presigned-upload";
import { canTakePhoto, takePhoto } from "@/lib/native/camera";
import { fileUrl } from "@/lib/storage/file-url";
import { acceptAttribute, type FileKind } from "@/lib/storage/limits";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import {
  PhotoLightbox,
  photoTransitionName,
  type LightboxLabels,
} from "./photo-lightbox";
import { TileRemoveButton, UploadDropzone } from "./upload-parts";

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

type Failed = { ok: false; error: string };

export type PhotoUpload = {
  request: (input: {
    mime: string;
    size: number;
  }) => Promise<{ ok: true; key: string; url: string } | Failed>;
  commit: (input: {
    key: string;
  }) => Promise<{ ok: true; fileId: string } | Failed>;
};

const cameraFile = (photo: Blob) =>
  new File([photo], `photo-${Date.now()}.jpg`, {
    type: photo.type || "image/jpeg",
  });

const TILE =
  "group relative aspect-square overflow-hidden rounded-xl border border-line bg-white";
const COVER_TILE = "col-span-2 row-span-2";

export function PhotoGallery({
  kind,
  upload: endpoints,
  value,
  onChange,
  alt,
  labels,
  max = 12,
  readOnly = false,
  sortable = false,
  camera = false,
  className,
  locale,
}: {
  kind: FileKind;
  upload: PhotoUpload;
  value: string[];
  onChange: PhotoListChange;
  alt: string;
  labels: PhotoGalleryLabels;
  max?: number;
  readOnly?: boolean;
  sortable?: boolean;
  camera?: boolean;
  className?: string;
  locale: Locale;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const { upload } = usePresignedUpload(endpoints.request, endpoints.commit);
  const { photos, pending, room, add, remove, reorder } = usePhotoList({
    value,
    onChange,
    upload,
    max,
    labels,
    locale,
  });
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState<string | null>(null);

  async function pick() {
    if (camera && canTakePhoto()) {
      const photo = await takePhoto();
      if (photo) await add([cameraFile(photo)]);
      return;
    }
    input.current?.click();
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
  const reorderable = sortable && !readOnly && count > 1;

  const image = (fileId: string, index: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileUrl(fileId)}
      alt={`${alt} ${index + 1}`}
      loading="lazy"
      decoding="async"
      draggable={false}
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
  );

  const cover = (index: number) =>
    index === 0 && count > 1 ? (
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-canvas/90 px-2 py-0.5 text-xs font-medium text-ink">
        {labels.cover}
      </span>
    ) : null;

  const tile = (fileId: string, index: number) => (
    <>
      <button
        type="button"
        aria-label={formatMessage(
          labels.open,
          { index: String(index + 1), count: String(count) },
          locale,
        )}
        onClick={() => show(index)}
        onKeyDown={(event) => event.stopPropagation()}
        className="block size-full cursor-zoom-in outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        {image(fileId, index)}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25"
        />
      </button>
      {cover(index)}
      {readOnly ? null : (
        <TileRemoveButton
          label={labels.remove}
          onClick={() => remove(fileId)}
        />
      )}
    </>
  );

  const tiles = photos.map((fileId, index) =>
    reorderable ? (
      <SortableItem
        key={fileId}
        value={fileId}
        asHandle
        className={cn(TILE, index === 0 && COVER_TILE)}
      >
        {tile(fileId, index)}
      </SortableItem>
    ) : (
      <div
        key={fileId}
        className={cn(TILE, index === 0 && COVER_TILE)}
      >
        {tile(fileId, index)}
      </div>
    ),
  );

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
      {reorderable ? (
        <Reorderable
          photos={photos}
          onReorder={reorder}
          overlay={(fileId) => (
            <div className={cn(TILE, "size-full shadow-lift")}>
              {image(fileId, photos.indexOf(fileId))}
              {cover(photos.indexOf(fileId))}
            </div>
          )}
        >
          {tiles}
        </Reorderable>
      ) : (
        tiles
      )}

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
          <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-ink motion-reduce:animate-none" />
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
          locale={locale}
        />
      ) : null}
    </div>
  );
}

function Reorderable({
  photos,
  onReorder,
  overlay,
  children,
}: {
  photos: string[];
  onReorder: (next: string[]) => void;
  overlay: (fileId: string) => ReactNode;
  children: ReactNode;
}) {
  return (
    <Sortable
      value={photos}
      onValueChange={onReorder}
      orientation="mixed"
    >
      <SortableContent withoutSlot>{children}</SortableContent>
      <SortableOverlay>
        {({ value: active }) => overlay(String(active))}
      </SortableOverlay>
    </Sortable>
  );
}
