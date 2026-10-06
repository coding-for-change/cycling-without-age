"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { IMAGE_MIMES } from "@/lib/storage/limits";
import {
  commitProfilePhotoAction,
  removeProfilePhotoAction,
  requestProfilePhotoUploadAction,
} from "../actions";
import { useEditor } from "./editor-context";

export function PhotoField({
  avatar,
  photo,
  canUpload,
  canRemove,
}: {
  avatar: string;
  photo: string | null;
  canUpload: boolean;
  canRemove: boolean;
}) {
  const { subject, name, onBehalf, strings, language } = useEditor();
  const input = useRef<HTMLInputElement>(null);
  const [asking, setAsking] = useState(false);
  const agreed = useRef(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const fail = (error: string) => {
    toast.error(
      strings.errors[error as keyof typeof strings.errors] ??
        strings.errors.generic,
    );
    haptics.error();
  };

  const upload = async (file: File) => {
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      const presigned = await requestProfilePhotoUploadAction({
        subject,
        mime: file.type,
        size: file.size,
      });
      if (!presigned.ok) return fail(presigned.error);

      const put = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      }).catch(() => null);
      if (!put?.ok) return fail("uploadRejected");

      const committed = await commitProfilePhotoAction({
        subject,
        key: presigned.key,
        riderAgrees: onBehalf ? agreed.current : undefined,
      });
      if (!committed.ok) return fail(committed.error);
      toast.success(strings.photo.saved);
      haptics.success();
    } finally {
      setBusy(false);
      setPreview(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    const result = await removeProfilePhotoAction({ subject });
    setBusy(false);
    if (!result.ok) return fail(result.error);
    toast.success(strings.photo.removed);
    haptics.success();
  };

  const shown = preview ?? photo;
  const choose = () => {
    if (!onBehalf) return input.current?.click();
    agreed.current = false;
    setAsking(true);
  };

  return (
    <div className="grid justify-items-center gap-3">
      <div className="relative">
        <PersonAvatar
          svg={avatar}
          photoUrl={shown}
          className="size-28 ring-4 ring-mint-tint"
        />
        {busy ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-white/60">
            <Loader2
              aria-label={strings.photo.uploading}
              className="size-6 animate-spin motion-reduce:animate-none"
            />
          </span>
        ) : null}
      </div>

      {canUpload && onBehalf ? (
        <AlertDialog
          open={asking}
          onOpenChange={setAsking}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {formatMessage(strings.photo.agreeTitle, { name }, language)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {formatMessage(strings.photo.riderAgrees, { name }, language)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{strings.photo.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  agreed.current = true;
                  input.current?.click();
                }}
              >
                {formatMessage(strings.photo.agreeAction, { name }, language)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <div className="flex flex-wrap justify-center gap-1.25">
        {canUpload ? (
          <>
            <input
              ref={input}
              type="file"
              accept={IMAGE_MIMES.join(",")}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-line"
              disabled={busy}
              onClick={choose}
            >
              <Camera aria-hidden />
              {photo ? strings.photo.change : strings.photo.add}
            </Button>
          </>
        ) : null}
        {photo && canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={() => void remove()}
          >
            <Trash2 aria-hidden />
            {strings.photo.remove}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
