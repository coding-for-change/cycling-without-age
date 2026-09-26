"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Building2, Check, Inbox, UserMinus, X } from "lucide-react";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { notify } from "@/components/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  decidePoolRequestAction,
  leavePoolAction,
} from "@/features/fleet/actions";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { ConfirmButton } from "@/components/confirm-button";

export type PoolMember = {
  membershipId: string;
  chapterId: string;
  name: string;
  status: "pending" | "approved" | "rejected";
};

type Strings = Dictionary["fleet"]["locations"];
type Errors = Dictionary["fleet"]["common"]["errors"];
type Decision = { membershipId: string; name: string; approve: boolean };

export function PoolRequests({
  members,
  strings,
  errors,
}: {
  members: PoolMember[];
  strings: Strings;
  errors: Errors;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const pending = members.filter((member) => member.status === "pending");
  if (pending.length === 0) return null;

  return (
    <section
      aria-labelledby="pool-requests"
      className="grid gap-3 rounded-2xl border border-mint-deep/30 bg-mint-tint p-4"
    >
      <div className="grid gap-1">
        <h2
          id="pool-requests"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <Inbox
            aria-hidden
            className="size-4"
          />
          {strings.pending}
          <Badge className="bg-mint-deep font-medium text-white tabular-nums">
            {pending.length}
          </Badge>
        </h2>
        <p className="text-2sm text-ink-soft">{strings.pendingBody}</p>
      </div>
      <ul className="grid divide-y divide-line overflow-hidden rounded-xl border border-line bg-canvas">
        {pending.map((member) => (
          <li
            key={member.membershipId}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <Building2
              aria-hidden
              className="size-4 shrink-0 text-ink-soft"
            />
            <span className="min-w-0 flex-1 truncate text-2sm font-medium">
              {member.name}
            </span>
            <div className="flex gap-1.25">
              <Button
                size="sm"
                variant="outline"
                className="border-line"
                onClick={() =>
                  setDecision({
                    membershipId: member.membershipId,
                    name: member.name,
                    approve: false,
                  })
                }
              >
                <X aria-hidden />
                {strings.decision.reject}
              </Button>
              <Button
                size="sm"
                className="bg-mint-deep text-white hover:bg-mint-deep/90"
                onClick={() =>
                  setDecision({
                    membershipId: member.membershipId,
                    name: member.name,
                    approve: true,
                  })
                }
              >
                <Check aria-hidden />
                {strings.decision.approve}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <DecisionDrawer
        decision={decision}
        onClose={() => setDecision(null)}
        strings={strings.decision}
        errors={errors}
      />
    </section>
  );
}

export function PoolMembers({
  poolId,
  poolName,
  members,
  strings,
  errors,
}: {
  poolId: string;
  poolName: string;
  members: PoolMember[];
  strings: Strings;
  errors: Errors;
}) {
  const approved = members.filter((member) => member.status === "approved");

  return approved.length > 0 ? (
    <ul className="grid divide-y divide-line rounded-2xl border border-line">
      {approved.map((member) => (
        <li
          key={member.membershipId}
          className="flex items-center gap-3 px-4 py-2"
        >
          <Building2
            aria-hidden
            className="size-4 shrink-0 text-ink-soft"
          />
          <span className="min-w-0 flex-1 truncate text-2sm">
            {member.name}
          </span>
          <ConfirmButton
            icon={<UserMinus aria-hidden />}
            label={strings.remove.open}
            title={fill(strings.remove.title, {
              chapter: member.name,
              name: poolName,
            })}
            body={strings.remove.body}
            confirm={strings.remove.submit}
            cancel={strings.cancel}
            destructive
            done={fill(strings.remove.done, {
              chapter: member.name,
              name: poolName,
            })}
            errors={errors}
            action={() =>
              leavePoolAction({ poolId, chapterId: member.chapterId })
            }
            className="border-line"
          />
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-2sm text-ink-soft">{strings.noMembers}</p>
  );
}

function DecisionDrawer({
  decision,
  onClose,
  strings,
  errors,
}: {
  decision: Decision | null;
  onClose: () => void;
  strings: Strings["decision"];
  errors: Errors;
}) {
  const formId = useId();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (!decision) return null;

  const close = () => {
    setNote("");
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = note.trim();
    startTransition(async () => {
      const result = await decidePoolRequestAction({
        membershipId: decision.membershipId,
        approve: decision.approve,
        note: trimmed || undefined,
      });
      notify(result, {
        done: fill(decision.approve ? strings.approved : strings.rejected, {
          name: decision.name,
        }),
        errors,
      });
      if (result.ok) close();
    });
  };

  return (
    <AppDrawer
      open
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
      dismissible={!pending}
      title={fill(
        decision.approve ? strings.approveTitle : strings.rejectTitle,
        { name: decision.name },
      )}
      description={decision.approve ? strings.approveBody : strings.rejectBody}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={pending}
          variant={decision.approve ? "brand" : "default"}
          className="min-h-11"
        >
          {decision.approve ? strings.approve : strings.reject}
        </Button>
      }
    >
      <form
        id={formId}
        onSubmit={submit}
        onKeyDown={submitOnCmdEnter}
        aria-busy={pending}
        className="grid gap-4"
      >
        <Field>
          <FieldLabel htmlFor={noteId}>
            {fill(strings.noteLabel, { name: decision.name })}
          </FieldLabel>
          <Textarea
            id={noteId}
            autoFocus
            maxLength={500}
            rows={3}
            placeholder={strings.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="border-line"
          />
        </Field>
      </form>
    </AppDrawer>
  );
}
