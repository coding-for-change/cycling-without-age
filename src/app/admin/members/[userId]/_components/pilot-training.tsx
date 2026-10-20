"use client";

import {
  useId,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ChevronRight, Handshake, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FamilyStatusName } from "@/features/training/requirements";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { TrainingStatusPill } from "../../../_components/training-status";
import {
  confirmInPersonAction,
  grantExemptionAction,
  revokeExemptionAction,
  revokeInPersonAction,
  type TrainingAdminResult,
} from "../../actions";
import type { CourseAction } from "./pilot-training-facts";
import { ProgressRing, StepDot } from "./training-meters";

export type TrainingCourseView = {
  familyId: string;
  name: string;
  status: FamilyStatusName;
  percent: number;
  percentLabel: string;
  summary: string | null;
  details: string[];
  action: CourseAction;
};

export type PilotTrainingLabels = {
  inPerson: string;
  inPersonConfirmed: string;
  inPersonOpen: string;
  confirm: string;
  revoke: string;
  confirmed: string;
  revoked: string;
  experienced: string;
  experiencedHint: string;
  experiencedOn: string;
  experiencedOff: string;
  exempt: string;
  revokeExemption: string;
  exempted: string;
  exemptionRevoked: string;
  noCourses: string;
  details: string;
  statuses: Record<FamilyStatusName, string>;
  undo: string;
  errors: { generic: string } & Record<string, string>;
};

type Run = (
  action: () => Promise<TrainingAdminResult>,
  done: string,
  undo?: () => void,
) => void;

const ACTION_CLASS = "h-7 px-2 text-2sm";

export function PilotTraining({
  userId,
  trainingRequired,
  inPerson,
  blanket,
  courses,
  labels,
  locale,
}: {
  userId: string;
  trainingRequired: boolean;
  inPerson: { confirmed: boolean; provenance: string };
  blanket: { on: boolean; provenance: string | null };
  courses: TrainingCourseView[];
  labels: PilotTrainingLabels;
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();
  const [blanketShown, setBlanketShown] = useOptimistic(blanket.on);

  const run: Run = (action, done, undo) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(labels.errors[result.error] ?? labels.errors.generic);
        haptics.error();
        return;
      }
      haptics.success();
      toast.success(
        done,
        undo ? { action: { label: labels.undo, onClick: undo } } : undefined,
      );
    });

  const exemption = (familyId: string | null) => ({ userId, familyId });

  const confirmInPerson = (undoable: boolean) =>
    run(
      () => confirmInPersonAction({ userId }),
      labels.confirmed,
      undoable ? () => revokeInPerson(false) : undefined,
    );
  const revokeInPerson = (undoable: boolean) =>
    run(
      () => revokeInPersonAction({ userId }),
      labels.revoked,
      undoable ? () => confirmInPerson(false) : undefined,
    );

  const setBlanket = (next: boolean, undoable = true) =>
    startTransition(async () => {
      setBlanketShown(next);
      const result = await (
        next ? grantExemptionAction : revokeExemptionAction
      )(exemption(null));
      if (!result.ok) {
        toast.error(labels.errors[result.error] ?? labels.errors.generic);
        haptics.error();
        return;
      }
      haptics.success();
      toast.success(
        next ? labels.experiencedOn : labels.experiencedOff,
        undoable
          ? {
              action: {
                label: labels.undo,
                onClick: () => setBlanket(!next, false),
              },
            }
          : undefined,
      );
    });

  const setCourse = (
    course: TrainingCourseView,
    next: boolean,
    undoable = true,
  ) =>
    run(
      () =>
        (next ? grantExemptionAction : revokeExemptionAction)(
          exemption(course.familyId),
        ),
      formatMessage(
        next ? labels.exempted : labels.exemptionRevoked,
        { course: course.name },
        locale,
      ),
      undoable ? () => setCourse(course, !next, false) : undefined,
    );

  const detailsLabel = (name: string) =>
    formatMessage(labels.details, { name }, locale);

  return (
    <div
      aria-busy={pending}
      className="grid gap-3"
    >
      <ul className="grid divide-y divide-line rounded-xl border border-line">
        <TrainingLine
          leading={
            <StepDot
              icon={Handshake}
              done={inPerson.confirmed}
            />
          }
          title={labels.inPerson}
          pill={
            <TrainingStatusPill
              status={inPerson.confirmed ? "passed" : "notStarted"}
              label={
                inPerson.confirmed
                  ? labels.inPersonConfirmed
                  : labels.inPersonOpen
              }
            />
          }
          details={[inPerson.provenance]}
          detailsLabel={detailsLabel(labels.inPerson)}
          action={
            inPerson.confirmed ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => revokeInPerson(true)}
                className={cn(ACTION_CLASS, "text-ink-soft hover:text-ink")}
              >
                {labels.revoke}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => confirmInPerson(true)}
                className={cn(ACTION_CLASS, "border-line")}
              >
                {labels.confirm}
              </Button>
            )
          }
        />
        {trainingRequired ? (
          <TrainingLine
            leading={
              <StepDot
                icon={ShieldCheck}
                done={blanketShown}
              />
            }
            title={labels.experienced}
            details={[
              blanketShown && blanket.provenance
                ? blanket.provenance
                : labels.experiencedHint,
            ]}
            detailsLabel={detailsLabel(labels.experienced)}
            action={
              <Switch
                checked={blanketShown}
                disabled={pending}
                onCheckedChange={(next) => setBlanket(next)}
                aria-label={labels.experienced}
              />
            }
          />
        ) : null}
        {trainingRequired
          ? courses.map((course) => (
              <TrainingLine
                key={course.familyId}
                leading={
                  <ProgressRing
                    status={course.status}
                    percent={course.percent}
                  />
                }
                title={course.name}
                summary={course.summary}
                pill={
                  <TrainingStatusPill
                    status={course.status}
                    label={labels.statuses[course.status]}
                  />
                }
                details={course.details}
                detailsLabel={detailsLabel(course.name)}
                action={
                  course.action === "exempt" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setCourse(course, true)}
                      className={cn(
                        ACTION_CLASS,
                        "text-ink-soft hover:text-ink",
                      )}
                    >
                      {labels.exempt}
                    </Button>
                  ) : course.action === "revoke" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setCourse(course, false)}
                      aria-label={labels.revokeExemption}
                      className={cn(
                        ACTION_CLASS,
                        "text-ink-soft hover:text-ink",
                      )}
                    >
                      {labels.revoke}
                    </Button>
                  ) : null
                }
              />
            ))
          : null}
      </ul>
      {trainingRequired && courses.length === 0 ? (
        <p className="text-2sm text-ink-soft">{labels.noCourses}</p>
      ) : null}
    </div>
  );
}

