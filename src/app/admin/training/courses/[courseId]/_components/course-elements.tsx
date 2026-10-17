"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { BookOpen, GripVertical, ListChecks, Plus } from "lucide-react";
import { notify, reportSave } from "@/components/action-feedback";
import { useSaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import {
  createElementAction,
  reorderElementsAction,
} from "@/features/training/actions";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import {
  DetailEmpty,
  DetailList,
  DetailSection,
} from "../../../../_components/detail-page";
import type { CourseDetailLabels } from "./course-detail";

type Kind = "lesson" | "quiz";

export type CourseElementRow = {
  id: string;
  kind: Kind;
  position: number;
  title: string;
  meta: string;
};

const KIND_ICON = { lesson: BookOpen, quiz: ListChecks } as const;

const sameOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function CourseElements({
  courseId,
  elements,
  editable,
  description,
  language,
  labels,
}: {
  courseId: string;
  elements: CourseElementRow[];
  editable: boolean;
  description: string;
  language: Locale;
  labels: CourseDetailLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const report = useSaveStatus();
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const serverOrder = elements.map((element) => element.id);
  const [order, setOrder] = useState(serverOrder);
  const [synced, setSynced] = useState(serverOrder);
  if (!sameOrder(synced, serverOrder)) {
    setSynced(serverOrder);
    setOrder(serverOrder);
  }
  const byId = new Map(elements.map((element) => [element.id, element]));
  const shown = order.flatMap((id) => byId.get(id) ?? []);
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);

  const hrefOf = (elementId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("element", elementId);
    return `${pathname}?${params.toString()}`;
  };

  const reorder = (next: string[], previous: string[], undoing = false) => {
    setOrder(next);
    report("saving");
    startTransition(async () => {
      const result = await reorderElementsAction({
        courseId,
        elementIds: next,
      });
      const ok = reportSave(result, {
        report,
        labels: { ...labels.field, saved: labels.orderSaved },
        undo: undoing ? undefined : () => reorder(previous, next, true),
        undoing,
      });
      if (!ok) setOrder(previous);
    });
  };

  const add = (kind: Kind, position: number | null) =>
    startTransition(async () => {
      const result = await createElementAction({
        courseId,
        kind,
        title: kind === "quiz" ? labels.newQuiz : labels.newLesson,
        position,
      });
      if (!result.ok) {
        notify(result, { done: "", errors: labels.errors });
        return;
      }
      router.push(hrefOf(result.elementId), { scroll: false });
    });

  const positionAfter = (index: number) => shown[index + 1]?.position ?? null;

  return (
    <DetailSection
      title={labels.elements}
      description={description}
      busy={pending}
      action={
        editable && elements.length > 0 ? (
          <KindMenu
            labels={labels}
            align="end"
            onPick={(kind) => add(kind, null)}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              className="h-8 border-line text-2sm"
            >
              <Plus aria-hidden />
              {labels.addElement}
            </Button>
          </KindMenu>
        ) : null
      }
      className="gap-3"
    >
      {elements.length === 0 ? (
        <DetailEmpty
          action={
            editable ? (
              <KindMenu
                labels={labels}
                align="center"
                onPick={(kind) => add(kind, null)}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="h-8 border-line text-2sm"
                >
                  <Plus aria-hidden />
                  {labels.addElement}
                </Button>
              </KindMenu>
            ) : null
          }
        >
          {labels.noElements}
        </DetailEmpty>
      ) : editable ? (
        <Sortable
          value={order}
          onValueChange={(next) => {
            if (!sameOrder(next, order)) reorder(next, order);
          }}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          onDragCancel={() => setDragging(false)}
        >
          <SortableContent
            render={<ol />}
            className="grid rounded-lg border border-line"
          >
            {shown.map((element, index) => (
              <SortableItem
                key={element.id}
                value={element.id}
                render={<li />}
                className={cn(
                  "group/row relative flex min-h-12 items-center gap-3 bg-canvas px-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-canvas-deep",
                  index > 0 && "border-t border-line",
                )}
              >
                <span className="relative z-10 flex w-4 shrink-0 justify-end">
                  <span className="text-2sm text-ink-faint tabular-nums transition-opacity group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0 pointer-coarse:opacity-0">
                    {index + 1}
                  </span>
                  <SortableItemHandle
                    aria-label={say(labels.dragElement, {
                      name: element.title,
                    })}
                    className="absolute inset-y-0 -right-0.5 my-auto flex size-5 items-center justify-center rounded text-ink-soft opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none pointer-coarse:opacity-100"
                  >
                    <GripVertical
                      aria-hidden
                      className="size-4"
                    />
                  </SortableItemHandle>
                </span>
                <ElementLink
                  element={element}
                  href={hrefOf(element.id)}
                  labels={labels}
                />
                {!dragging ? (
                  <InsertRow
                    label={labels.addElementHere}
                    labels={labels}
                    disabled={pending}
                    onPick={(kind) => add(kind, positionAfter(index))}
                  />
                ) : null}
              </SortableItem>
            ))}
          </SortableContent>
          <SortableOverlay>
            {({ value }) => {
              const element = byId.get(String(value));
              return element ? (
                <div className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-canvas px-3 shadow-lift">
                  <GripVertical
                    aria-hidden
                    className="size-4 text-ink-soft"
                  />
                  <ElementSummary
                    element={element}
                    labels={labels}
                  />
                </div>
              ) : null;
            }}
          </SortableOverlay>
        </Sortable>
      ) : (
        <DetailList ordered>
          {shown.map((element, index) => (
            <li
              key={element.id}
              className="relative flex min-h-12 items-center gap-3 px-3 transition-colors hover:bg-canvas-deep"
            >
              <span className="w-4 shrink-0 text-right text-2sm text-ink-faint tabular-nums">
                {index + 1}
              </span>
              <ElementLink
                element={element}
                href={hrefOf(element.id)}
                labels={labels}
              />
            </li>
          ))}
        </DetailList>
      )}
    </DetailSection>
  );
}

function ElementSummary({
  element,
  labels,
}: {
  element: CourseElementRow;
  labels: CourseDetailLabels;
}) {
  const Icon = KIND_ICON[element.kind];
  return (
    <>
      <span
        title={labels.kinds[element.kind]}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md",
          element.kind === "quiz" ? "bg-mint-tint" : "bg-canvas-deeper",
        )}
      >
        <Icon
          aria-hidden
          className="size-3.5"
        />
        <span className="sr-only">{labels.kinds[element.kind]}</span>
      </span>
      <span className="min-w-0 flex-1 truncate text-2sm font-medium">
        {element.title}
      </span>
      <span className="shrink-0 text-2sm text-ink-soft tabular-nums">
        {element.meta}
      </span>
    </>
  );
}

