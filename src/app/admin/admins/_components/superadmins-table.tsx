"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, UserMinus, X } from "lucide-react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { withPasskeyStepUp } from "@/lib/passkey-client";
import { cn } from "@/lib/utils";
import { mutedColumn } from "../../_components/table-columns";
import {
  removeSuperadminAction,
  revokeSuperadminInviteAction,
} from "../actions";

export type SuperadminRow = {
  id: string;
  state: "active" | "pending";
  userId: string;
  name: string;
  email: string;
  avatar: string;
  since: string;
  sinceIso: string;
  invitedBy: string;
  hasPasskey: boolean;
  status: string;
  isSelf: boolean;
};

export type SuperadminsTableLabels = {
  columns: {
    name: string;
    email: string;
    since: string;
    invitedBy: string;
    passkey: string;
    status: string;
  };
  passkey: { yes: string; no: string };
  you: string;
  cancel: string;
  revoke: string;
  revokeLabel: string;
  revokeTitle: string;
  revokeBody: string;
  revoked: string;
  lastSuperadmin: string;
  remove: Omit<ConfirmDeleteLabels, "errors">;
  errors: NotifyLabels["errors"];
};

function RevokeInvite({
  row,
  labels,
  locale,
}: {
  row: SuperadminRow;
  labels: SuperadminsTableLabels;
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();
  const values = { name: row.name };

  const revoke = () =>
    startTransition(async () => {
      notify(await revokeSuperadminInviteAction(row.id), {
        done: labels.revoked,
        errors: labels.errors,
      });
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          disabled={pending}
          aria-label={formatMessage(labels.revokeLabel, values, locale)}
          className="h-9 border-line text-2sm"
        >
          <X aria-hidden />
          {labels.revoke}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {formatMessage(labels.revokeTitle, values, locale)}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-ink-soft">
            {labels.revokeBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="min-h-11"
            onClick={revoke}
          >
            {labels.revoke}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SuperadminsTable({
  rows,
  labels,
  table,
  locale,
}: {
  rows: SuperadminRow[];
  labels: SuperadminsTableLabels;
  table: DataTableStrings;
  locale: Locale;
}) {
  const router = useRouter();
  const lastOne = rows.filter((row) => row.state === "active").length <= 1;

  const columns: ColumnDef<SuperadminRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name || row.email,
      enableHiding: false,
      enableSorting: true,
      meta: {
        label: labels.columns.name,
        searchValue: (row) => `${row.name} ${row.email}`,
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PersonAvatar
            svg={row.original.avatar}
            className={cn(row.original.state === "pending" && "opacity-60")}
          />
          <div className="grid">
            <span className="font-medium">
              {row.original.name}
              {row.original.isSelf ? (
                <span className="font-normal text-ink-soft">
                  {" "}
                  ({labels.you})
                </span>
              ) : null}
            </span>
            <span className="text-xs text-ink-soft">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.state,
      meta: { label: labels.columns.status },
      cell: ({ row }) => (
        <Badge
          variant={row.original.state === "active" ? "default" : "outline"}
          className={cn(
            "font-normal",
            row.original.state === "active"
              ? "bg-mint-tint text-ink"
              : "border-dashed border-line text-ink-soft",
          )}
        >
          {row.original.status}
        </Badge>
      ),
    },
    mutedColumn<SuperadminRow>(
      "since",
      labels.columns.since,
      (row) => row.since,
      {
        isoOf: (row) => row.sinceIso,
      },
    ),
    mutedColumn<SuperadminRow>(
      "invitedBy",
      labels.columns.invitedBy,
      (row) => row.invitedBy,
    ),
    {
      id: "passkey",
      accessorFn: (row) => row.hasPasskey,
      meta: { label: labels.columns.passkey },
      cell: ({ row }) => (
        <span
          className={cn(
            "flex items-center gap-1.5 text-2sm",
            row.original.hasPasskey ? "text-ink" : "text-ink-soft",
          )}
        >
          <KeyRound
            aria-hidden
            className="size-3.5"
          />
          {row.original.hasPasskey ? labels.passkey.yes : labels.passkey.no}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={stopRowClick}
        >
          {row.original.state === "pending" ? (
            <RevokeInvite
              row={row.original}
              labels={labels}
              locale={locale}
            />
          ) : (
            <ConfirmDeleteDialog
              name={row.original.name}
              locale={locale}
              labels={{ ...labels.remove, errors: labels.errors }}
              cancel={labels.cancel}
              blocked={lastOne ? labels.lastSuperadmin : undefined}
              action={() =>
                withPasskeyStepUp(() =>
                  removeSuperadminAction(row.original.userId),
                )
              }
              onDone={() => router.refresh()}
              redirectTo={row.original.isSelf ? "/" : undefined}
              trigger={
                <Button
                  variant="outline"
                  disabled={lastOne}
                  title={lastOne ? labels.lastSuperadmin : undefined}
                  className="h-9 border-line text-2sm text-red-ink hover:bg-red-tint hover:text-red-ink disabled:pointer-events-auto disabled:cursor-not-allowed"
                >
                  <UserMinus aria-hidden />
                  {labels.remove.open}
                </Button>
              }
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      locale={locale}
      getRowId={(row) => `${row.state}:${row.id}`}
    />
  );
}
