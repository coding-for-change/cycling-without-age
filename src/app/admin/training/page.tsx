import { Suspense, cache } from "react";
import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  activeOwnerOf,
  training,
  type CatalogueFamily,
} from "@/features/training";
import { pickVariant } from "@/features/training/requirements";
import { allowsAdmin } from "@/lib/access";
import { isTrainingRequired } from "@/lib/feature-flags";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { AdminPageShell } from "../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { scopeArgOf } from "../scope-cookie";
import { CourseCreateDrawer } from "./_components/course-create-drawer";
import {
  activeOwnerName,
  courseCreateLabels,
  familyFitsOwner,
  familyLabel,
  manageableFamilies,
} from "./_components/course-facts";
import { CourseList, type CourseListRow } from "./_components/course-list";
import { TrainingHeader } from "./_components/training-header";
import {
  CourseRowsSkeleton,
  TrainingActionSkeleton,
  TrainingHeaderSkeleton,
} from "./_components/training-skeleton";
import {
  catalogueCountryIds,
  defaultLanguage,
  defaultOwnerKey,
  languageName,
  languageOptions,
  ownerOptions,
} from "./_components/video-facts";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function TrainingPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<TrainingHeaderSkeleton action />}>
        <TrainingHeader
          action={
            <Suspense fallback={<TrainingActionSkeleton />}>
              <CreateCourse searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={<CourseRowsSkeleton />}>
        <Courses searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

const loadCourses = cache(async (searchParams: Promise<AdminSearchParams>) => {
  const { session, scope, active, scopeQuery, chapters, chapterIds } =
    await readActiveScope(searchParams, "training");
  const activeOwner = activeOwnerOf(scope, active);
  const [families, dict, language] = await Promise.all([
    training.listCourseCatalogue(
      {
        countryIds: catalogueCountryIds(scope, active, chapters),
        chapterIds,
      },
      activeOwner,
    ),
    getDictionary(),
    getLocale(),
  ]);
  return {
    session,
    scope,
    active,
    activeOwner,
    scopeQuery,
    chapters,
    families,
    dict,
    language,
  };
});

async function CreateCourse({ searchParams }: PageProps) {
  const {
    session,
    scope,
    active,
    scopeQuery,
    chapters,
    families,
    dict,
    language,
  } = await loadCourses(searchParams);
  const owners = ownerOptions(scope, active, chapters, dict, language);

  return (
    <CourseCreateDrawer
      owners={owners}
      defaultOwnerKey={defaultOwnerKey(active, owners)}
      families={manageableFamilies(families, session.access, language)}
      languages={languageOptions(language)}
      defaultLanguage={defaultLanguage(language)}
      scopeQuery={scopeQuery}
      labels={courseCreateLabels(dict)}
      locale={language}
    />
  );
}

const requirementPlace = (
  row: CatalogueFamily["requiredIn"][number],
  dict: Dictionary,
  language: string,
) => {
  const labels = dict.admin.training.list;
  const name = row.ownerName ?? labels.everywhere;
  return {
    key: row.requirementId,
    label:
      row.relation === "inherited"
        ? formatMessage(labels.inherited, { name }, language)
        : name,
    inherited: row.relation === "inherited",
  };
};

async function Courses({ searchParams }: PageProps) {
  const {
    session,
    scope,
    active,
    activeOwner,
    scopeQuery,
    families,
    dict,
    language,
  } = await loadCourses(searchParams);
  const labels = dict.admin.training.list;
  const requirements = isTrainingRequired();
  const requiring = requirements ? activeOwner : null;
  const scopeName = activeOwnerName(activeOwner, scope, active, dict);

  const shown = families.filter((family) => family.variants.length > 0);
  if (shown.length === 0)
    return (
      <EmptyState
        icon={GraduationCap}
        title={dict.admin.training.courses.emptyTitle}
        className="flex-1 justify-start border-none pt-16"
      >
        {dict.admin.training.courses.empty}
      </EmptyState>
    );

  const rows = shown.map((family): CourseListRow => {
    const main = pickVariant(family.variants, [language, "en"])!;
    const publishedCount = family.variants.filter(
      (variant) => variant.published,
    ).length;
    const inherited = family.requiredIn.find(
      (row) => row.relation === "inherited",
    );
    return {
      familyId: family.familyId,
      courseId: main.courseId,
      title: familyLabel(family.variants, language),
      summary: main.summary,
      scope: family.scope,
      scopeLabel: labels.scopes[family.scope],
      ownerName: family.ownerName,
      lessons: main.lessons,
      quizzes: main.quizzes,
      status: publishedCount > 0 ? "published" : "draft",
      publishedCount,
      variants: family.variants.map((variant) => ({
        courseId: variant.courseId,
        language: variant.language,
        languageLabel: languageName(variant.language, language),
        published: variant.published,
      })),
      required: family.required,
      requiredEffective: family.requiredEffective,
      requiredIn: family.requiredIn.map((row) =>
        requirementPlace(row, dict, language),
      ),
      inheritedFrom: inherited
        ? (inherited.ownerName ?? labels.everywhere)
        : null,
      canManage: allowsAdmin(session.access, family.authority),
      canRequire:
        requiring !== null &&
        scopeName !== null &&
        familyFitsOwner(family, requiring),
    };
  });

  return (
    <CourseList
      rows={rows}
      scopeQuery={scopeQuery}
      scopeArg={scopeArgOf(active)}
      scopeName={scopeName}
      requirements={requirements}
      labels={{
        ...labels,
        errors: { ...dict.common.errors, ...dict.admin.training.errors },
      }}
      table={dict.admin.table}
      locale={language}
    />
  );
}