function TrainingLine({
  leading,
  title,
  summary,
  pill,
  action,
  details,
  detailsLabel,
}: {
  leading: ReactNode;
  title: string;
  summary?: string | null;
  pill?: ReactNode;
  action: ReactNode;
  details: string[];
  detailsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const expandable = details.length > 0;

  return (
    <li className="grid">
      <div className="flex min-h-12 items-center gap-3 px-4 py-2">
        {leading}
        <button
          type="button"
          aria-expanded={expandable ? open : undefined}
          aria-controls={expandable ? id : undefined}
          title={expandable ? detailsLabel : undefined}
          disabled={!expandable}
          onClick={() => setOpen((value) => !value)}
          className="grid min-w-0 flex-1 gap-0.5 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 enabled:cursor-pointer"
        >
          <span className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 text-sm font-medium break-words">
              {title}
            </span>
            {expandable ? (
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0 text-ink-soft transition-transform motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              />
            ) : null}
          </span>
          {summary || pill ? (
            <span className="flex min-w-0 items-center gap-2">
              {pill ? (
                <span className="inline-flex sm:hidden">{pill}</span>
              ) : null}
              {summary ? (
                <span className="truncate text-2sm text-ink-soft">
                  {summary}
                </span>
              ) : null}
            </span>
          ) : null}
        </button>
        {pill ? (
          <span className="hidden shrink-0 sm:inline-flex">{pill}</span>
        ) : null}
        <span className="flex shrink-0 items-center">{action}</span>
      </div>
      {expandable && open ? (
        <ul
          id={id}
          className="grid gap-1 pr-4 pb-3 pl-12 text-2sm text-ink-soft"
        >
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
