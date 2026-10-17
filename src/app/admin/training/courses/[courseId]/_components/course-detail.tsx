"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { GraduationCap, Plus } from "lucide-react";
import type { ActionResult } from "@/components/action-feedback";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { InlineFieldLabels } from "@/components/inline-field";
import { Button } from "@/components/ui/button";
import {
  deleteCourseAction,
  updateCourseAction,
} from "@/features/training/actions";
import type { CourseUpdateInput } from "@/features/training/schemas";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import {
  DetailEditorShell,
  DetailHeader,
  DetailHeaderActions,
  DetailMediaIcon,
  DetailMeta,
  DetailNotice,
  DetailSection,
  MetaBadge,
} from "../../../../_components/detail-page";
import { DetailTitle } from "../../../../_components/detail-title";
import { EditableText } from "../../../../_components/editable-text";
import { PropertySwitch } from "../../../../_components/optimistic-properties";
import {
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../../_components/properties";
import { SidePanel } from "../../../../_components/side-panel";
import { CourseElements, type CourseElementRow } from "./course-elements";

export type CourseDetailData = {
  id: string;
  familyId: string;
  title: string;
  summary: string | null;
  language: string;
  languageLabel: string;
  published: boolean;
  scopeLabel: string;
  ownerLabel: string;
  ownerName: string | null;
  variants: {
    courseId: string;
    language: string;
    languageLabel: string;
    title: string;
    published: boolean;
  }[];
};

export type CourseDetailLabels = Dictionary["admin"]["training"]["course"] & {
  consequences: string;
  notice: string;
  lessonCount: string;
  quizCount: string;
  save: { saving: string; saved: string };
  field: InlineFieldLabels;
  errors: InlineFieldLabels["errors"];
};

export function CourseDetail({
  course,
  elements,
  canManage,
  scopeQuery,
  backHref,
  language,
  consequences,
  progress,
  labels,
}: {
  course: CourseDetailData;
  elements: CourseElementRow[];
  canManage: boolean;
  scopeQuery: string;
  backHref: string;
  language: Locale;
  consequences: string[];
  progress: ReactNode;
  labels: CourseDetailLabels;
}) {
  const publishedId = useId();
  const save = (input: CourseUpdateInput): Promise<ActionResult> =>
    updateCourseAction(course.id, input);
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);
  const lessons = elements.filter((element) => element.kind === "lesson");
  const counts = `${say(labels.lessonCount, { count: lessons.length })} · ${say(
    labels.quizCount,
    { count: elements.length - lessons.length },
  )}`;
  const courseHref = (courseId: string) =>
    `/admin/training/courses/${courseId}${scopeQuery}`;
  const withParams = (extra: string) =>
    `${courseHref(course.id)}${scopeQuery ? "&" : "?"}${extra}`;

  const header = (
    <DetailHeader
      media={<DetailMediaIcon icon={GraduationCap} />}
      title={
        <DetailTitle
          value={course.title}
          label={labels.title}
          maxLength={160}
          onSave={canManage ? (next) => save({ title: next }) : undefined}
          labels={labels.field}
        />
      }
      aside={
        canManage ? (
          <DetailHeaderActions
            saveStatus={{ labels: labels.save, words: language }}
          />
        ) : undefined
      }
    >
      <DetailMeta>
        <MetaBadge>{course.scopeLabel}</MetaBadge>
        {course.published ? (
          <MetaBadge className="bg-mint">{labels.published}</MetaBadge>
        ) : null}
        {course.ownerName}
        {course.languageLabel}
        {counts}
      </DetailMeta>
    </DetailHeader>
  );

  const panels = (
    <>
      <SidePanel title={labels.properties}>
        <PropertyList>
          <PropertyRow
            label={labels.published}
            htmlFor={canManage ? publishedId : undefined}
          >
            {canManage ? (
              <PropertySwitch
                id={publishedId}
                value={course.published}
                label={labels.published}
                onSave={(next) => save({ published: next })}
                labels={labels.field}
              />
            ) : (
              <PropertyValue>
                {course.published ? labels.published : "–"}
              </PropertyValue>
            )}
          </PropertyRow>
          <PropertyRow label={labels.language}>
            <PropertyValue>{course.languageLabel}</PropertyValue>
          </PropertyRow>
          <PropertyRow label={labels.owner}>
            <PropertyValue>{course.ownerLabel}</PropertyValue>
          </PropertyRow>
        </PropertyList>
        {canManage ? (
          <p className="text-xs text-ink-soft">{labels.publishedHint}</p>
        ) : null}
      </SidePanel>

      <SidePanel
        title={labels.languages}
        meta={course.variants.length}
        action={
          canManage ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-7 text-ink-soft hover:text-ink"
            >
              <Link
                href={withParams(`new=1&family=${course.familyId}`)}
                scroll={false}
                aria-label={labels.addLanguage}
                title={labels.addLanguage}
              >
                <Plus aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      >
        <ul className="grid gap-0.5">
          {course.variants.map((variant) => (
            <li
              key={variant.courseId}
              className="min-w-0"
            >
              <Link
                href={courseHref(variant.courseId)}
                aria-current={
                  variant.courseId === course.id ? "page" : undefined
                }
                className={cn(
                  "-mx-2 flex min-h-8 items-center gap-2 rounded-md px-2 text-2sm transition-colors hover:bg-canvas-deeper",
                  variant.courseId === course.id && "bg-canvas font-medium",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    variant.published
                      ? "bg-mint-deep"
                      : "border border-ink-faint",
                  )}
                />
                <span className="w-24 shrink-0 truncate">
                  {variant.languageLabel}
                </span>
                <span className="min-w-0 truncate text-ink-soft">
                  {variant.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SidePanel>

      {canManage ? (
        <SidePanel
          title={labels.danger}
          defaultOpen={false}
        >
          <p className="text-xs text-ink-soft">{labels.dangerHint}</p>
          <ConfirmDeleteDialog
            name={course.title}
            consequences={consequences}
            locale={language}
            labels={{
              ...labels.delete,
              consequences: labels.consequences,
              errors: labels.errors,
            }}
            cancel={labels.cancel}
            action={deleteCourseAction}
            input={course.id}
            redirectTo={backHref}
          />
        </SidePanel>
      ) : null}

      {canManage ? null : <DetailNotice>{labels.notice}</DetailNotice>}
    </>
  );

  return (
    <DetailEditorShell
      header={header}
      panels={panels}
    >
      <DetailSection
        bordered={false}
        title={labels.summary}
      >
        <EditableText
          editable={canManage}
          multiline
          maxLength={2_000}
          value={course.summary}
          label={labels.summary}
          placeholder={labels.summaryPlaceholder}
          onSave={(next) => save({ summary: next })}
          labels={labels.field}
        />
      </DetailSection>
      <CourseElements
        courseId={course.id}
        elements={elements}
        editable={canManage}
        description={counts}
        language={language}
        labels={labels}
      />
      {progress}
    </DetailEditorShell>
  );
}
