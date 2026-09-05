"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
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
import {
  appointCountryAdminAction,
  removeCountryAdminAction,
} from "../actions";
import {
  CountryFormDialog,
  type CountryFormLabels,
} from "./country-form-dialog";

type CountryAdmin = { userId: string; name: string; email: string };

export type CountryRow = {
  id: string;
  name: string;
  code: string;
  admins: CountryAdmin[];
};

export type CountriesTableLabels = CountryFormLabels & {
  empty: string;
  admins: string;
  noAdmins: string;
  appoint: string;
  appointed: string;
  removeAdmin: string;
  confirmRemoveAdmin: string;
  appointDialog: { emailLabel: string; hint: string; placeholder: string };
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
  const router = useRouter();
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
      if (result.ok) router.refresh();
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Badge
          asChild
          variant="outline"
          className="min-h-11 gap-1.5 border-line px-3 text-sm hover:bg-mint-tint"
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
      <AlertDialogContent>
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
  table,
}: {
  rows: CountryRow[];
  labels: CountriesTableLabels;
  table: DataTableStrings;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<CountryRow | null>(null);

  const creating = searchParams.get("new") === "1";

  const close = () => {
    setEditing(null);
    if (!creating) return;
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const done = () => {
    close();
    router.refresh();
  };

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
          className="flex flex-wrap items-center gap-2"
          onClick={stopRowClick}
        >
          {row.original.admins.length === 0 ? (
            <span className="text-sm text-ink-soft">{labels.noAdmins}</span>
          ) : (
            row.original.admins.map((admin) => (
              <AdminChip
                key={admin.userId}
                countryId={row.original.id}
                admin={admin}
                labels={labels}
              />
            ))
          )}
        </div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={stopRowClick}
        >
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
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={labels.edit}
            onClick={() => setEditing(row.original)}
          >
            <Pencil aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line px-4 py-10 text-center text-sm text-ink-soft">
          {labels.empty}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          strings={table}
          getRowId={(row) => row.id}
        />
      )}
      <CountryFormDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        country={editing}
        labels={labels}
        onClose={close}
        onDone={done}
      />
    </>
  );
}