function ElementLink({
  element,
  href,
  labels,
}: {
  element: CourseElementRow;
  href: string;
  labels: CourseDetailLabels;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="flex min-w-0 flex-1 items-center gap-3 py-2 outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ink"
    >
      <ElementSummary
        element={element}
        labels={labels}
      />
    </Link>
  );
}

function KindMenu({
  labels,
  align,
  onPick,
  children,
}: {
  labels: CourseDetailLabels;
  align: "start" | "center" | "end";
  onPick: (kind: Kind) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="min-w-44 rounded-2xl border-line p-2"
      >
        {(["lesson", "quiz"] as const).map((kind) => {
          const Icon = KIND_ICON[kind];
          return (
            <DropdownMenuItem
              key={kind}
              className="rounded-xl py-2.5"
              onSelect={() => onPick(kind)}
            >
              <Icon aria-hidden />
              {labels.kinds[kind]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InsertRow({
  label,
  labels,
  disabled,
  onPick,
}: {
  label: string;
  labels: CourseDetailLabels;
  disabled: boolean;
  onPick: (kind: Kind) => void;
}) {
  return (
    <div className="absolute inset-x-0 -bottom-2 z-20 h-4">
      <KindMenu
        labels={labels}
        align="start"
        onPick={onPick}
      >
        <button
          type="button"
          disabled={disabled}
          className="group/insert flex size-full items-center gap-2 px-3 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none data-[state=open]:opacity-100"
        >
          <span className="flex h-5 shrink-0 items-center gap-1 rounded-full border border-line bg-canvas px-2 text-xs text-ink-soft group-hover/insert:text-ink">
            <Plus
              aria-hidden
              className="size-3"
            />
            {label}
          </span>
          <span
            aria-hidden
            className="h-px flex-1 bg-ink-faint"
          />
        </button>
      </KindMenu>
    </div>
  );
}
