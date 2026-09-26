"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { fileUrl } from "./file-image";
import { TileRemoveButton, UploadDropzone, useFileDrop } from "./upload-parts";
import { useUpload } from "./use-upload";

export type ManualFieldLabels = {
  add: string;
  hint: string;
  name: string;
  remove: string;
  open: string;
  uploading: string;
  failed: string;
};

export function ManualField({
  value,
  onChange,
  labels,
}: {
  value: string | null;
  onChange: (fileId: string | null) => void | Promise<void>;
  labels: ManualFieldLabels;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload } = useUpload("typeManual");
  const [busy, setBusy] = useState(false);

  async function send(files: File[]) {
    const pdf = files.find((file) => file.type === "application/pdf");
    if (!pdf) {
      if (files.length) toast.error(labels.failed);
      return;
    }
    setBusy(true);
    const result = await upload(pdf);
    setBusy(false);
    if (!result.ok) {
      haptics.error();
      toast.error(labels.failed);
      return;
    }
    await onChange(result.fileId);
  }

  const { dragging, handlers } = useFileDrop((files) => void send(files));

  const picker = (
    <input
      ref={input}
      type="file"
      accept="application/pdf"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        void send(files);
      }}
    />
  );

  if (!value && !busy)
    return (
      <UploadDropzone
        label={labels.add}
        hint={labels.hint}
        onPick={() => input.current?.click()}
        onFiles={(files) => void send(files)}
      >
        {picker}
      </UploadDropzone>
    );

  return (
    <div
      {...handlers}
      className={cn(
        "group relative flex max-w-md items-center gap-3 rounded-xl border border-line bg-canvas p-3 transition-colors",
        dragging && "border-ink-soft bg-canvas-deep",
      )}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-canvas-deep text-ink-soft">
        {busy ? (
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
        ) : (
          <FileText className="size-5" />
        )}
      </span>
      {busy || !value ? (
        <span className="text-2sm text-ink-soft">{labels.uploading}</span>
      ) : (
        <a
          href={fileUrl(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="grid min-w-0 flex-1 gap-0.5 pr-8 after:absolute after:inset-0 after:rounded-xl after:transition-colors hover:after:bg-black/5"
        >
          <span className="truncate text-2sm font-medium">{labels.name}</span>
          <span className="text-xs text-ink-soft">{labels.open}</span>
        </a>
      )}
      {value && !busy ? (
        <TileRemoveButton
          label={labels.remove}
          onClick={() => void onChange(null)}
        />
      ) : null}
      {picker}
    </div>
  );
}
