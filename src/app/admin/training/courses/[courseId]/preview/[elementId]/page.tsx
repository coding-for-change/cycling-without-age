import { Suspense } from "react";
import { notFound } from "next/navigation";
import { training } from "@/features/training";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageShell } from "../../../../../_components/admin-page";
import { BackLink } from "../../../../../_components/detail-page";
import {
  readActiveScope,
  type AdminSearchParams,
} from "../../../../../active-scope";
import { visibleSearchOf } from "../../_components/element-facts";
import { PreviewQuiz } from "./_components/preview-quiz";
import { PreviewSkeleton } from "./_components/preview-skeleton";

type PageProps = {
  params: Promise<{ courseId: string; elementId: string }>;
  searchParams: Promise<AdminSearchParams>;
};

export default function QuizPreviewPage(props: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PreviewSkeleton />}>
        <Preview {...props} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Preview({ params, searchParams }: PageProps) {
  const [{ scope, scopeQuery }, { courseId, elementId }] = await Promise.all([
    readActiveScope(searchParams, "training"),
    params,
  ]);
  const [course, quiz] = await Promise.all([
    training.getCourse(courseId),
    training.getElement(elementId),
  ]);
  if (
    !course ||
    !quiz ||
    quiz.kind !== "quiz" ||
    quiz.courseId !== course.id ||
    !training.familyVisibleTo(course.family, visibleSearchOf(scope))
  )
    notFound();

  const [initial, dict, language] = await Promise.all([
    training.previewQuiz(quiz.id),
    getDictionary(),
    getLocale(),
  ]);
  const separator = scopeQuery ? "&" : "?";
  const backHref = `/admin/training/courses/${course.id}${scopeQuery}${separator}element=${quiz.id}`;

  return (
    <>
      <BackLink
        href={backHref}
        label={quiz.title}
      />
      <div className="mx-auto w-full max-w-2xl">
        <PreviewQuiz
          elementId={quiz.id}
          initial={initial}
          strings={dict.pilot.training.quiz}
          language={language}
          backHref={backHref}
        />
      </div>
    </>
  );
}
