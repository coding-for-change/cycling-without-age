"use client";

/* Shared helpers for the admin chapter-management pages (pilots, clients,
   partners, fleet, training, settings). Ported from book2go-mockup's
   src/app/admin/_directory/ui.tsx — the surrounding _directory/global.ts and
   src/app/admin/global/** (multi-country super-admin) are out of scope for
   this branch and were not ported, so this file keeps only this module's own
   name rather than the "_directory" path. */

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n, t } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import { MapEmbed } from "@/components/MapEmbed";
import type { Chapter, Client, Database, Pilot, Training } from "@/lib/types";

export const CH = "muc";

/* Chapter fields the settings/global pages manage beyond the base type. */
export type ChapterX = Chapter & {
  address?: string;
  waiverText?: string;
  channels?: { app: boolean; whatsapp: boolean; phone: boolean };
  reminders?: { ride: number; noPilot: number; demand: string };
  contactName?: string;
  contactEmail?: string;
  awaitingActivation?: boolean;
  createdAt?: number;
};

export function myPilots(db: Database): Pilot[] {
  return db.pilots.filter((p) => p.chapterId === CH);
}

export function mucRides(db: Database) {
  return db.rides.filter((r) => r.chapterId === CH);
}

export function requiredFor(db: Database, role: string): Training[] {
  return (db.trainings || []).filter((tr) =>
    (tr.requiredFor || []).includes(role),
  );
}

/* volunteers must cover the volunteer AND pilot curriculum before approval */
export function missingTrainings(db: Database, p: Pilot): Training[] {
  const need = requiredFor(
    db,
    p.role === "volunteer" ? "volunteer" : "pilot",
  ).concat(p.role === "volunteer" ? requiredFor(db, "pilot") : []);
  const seen: Record<string, 1> = {};
  return need.filter((tr) => {
    if (seen[tr.id]) return false;
    seen[tr.id] = 1;
    return !(p.trainingsDone || []).includes(tr.id);
  });
}

/* weekday label for a JS day int (0=Sun) — locale-aware via a known reference week */
export function dayName(
  fmt: { weekday: (ts: number) => string },
  di: number,
): string {
  return fmt.weekday(new Date(2026, 0, 4 + di).getTime());
}
export function dayNames(
  fmt: { weekday: (ts: number) => string },
  list: number[] | undefined,
): string {
  if (!list || !list.length) return "";
  return [...list]
    .sort()
    .map((di) => dayName(fmt, di))
    .join(", ");
}

/* ---------- badges ---------- */
export function WaiverBadge({ client }: { client: Client }) {
  const { t } = useI18n();
  if (client.waiverSigned && client.signedBy === "proxy")
    return (
      <span className="badge badge-grey">{t("admin.cli.proxySigned")}</span>
    );
  if (client.waiverSigned)
    return <span className="badge badge-mint">{t("common.signed")}</span>;
  return <span className="badge badge-red">{t("common.pending")}</span>;
}

export function RoleBadge({ pilot }: { pilot: Pilot }) {
  const { t } = useI18n();
  if (pilot.role === "captain")
    return <span className="badge badge-ink">{t("admin.pil.captain")}</span>;
  if (pilot.role === "pilot")
    return <span className="badge badge-mint">{t("admin.pil.pilot")}</span>;
  return <span className="badge badge-grey">{t("admin.pil.awaiting")}</span>;
}

export function ChapterBadge({ status }: { status: "active" | "awaiting" }) {
  const { t } = useI18n();
  return status === "active" ? (
    <span className="badge badge-mint">
      <Icon name="check" /> {t("glob.active")}
    </span>
  ) : (
    <span className="badge badge-grey">
      <Icon name="clock" /> {t("glob.awaiting")}
    </span>
  );
}

/* ---------- page & modal furniture ---------- */
export function PageHead({
  title,
  intro,
  action,
}: {
  title: string;
  intro?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="h1">{title}</h1>
        {intro && <p className="muted mt-1 text-sm">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function ModalHead({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="h2">{title}</h3>
      <button
        type="button"
        className="icon-pill"
        aria-label={t("common.close")}
        onClick={onClose}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}

export function WizardDots({ n, cur }: { n: number; cur: number }) {
  return (
    <div className="progress-dots mb-4">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={i === cur ? "current" : i < cur ? "done" : ""}
        />
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trend && <div className="mt-0.5 text-xs font-bold">{trend}</div>}
    </div>
  );
}

/* ---------- form fields ---------- */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label
        className="label"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Address input with the mock Places datalist + a live map preview. */
export function AddrField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [preview, setPreview] = useState(value);
  return (
    <>
      <Field
        id={id}
        label={label}
      >
        <input
          id={id}
          className="input"
          list="cwa-addresses"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setPreview(value)}
        />
      </Field>
      {preview.trim() && (
        <MapEmbed
          address={preview}
          small
        />
      )}
    </>
  );
}

export function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn("check-row", checked && "checked")}
      htmlFor={id}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
}

export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <label className="switch">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <span className="switch-slider" />
      </label>
    </div>
  );
}

export function SettingCard({
  icon,
  title,
  desc,
  onSave,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  onSave?: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="icon-tile icon-tile-sm">
          <Icon name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="h2">{title}</h3>
          <div className="muted text-sm">{desc}</div>
        </div>
      </div>
      {children}
      {onSave && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-ink btn-sm"
            onClick={onSave}
          >
            {t("common.save")}
          </button>
        </div>
      )}
    </div>
  );
}
