"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { reportSave, type SaveLabels } from "@/components/action-feedback";
import { RichText } from "@/components/markdown";
import {
  MarkdownEditor,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";
import { useSaveStatus } from "@/components/save-status";
import { LazyTrainingPlayer } from "@/components/training-player-lazy";
import type { TrainingPlayerStrings } from "@/components/training-player-strings";
import { Input } from "@/components/ui/input";
import { updateElementAction } from "@/features/training/actions";
import {
  LessonAttachmentField,
  type LessonAttachmentLabels,
} from "@/features/training/components/lesson-attachment-field";
import {
  LessonVideoField,
  type LessonVideo,
  type LessonVideoLabels,
} from "@/features/training/components/lesson-video-field";
import type { VideoPickerStrings } from "@/features/training/components/strings";
import type { UploadLimits } from "@/features/training/components/use-start-uploads";
import type { LibraryVideoView } from "@/features/training/components/video-library-modal";
import type { ContentLanguage } from "@/features/training/schemas";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { fileUrl } from "@/lib/storage/file-url";
import { ElementHeader, type ElementHeaderLabels } from "./element-header";

const SAVE_DELAY_MS = 700;
const TITLE_MAX = 160;
const BODY_MAX = 50_000;

export type LessonEditorLabels = {
  header: ElementHeaderLabels;
  title: string;
  titlePlaceholder: string;
  body: string;
  bodyPlaceholder: string;
  video: string;
  videoNone: string;
  attachment: string;
  attachmentLabels: LessonAttachmentLabels;
  readOnly: string;
  markdown: MarkdownToolLabels;
  errors: SaveLabels["errors"];
  videoField: LessonVideoLabels;
};

export type LessonEditorData = {
  id: string;
  courseTitle: string;
  courseLanguage: ContentLanguage;
  title: string;
  body: string | null;
  attachmentFileId: string | null;
  video: LessonVideo | null;
  playback: { src: string; poster: string } | null;
};

type Draft = { title: string; body: string };

export function ElementLesson({
  lesson,
  videos,
  languages,
  canManage,
  scope,
  limits,
  language,
  player,
  picker,
  labels,
}: {
  lesson: LessonEditorData;
  videos: LibraryVideoView[];
  languages: { value: ContentLanguage; label: string }[];
  canManage: boolean;
  scope?: string;
  limits: UploadLimits;
  language: Locale;
  player: TrainingPlayerStrings;
  picker: VideoPickerStrings;
  labels: LessonEditorLabels;
}) {
  const titleId = useId();
  const bodyId = useId();
  const report = useSaveStatus();
  const [draft, setDraft] = useState<Draft>({
    title: lesson.title,
    body: lesson.body ?? "",
  });
  const saved = useRef<Draft>({ title: lesson.title, body: lesson.body ?? "" });
  const latest = useRef(draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = latest.current;
    const title = next.title.trim();
    const change: { title?: string; body?: string | null } = {};
    if (title && title !== saved.current.title) change.title = title;
    if (next.body !== saved.current.body)
      change.body = next.body.trim() ? next.body : null;
    if (Object.keys(change).length === 0) return;
    saved.current = {
      title: change.title ?? saved.current.title,
      body: next.body,
    };
    report("saving");
    const result = await updateElementAction(lesson.id, change);
    if (result.ok) {
      report("saved");
      return;
    }
    report("failed");
    haptics.error();
    toast.error(labels.errors[result.error] ?? labels.errors.generic);
  };

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => void flushRef.current(), []);

  const update = (change: Partial<Draft>) => {
    const next = { ...latest.current, ...change };
    latest.current = next;
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
  };

  const attachment = useAttachment(lesson, labels);

  return (
    <>
      <ElementHeader
        elementId={lesson.id}
        kind="lesson"
        courseTitle={lesson.courseTitle}
        title={draft.title.trim() || lesson.title}
        canManage={canManage}
        language={language}
        labels={labels.header}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper">
        <div className="grid w-full gap-8 px-4 py-5 sm:px-8 sm:py-8">
          {canManage ? null : (
            <p className="rounded-(--r-card) bg-canvas-deep px-4 py-3 text-2sm text-pretty text-ink-soft">
              {labels.readOnly}
            </p>
          )}

          <section className="grid gap-5">
            <div className="grid gap-2">
              <label
                htmlFor={titleId}
                className="text-2sm font-medium text-ink"
              >
                {labels.title}
              </label>
              {canManage ? (
                <Input
                  id={titleId}
                  value={draft.title}
                  maxLength={TITLE_MAX}
                  autoComplete="off"
                  placeholder={labels.titlePlaceholder}
                  aria-invalid={!draft.title.trim()}
                  onChange={(event) => update({ title: event.target.value })}
                  onBlur={() => void flush()}
                  className="h-11 rounded-(--r-card) border-line text-base"
                />
              ) : (
                <p
                  id={titleId}
                  className="text-base text-ink"
                >
                  {lesson.title}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor={bodyId}
                className="text-2sm font-medium text-ink"
              >
                {labels.body}
              </label>
              {canManage ? (
                <MarkdownEditor
                  id={bodyId}
                  value={draft.body}
                  maxLength={BODY_MAX}
                  minRows={8}
                  toolbar="top"
                  labels={labels.markdown}
                  placeholder={labels.bodyPlaceholder}
                  onChange={(body) => update({ body })}
                  onBlur={() => void flush()}
                  fieldClassName="px-4 py-3"
                  areaClassName="min-h-60 max-h-none"
                />
              ) : lesson.body ? (
                <div className="rounded-(--r-card) border border-line px-4 py-3">
                  <RichText text={lesson.body} />
                </div>
              ) : (
                <p className="text-2sm text-ink-faint">
                  {labels.bodyPlaceholder}
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-2sm font-medium text-ink">{labels.video}</h3>
            {canManage ? (
              <LessonVideoField
                elementId={lesson.id}
                video={lesson.video}
                videos={videos}
                courseLanguage={lesson.courseLanguage}
                languages={languages}
                scope={scope}
                limits={limits}
                language={language}
                strings={picker}
                labels={labels.videoField}
              />
            ) : lesson.playback && lesson.video ? (
              <LazyTrainingPlayer
                key={lesson.playback.src}
                src={lesson.playback.src}
                poster={lesson.playback.poster}
                title={lesson.video.title}
                strings={player}
                locale={language}
                className="overflow-hidden rounded-(--r-card)"
              />
            ) : (
              <p className="text-2sm text-ink-faint">{labels.videoNone}</p>
            )}
          </section>

          {canManage || lesson.attachmentFileId ? (
            <section className="grid gap-3">
              <h3 className="text-2sm font-medium text-ink">
                {labels.attachment}
              </h3>
              {canManage ? (
                <LessonAttachmentField
                  value={attachment.value}
                  labels={labels.attachmentLabels}
                  onChange={attachment.change}
                />
              ) : lesson.attachmentFileId ? (
                <a
                  href={fileUrl(lesson.attachmentFileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex max-w-md items-center gap-3 rounded-(--r-card) border border-line p-3 text-2sm transition-colors hover:bg-canvas-deep"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-canvas-deep text-ink-soft">
                    <FileText
                      aria-hidden
                      className="size-5"
                    />
                  </span>
                  <span className="grid min-w-0">
                    <span className="truncate font-medium">
                      {labels.attachmentLabels.name}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {labels.attachmentLabels.open}
                    </span>
                  </span>
                </a>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function useAttachment(lesson: LessonEditorData, labels: LessonEditorLabels) {
  const report = useSaveStatus();
  const [value, setValue] = useState(lesson.attachmentFileId);
  const [synced, setSynced] = useState(lesson.attachmentFileId);
  if (synced !== lesson.attachmentFileId) {
    setSynced(lesson.attachmentFileId);
    setValue(lesson.attachmentFileId);
  }

  const change = async (next: string | null) => {
    const previous = value;
    setValue(next);
    report("saving");
    const ok = reportSave(
      await updateElementAction(lesson.id, { attachmentFileId: next }),
      { report, labels: labels.videoField.save },
    );
    if (!ok) setValue(previous);
  };

  return { value, change };
}
