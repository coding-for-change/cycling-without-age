import { Suspense } from "react";
import { notFound } from "next/navigation";
import { activeOwnerOf, training } from "@/features/training";
import { isTrainingRequired } from "@/lib/feature-flags";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { BackLink } from "../../../../_components/detail-page";
import { deletionConsequences } from "../../../../_components/deletion-consequences";
import {
  readActiveScope,
  type AdminSearchParams,
} from "../../../../active-scope";
import { CourseCreateDrawer } from "../../../_components/course-create-drawer";
import {
  activeOwnerName,
  canManageFamily,
  courseCreateLabels,
  familyFitsOwner,
  familyLabel,
  ownerLabelOf,
  ownerNameOrScope,
  scopeSearch,
} from "../../../_components/course-facts";
import {
  defaultLanguage,
  formatClock,
  languageName,
  languageOptions,
} from "../../../_components/video-facts";
import { CourseDetail } from "./course-detail";
import { CourseProgressSection } from "./course-progress";
import { CourseProgressSkeleton } from "./course-skeleton";

export async function CourseBody({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scope, active, scopeQuery, chapterIds }, { courseId }] =
    await Promise.all([readActiveScope(searchParams, "training"), params]);

  const course = await training.getCourse(courseId);
  if (!course || !training.familyVisibleTo(course.family, scopeSearch(scope)))
    notFound();

  const canManage = canManageFamily(session.access, course.family);

  const [elements, consequences, dict, language] = await Promise.all([
    training.courseElements(course.id),
    canManage ? training.courseConsequences(course.id) : null,
    getDictionary(),
    getLocale(),
  ]);

  const strings = dict.admin.training;
  const labels = strings.course;
  const list = strings.list;
  const errors = { ...dict.common.errors, ...strings.errors };
  const backHref = `/admin/training${scopeQuery}`;
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);

  const activeOwner = activeOwnerOf(scope, active);
  const ownerScopeName = activeOwnerName(activeOwner, scope, active, dict);
  const requirements = isTrainingRequired();
  const canRequire =
    requirements &&
    activeOwner !== null &&
    ownerScopeName !== null &&
    familyFitsOwner(course.family, activeOwner);
  const owner = ownerNameOrScope(course.family, dict);
  const progressScope =
    active.kind === "chapter"
      ? active.chapter.name
      : active.kind === "country"
        ? active.country.name
        : list.everyone;

  return (
    <>
      <BackLink
        href={backHref}
        label={labels.back}
      />
      <CourseDetail
        course={{
          id: course.id,
          familyId: course.familyId,
          title: course.title,
          summary: course.summary,
          language: course.language,
          languageLabel: languageName(course.language, language),
          published: course.publishedAt !== null,
          scopeLabel: list.scopes[course.family.scope],
          ownerLabel: ownerLabelOf(course.family, dict),
          ownerName: training.ownerNameOfFamily(course.family),
          variants: course.family.courses.map((variant) => ({
            courseId: variant.id,
            language: variant.language,
            languageLabel: languageName(variant.language, language),
            title: variant.title,
            published: variant.publishedAt !== null,
          })),
        }}
        elements={elements.map((element) => ({
          id: element.id,
          kind: element.kind,
          position: element.position,
          title: element.title,
          meta:
            element.kind === "quiz"
              ? say(labels.questionCount, { count: element.questionCount })
              : (formatClock(element.durationSeconds) ?? labels.noVideo),
        }))}
        canManage={canManage}
        scopeQuery={scopeQuery}
        backHref={backHref}
        language={language}
        consequences={
          consequences
            ? [
                ...deletionConsequences(
                  { lessons: consequences.lessons },
                  dict.admin.deletion,
                  language,
                ),
                ...(consequences.quizzes > 0
                  ? [
                      say(labels.consequenceQuizzes, {
                        count: consequences.quizzes,
                      }),
                    ]
                  : []),
                ...deletionConsequences(
                  {
                    questions: consequences.questions,
                    enrollments: consequences.enrollments,
                    completions: consequences.passed,
                  },
                  dict.admin.deletion,
                  language,
                ),
              ]
            : []
        }
        progress={
          requirements ? (
            <Suspense fallback={<CourseProgressSkeleton />}>
              <CourseProgressSection
                courseId={course.id}
                chapterIds={chapterIds}
                includeNames={active.kind === "chapter"}
                scopeName={progressScope}
                scopeQuery={scopeQuery}
              />
            </Suspense>
          ) : null
        }
        labels={{
          ...labels,
          lessonCount: list.lessonCount,
          quizCount: list.quizCount,
          notice: canRequire
            ? say(labels.managedByRequire, {
                owner,
                scope: ownerScopeName ?? "",
              })
            : say(labels.managedBy, { owner }),
          consequences: dict.admin.deletion.consequences,
          save: {
            saving: dict.common.field.saving,
            saved: dict.common.field.savedAt,
          },
          field: { ...dict.common.field, errors },
          errors,
        }}
      />
      {canManage ? (
        <CourseCreateDrawer
          trigger={false}
          owners={[]}
          defaultOwnerKey=""
          families={[
            {
              id: course.familyId,
              label: familyLabel(course.family.courses, language),
              languages: course.family.courses.map((v) => v.language),
            },
          ]}
          languages={languageOptions(language)}
          defaultLanguage={defaultLanguage(language)}
          scopeQuery={scopeQuery}
          labels={courseCreateLabels(dict)}
          locale={language}
        />
      ) : null}
    </>
  );
}
