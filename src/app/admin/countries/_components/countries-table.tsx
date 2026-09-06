"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { AdminEmpty } from "../../_components/admin-empty";
import { ICONS } from "../../_components/icons";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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
import { fill } from "@/lib/utils";
import { AppointByEmailDialog } from "../../_components/appoint-by-email-dialog";
import { notify } from "../../_components/action-feedback";
import { useDrawerParam } from "../../_components/use-drawer-param";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "../../_components/confirm-delete-dialog";
import {
  appointCountryAdminAction,
  deleteCountryAction,
  removeCountryAdminAction,
} from "../actions";
import { CountryDrawer, type CountryFormLabels } from "./country-drawer";

type CountryAdmin = { userId: string; name: string; email: string };

export type CountryRow = {
  id: string;
  name: string;
  code: string;
  admins: CountryAdmin[];
  footprint: { chapters: number; members: number; passengers: number };
};

export type CountriesTableLabels = CountryFormLabels & {
  empty: string;
  admins: string;
  appoint: string;
  appointShort: string;
  appointed: string;
  removeAdmin: string;
  confirmRemoveAdmin: string;
  appointDialog: { emailLabel: string; hint: string; placeholder: string };
  delete: ConfirmDeleteLabels & { footprint: string };
};

function AdminChip({
  countryId,
  admin,
  labels,
}: {
  countryId: string;
  admin: CountryAdmin;
  labels: CountriesTableLabels;
}) {
  const [pending, startTransition] = useTransition();
  const label = fill(labels.removeAdmin, { name: admin.name });

  const remove = () =>
    startTransition(async () => {
      const result = await removeCountryAdminAction({
        countryId,
        userId: admin.userId,
      });
      notify(result.ok ? result : { ok: false, error: "generic" }, {
        done: labels.saved,
        errors: labels.errors,
      });
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Badge
          asChild
          variant="outline"
          className="h-7 gap-1 border-line px-2.5 text-2sm hover:bg-mint-tint"
        >
          <button
            type="button"
            disabled={pending}
            aria-label={label}
          >
            {admin.name}
            <X aria-hidden />
          </button>
        </Badge>
      </AlertDialogTrigger>
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {fill(labels.confirmRemoveAdmin, { name: admin.name })}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="min-h-11"
            onClick={remove}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CountriesTable({
  rows,
  labels,
  language,
  table,
}: {
  rows: CountryRow[];
  labels: CountriesTableLabels;
  language: string;
  table: DataTableStrings;
}) {
  const router = useRouter();
  const { creating, editingId, close, go } = useDrawerParam();
  const editing = rows.find((row) => row.id === editingId) ?? null;

  const done = close;

  const columns: ColumnDef<CountryRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      enableHiding: false,
      enableSorting: true,
      meta: { label: labels.fields.name },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "code",
      accessorFn: (row) => row.code,
      meta: { label: labels.fields.code },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="border-line font-mono"
        >
          {row.original.code}
        </Badge>
      ),
    },
    {
      id: "admins",
      accessorFn: (row) => row.admins.map((admin) => admin.name),
      meta: {
        label: labels.admins,
        searchValue: (row) =>
          row.admins.map((admin) => `${admin.name} ${admin.email}`).join(" "),
      },
      cell: ({ row }) => (
        <div
          className="flex flex-wrap items-center gap-1.5"
          onClick={stopRowClick}
        >
          {row.original.admins.map((admin) => (
            <AdminChip
              key={admin.userId}
              countryId={row.original.id}
              admin={admin}
              labels={labels}
            />
          ))}
          <AppointByEmailDialog
            triggerLabel={labels.appoint}
            title={labels.appoint}
            emailLabel={labels.appointDialog.emailLabel}
            hint={labels.appointDialog.hint}
            placeholder={labels.appointDialog.placeholder}
            labels={{ done: labels.appointed, errors: labels.errors }}
            action={(email) =>
              appointCountryAdminAction({ countryId: row.original.id, email })
            }
            trigger={(open) => (
              <Badge
                asChild
                variant="outline"
                className="h-7 gap-1 border-dashed border-line px-2.5 text-2sm text-ink-soft hover:bg-mint-tint hover:text-ink"
              >
                <button
                  type="button"
                  onClick={open}
                >
                  <UserPlus aria-hidden />
                  {labels.appointShort}
                </button>
              </Badge>
            )}
          />
        </div>
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
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={labels.edit}
            onClick={() => go((params) => params.set("edit", row.original.id))}
          >
            <Pencil aria-hidden />
          </Button>
          <ConfirmDeleteDialog
            name={row.original.name}
            footprint={fill(labels.delete.footprint, row.original.footprint)}
            labels={labels.delete}
            cancel={labels.cancel}
            errors={labels.errors}
            action={() => deleteCountryAction(row.original.id)}
            onDone={() => router.refresh()}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-red hover:bg-red-tint hover:text-red"
                aria-label={labels.delete.open}
              >
                <Trash2 aria-hidden />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <>
      {rows.length === 0 ? (
        <AdminEmpty icon={ICONS.countries}>{labels.empty}</AdminEmpty>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          strings={table}
          getRowId={(row) => row.id}
        />
      )}
      <CountryDrawer
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        country={editing}
        language={language}
        labels={labels}
        onClose={close}
        onDone={done}
      />
    </>
  );
}
