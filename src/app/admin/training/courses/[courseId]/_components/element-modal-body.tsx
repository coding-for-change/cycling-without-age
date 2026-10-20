import { markdownToolLabels } from "@/components/markdown-editor";
import { SaveStatusProvider } from "@/components/save-status";
import { trainingPlayerStrings } from "@/components/training-player-strings";
import {
  training,
  type ContentLanguage,
  type VideoFailureCode,
} from "@/features/training";
import { videoPickerStrings } from "@/features/training/components/strings";
import { allowsAdmin } from "@/lib/access";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { SearchParams } from "@/lib/search-params";
import { readActiveScope, scopeQuery } from "../../../../active-scope";
import { scopeArgOf } from "../../../../scope-cookie";
import {
  clockOf,
  contentLanguages,
  languageLabel,
  ownerOf,
  visibleSearchOf,
} from "./element-facts";
import type { ElementHeaderLabels } from "./element-header";
import { ElementLesson } from "./element-lesson";
import { ElementMissing } from "./element-missing";
import { ElementQuiz } from "./element-quiz";

export async function ElementModalBody({
  courseId,
  elementId,
  searchParams,
}: {
  courseId: string;
  elementId: string;
  searchParams: Promise<SearchParams>;
}) {
  const [{ session, scope, active }, dict, language] = await Promise.all([
    readActiveScope(searchParams, "training"),
    getDictionary(),
    getLocale(),
  ]);
  const strings = dict.admin.training;
  const [course, element] = await Promise.all([
    training.getCourse(courseId),
    training.getElement(elementId),
  ]);
  if (
    !course ||
    !element ||
    element.courseId !== course.id ||
    !training.familyVisibleTo(course.family, visibleSearchOf(scope))
  )
    return (
      <ElementMissing
        message={strings.element.missing}
        close={strings.element.close}
      />
    );

  const canManage = allowsAdmin(
    session.access,
    await training.elementAuthority(element.id),
  );
  const errors = { ...dict.common.errors, ...strings.errors };
  const owner = ownerOf(course.family, dict);
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);
  const save = {
    saved: dict.common.field.saved,
    undo: dict.common.field.undo,
    undone: dict.common.field.undone,
    errors,
  };
  const header: ElementHeaderLabels = {
    kind: strings.element.kinds[element.kind],
    trail: strings.element.trail,
    close: strings.element.close,
    cancel: strings.lesson.cancel,
    save: {
      saving: dict.common.field.saving,
      saved: dict.common.field.savedAt,
    },
    delete: {
      ...(element.kind === "quiz"
        ? strings.element.deleteQuiz
        : strings.lesson.delete),
      errors,
    },
  };

  if (element.kind === "quiz") {
    const questions = await training.listQuestions(element.id);
    const query = scopeQuery(active);
    return (
      <SaveStatusProvider>
        <ElementQuiz
          quiz={{
            id: element.id,
            courseTitle: course.title,
            title: element.title,
            shuffle: element.quizShuffle,
            drawCount: element.quizDrawCount,
          }}
          questions={questions.map((question) => ({
            id: question.id,
            kind: question.kind,
            prompt: question.prompt,
            explanation: question.explanation,
            options: question.options.map(({ id, text, correct }) => ({
              id,
              text,
              correct,
            })),
          }))}
          canManage={canManage}
          previewHref={`/admin/training/courses/${course.id}/preview/${element.id}${query}`}
          language={language}
          labels={{
            header,
            settings: {
              settings: strings.quiz.settings,
              shuffle: strings.quiz.shuffle,
              shuffleHint: strings.quiz.shuffleHint,
              draw: strings.quiz.draw,
              drawAll: strings.quiz.drawAll,
              drawCount: strings.quiz.drawCount,
              preview: strings.quiz.preview,
              readOnly: say(strings.quiz.readOnly, { owner }),
              save,
            },
            editor: {
              ...strings.quiz,
              orderSaved: strings.course.orderSaved,
              errors,
              save,
            },
          }}
        />
      </SaveStatusProvider>
    );
  }

  const videos = canManage ? await training.courseVideoLibrary(course.id) : [];
  const current = element.video;
  const playback = current ? training.playbackOf(current) : null;

  return (
    <SaveStatusProvider>
      <ElementLesson
        lesson={{
          id: element.id,
          courseTitle: course.title,
          courseLanguage: course.language as ContentLanguage,
          title: element.title,
          body: element.body,
          attachmentFileId: element.attachmentFileId,
          video: current
            ? {
                id: current.id,
                title: current.title,
                meta: [
                  languageLabel(current.language, language),
                  clockOf(current.durationSeconds),
                ]
                  .filter(Boolean)
                  .join(" · "),
                poster: training.posterOf(current),
                archived: current.archivedAt !== null,
              }
            : null,
          playback: playback
            ? { src: playback.src, poster: playback.poster }
            : null,
        }}
        videos={videos.map((video) => ({
          id: video.id,
          title: video.title,
          language: video.language,
          status: video.status,
          progress: video.progress,
          failureCode: video.failureCode as VideoFailureCode | null,
          duration: clockOf(video.durationSeconds),
          poster: training.posterOf(video),
          archived: video.archivedAt !== null,
        }))}
        languages={contentLanguages(language)}
        canManage={canManage}
        scope={scopeArgOf(active)}
        limits={{
          maxBytes: training.maxUploadBytes(),
          maxDurationSeconds: training.maxDurationSeconds(),
        }}
        language={language}
        player={trainingPlayerStrings(dict)}
        picker={videoPickerStrings(dict)}
        labels={{
          header,
          title: strings.lesson.title,
          titlePlaceholder: strings.lesson.titlePlaceholder,
          body: strings.lesson.body,
          bodyPlaceholder: strings.lesson.bodyPlaceholder,
          video: strings.lesson.video,
          videoNone: strings.lesson.videoNone,
          attachment: strings.lesson.attachment,
          attachmentLabels: strings.lesson.attachmentLabels,
          readOnly: say(strings.lesson.readOnly, { owner }),
          markdown: markdownToolLabels(dict),
          errors,
          videoField: {
            replace: strings.lesson.videoReplace,
            remove: strings.lesson.videoRemove,
            set: strings.lesson.videoSet,
            removed: strings.lesson.videoRemoved,
            uploading: strings.lesson.videoUploading,
            preparing: strings.lesson.videoPreparing,
            pending: strings.lesson.videoPending,
            archived: strings.lesson.videoArchived,
            save,
          },
        }}
      />
    </SaveStatusProvider>
  );
}
