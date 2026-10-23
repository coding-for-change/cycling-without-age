"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpRight,
  Ellipsis,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  courseRequiredImpactAction,
  setCourseRequiredAction,
  updateCourseAction,
} from "@/features/training/actions";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type ScopeName = "global" | "country" | "chapter";

export type CourseListRow = {
  familyId: string;
  courseId: string;
  title: string;
  summary: string | null;
  scope: ScopeName;
  scopeLabel: string;
  ownerName: string | null;
  lessons: number;
  quizzes: number;
  status: "published" | "draft";
  publishedCount: number;
  variants: {
    courseId: string;
    language: string;
    languageLabel: string;
    published: boolean;
  }[];
  required: boolean;
  requiredEffective: boolean;
  requiredIn: { key: string; label: string; inherited: boolean }[];
  inheritedFrom: string | null;
  canManage: boolean;
  canRequire: boolean;
};

export type CourseListLabels = Dictionary["admin"]["training"]["list"] & {
  errors: NotifyLabels["errors"];
};

const MENU_ITEM = "rounded-xl py-2.5";

export function CourseList({
  rows,
  scopeQuery,
  scopeArg,
  scopeName,
  requirements,
  labels,
  table,
  locale,
}: {
  rows: CourseListRow[];
  scopeQuery: string;
  scopeArg: string;
  scopeName: string | null;
  requirements: boolean;
  labels: CourseListLabels;
  table: DataTableStrings;
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<{
    row: CourseListRow;
    pilots: number;
  } | null>(null);
  const href = (courseId: string) =>
    `/admin/training/courses/${courseId}${scopeQuery}`;
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, locale);
  const scope = scopeName ?? "";

  const publish = (
    row: CourseListRow,
    variants: CourseListRow["variants"],
    published: boolean,
  ) =>
    startTransition(async () => {
      for (const variant of variants) {
        const result = await updateCourseAction(variant.courseId, {
          published,
        });
        if (!result.ok) {
          notify(result, { done: "", errors: labels.errors });
          return;
        }
      }
      notify(
        { ok: true },
        {
          done: say(
            published ? labels.done.published : labels.done.unpublished,
            {
              name:
                variants.length === 1 && row.variants.length > 1
                  ? `${row.title} (${variants[0].languageLabel})`
                  : row.title,
            },
          ),
          errors: labels.errors,
        },
      );
    });

  const setRequired = (row: CourseListRow, required: boolean) =>
    startTransition(async () => {
      const result = await setCourseRequiredAction({
        familyId: row.familyId,
        required,
        scope: scopeArg,
      });
      notify(result, {
        done: say(required ? labels.done.required : labels.done.notRequired, {
          name: row.title,
          scope,
        }),
        errors: labels.errors,
      });
    });

  const requireWithImpact = (row: CourseListRow) =>
    startTransition(async () => {
      const impact = await courseRequiredImpactAction({
        familyId: row.familyId,
        scope: scopeArg,
      });
      if (!impact.ok) {
        notify(impact, { done: "", errors: labels.errors });
        return;
      }
      if (impact.pilots > 0) {
        setConfirming({ row, pilots: impact.pilots });
        return;
      }
      setRequired(row, true);
    });

  const allColumns: ColumnDef<CourseListRow, unknown>[] = [
    {
      id: "course",
      accessorFn: (row) => row.title,
      enableHiding: false,
      enableSorting: true,
      meta: {
        label: labels.columns.course,
        searchValue: (row) =>
          `${row.title} ${row.summary ?? ""} ${row.ownerName ?? ""}`,
        mobile: {
          title: (row) => row.title,
          subtitle: (row) => row.summary,
        },
      },
      cell: ({ row }) => (
        <div className="grid min-w-0">
          <Link
            href={href(row.original.courseId)}
            onClick={stopRowClick}
            className="truncate font-medium hover:underline"
          >
            {row.original.title}
          </Link>
          {row.original.summary ? (
            <span className="max-w-96 truncate text-xs text-ink-soft">
              {row.original.summary}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "languages",
      accessorFn: (row) => row.variants.map((v) => v.language).join(" "),
      meta: { label: labels.columns.languages },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.25">
          {row.original.variants.map((variant) => (
            <Link
              key={variant.courseId}
              href={href(variant.courseId)}
              onClick={stopRowClick}
              title={variant.languageLabel}
              aria-label={variant.languageLabel}
              className={cn(
                "inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-xs font-medium uppercase tabular-nums transition-colors hover:border-ink-faint",
                variant.published
                  ? "border-transparent bg-mint-tint text-ink"
                  : "border-dashed border-line text-ink-soft",
              )}
            >
              {variant.language}
            </Link>
          ))}
        </div>
      ),
    },
    {
      id: "owner",
      accessorFn: (row) => row.scope,
      filterFn: "equalsString",
      meta: { label: labels.columns.owner },
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              row.original.scope === "global"
                ? "bg-mint font-normal text-ink"
                : "bg-mint-tint font-normal text-ink"
            }
          >
            {row.original.scopeLabel}
          </Badge>
          {row.original.ownerName ? (
            <span className="text-2sm text-ink-soft">
              {row.original.ownerName}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      filterFn: "equalsString",
      meta: { label: labels.columns.status, mobile: "badge" },
      cell: ({ row }) => {
        const { publishedCount, variants } = row.original;
        return publishedCount === 0 ? (
          <Badge
            variant="outline"
            className="border-line font-normal text-ink-soft"
          >
            {labels.draft}
          </Badge>
        ) : (
          <Badge className="bg-mint font-normal text-ink">
            {publishedCount === variants.length
              ? labels.published
              : say(labels.partly, {
                  published: publishedCount,
                  total: variants.length,
                })}
          </Badge>
        );
      },
    },
    {
      id: "required",
      accessorFn: (row) => (row.requiredEffective ? "required" : "optional"),
      filterFn: "equalsString",
      meta: {
        label: labels.columns.required,
        searchValue: (row) => row.requiredIn.map((r) => r.label).join(" "),
        mobile: {
          badge: (row) =>
            row.requiredEffective ? (
              <Badge className="border-transparent bg-mint-deep font-normal text-white">
                {labels.requiredTag}
              </Badge>
            ) : null,
        },
      },
      cell: ({ row }) =>
        row.original.requiredIn.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {row.original.requiredEffective ? (
              <Badge className="border-transparent bg-mint-deep font-normal text-white">
                {labels.requiredTag}
              </Badge>
            ) : null}
            <span className="min-w-0 truncate text-2sm text-ink-soft">
              {row.original.requiredIn.map((place) => place.label).join(", ")}
            </span>
          </div>
        ) : null,
    },
    {
      id: "elements",
      accessorFn: (row) => row.lessons + row.quizzes,
      enableSorting: true,
      meta: { label: labels.columns.elements },
      cell: ({ row }) => (
        <span className="text-2sm whitespace-nowrap text-ink-soft tabular-nums">
          {say(labels.lessonCount, { count: row.original.lessons })}
          {" · "}
          {say(labels.quizCount, { count: row.original.quizzes })}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      meta: { mobile: "actions" },
      cell: ({ row }) => (
        <div
          className="flex justify-end"
          onClick={stopRowClick}
        >
          <RowMenu
            row={row.original}
            href={href(row.original.courseId)}
            scope={scope}
            pending={pending}
            labels={labels}
            locale={locale}
            onPublish={publish}
            onRequire={requireWithImpact}
            onUnrequire={(target) => setRequired(target, false)}
          />
        </div>
      ),
    },
  ];

  const columns = requirements
    ? allColumns
    : allColumns.filter((column) => column.id !== "required");

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        strings={table}
        filters={[
          {
            columnId: "status",
            label: labels.columns.status,
            options: (["published", "draft"] as const).map((status) => ({
              value: status,
              label: labels.statuses[status],
            })),
          },
          {
            columnId: "owner",
            label: labels.columns.owner,
            options: (["global", "country", "chapter"] as const).map(
              (value) => ({ value, label: labels.scopes[value] }),
            ),
          },
          ...(requirements
            ? [
                {
                  columnId: "required",
                  label: labels.columns.required,
                  options: (["required", "optional"] as const).map((value) => ({
                    value,
                    label: labels.requiredFilter[value],
                  })),
                },
              ]
            : []),
        ]}
        rowHref={(row) => href(row.courseId)}
        getRowId={(row) => row.familyId}
        locale={locale}
      />
      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {say(labels.confirm.title, {
                name: confirming?.row.title ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="grid gap-2 text-pretty">
              <span>{say(labels.confirm.body, { scope })}</span>
              <span className="font-medium text-ink">
                {say(labels.confirm.impact, {
                  count: confirming?.pilots ?? 0,
                })}
              </span>
              <span>{labels.confirm.impactHint}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              {labels.confirm.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="brand"
              className="min-h-11"
              onClick={() => {
                if (confirming) setRequired(confirming.row, true);
                setConfirming(null);
              }}
            >
              {labels.confirm.submit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RowMenu({
  row,
  href,
  scope,
  pending,
  labels,
  locale,
  onPublish,
  onRequire,
  onUnrequire,
}: {
  row: CourseListRow;
  href: string;
  scope: string;
  pending: boolean;
  labels: CourseListLabels;
  locale: Locale;
  onPublish: (
    row: CourseListRow,
    variants: CourseListRow["variants"],
    published: boolean,
  ) => void;
  onRequire: (row: CourseListRow) => void;
  onUnrequire: (row: CourseListRow) => void;
}) {
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, locale);
  const single = row.variants.length === 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label={say(labels.menu.label, { name: row.title })}
          className="size-8 text-ink-soft hover:text-ink"
        >
          <Ellipsis aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 rounded-2xl border-line p-2"
      >
        <DropdownMenuItem
          asChild
          className={MENU_ITEM}
        >
          <Link href={href}>
            <ArrowUpRight aria-hidden />
            {labels.menu.open}
          </Link>
        </DropdownMenuItem>
        {row.canManage ? (
          <>
            <DropdownMenuSeparator />
            {single ? (
              <DropdownMenuItem
                className={MENU_ITEM}
                onSelect={() =>
                  onPublish(row, row.variants, !row.variants[0].published)
                }
              >
                {row.variants[0].published ? (
                  <EyeOff aria-hidden />
                ) : (
                  <Eye aria-hidden />
                )}
                {row.variants[0].published
                  ? labels.menu.unpublish
                  : labels.menu.publish}
              </DropdownMenuItem>
            ) : (
              row.variants.map((variant) => (
                <DropdownMenuItem
                  key={variant.courseId}
                  className={MENU_ITEM}
                  onSelect={() => onPublish(row, [variant], !variant.published)}
                >
                  {variant.published ? (
                    <EyeOff aria-hidden />
                  ) : (
                    <Eye aria-hidden />
                  )}
                  {say(
                    variant.published
                      ? labels.menu.unpublishLanguage
                      : labels.menu.publishLanguage,
                    { language: variant.languageLabel },
                  )}
                </DropdownMenuItem>
              ))
            )}
          </>
        ) : null}
        {row.canRequire ? (
          <>
            <DropdownMenuSeparator />
            {row.required ? (
              <DropdownMenuItem
                className={MENU_ITEM}
                onSelect={() => onUnrequire(row)}
              >
                <ShieldOff aria-hidden />
                {say(labels.menu.unrequire, { scope })}
              </DropdownMenuItem>
            ) : row.inheritedFrom ? (
              <DropdownMenuItem
                disabled
                className={MENU_ITEM}
              >
                <ShieldCheck aria-hidden />
                {say(labels.menu.inheritedFrom, { name: row.inheritedFrom })}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className={MENU_ITEM}
                onSelect={() => onRequire(row)}
              >
                <ShieldCheck aria-hidden />
                {say(labels.menu.require, { scope })}
              </DropdownMenuItem>
            )}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
