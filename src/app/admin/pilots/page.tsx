"use client";

/* Pilots & volunteers: roster table, invite wizard, approval flow (volunteers
   with unfinished required training get a warning before approval). */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, notify, uid, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { Pilot } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import {
  CH,
  myPilots,
  missingTrainings,
  requiredFor,
  dayNames,
  PageHead,
  ModalHead,
  RoleBadge,
  Field,
} from "../directory-ui";

export default function PilotsPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);

  const rows = myPilots(db);

  function doApprove(pid: string) {
    let pName = "";
    update((d) => {
      const p = find(d.pilots, pid);
      if (!p) return;
      p.role = "pilot";
      p.trained = true;
      pName = p.name;
      notify(
        d,
        `pilot:${pid}`,
        "notif.approved",
        { name: p.name },
        "/pilot/profile",
      );
    });
    toast(t("admin.pil.approvedToast", { name: pName }));
  }

  function askApprove(pid: string) {
    const p = find(db.pilots, pid);
    if (!p) return;
    if (!missingTrainings(db, p).length) doApprove(pid);
    else setApproveId(pid);
  }

  const approvee = approveId ? find(db.pilots, approveId) : undefined;
  const missing = approvee ? missingTrainings(db, approvee) : [];

  const approveBtn = (p: Pilot) =>
    p.role === "volunteer" ? (
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={(e) => {
          e.stopPropagation();
          askApprove(p.id);
        }}
      >
        {t("admin.pil.approve")}
      </button>
    ) : null;

  return (
    <>
      <PageHead
        title={t("admin.nav.pilots")}
        intro={t("admin.pil.explainer")}
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setInviteOpen(true)}
          >
            <Icon name="plus" />
            {t("admin.pil.invite")}
          </button>
        }
      />
      <ResponsiveTable
        rows={rows}
        cols={[
          {
            label: t("admin.col.name"),
            render: (p) => (
              <span className="flex items-center gap-2">
                <Avatar
                  name={p.name}
                  size="sm"
                />
                <span className="font-semibold">{p.name}</span>
              </span>
            ),
          },
          {
            label: t("admin.col.role"),
            render: (p) => <RoleBadge pilot={p} />,
          },
          {
            label: t("admin.col.trained"),
            render: (p) =>
              p.trained ? (
                <Icon
                  name="check"
                  className="text-mint-deep"
                  size={16}
                />
              ) : (
                <>—</>
              ),
          },
          {
            label: t("common.availability"),
            render: (p) => (
              <span className="muted text-sm">
                {dayNames(fmt, p.availability) || "—"}
              </span>
            ),
          },
          {
            label: t("admin.col.rides"),
            render: (p) => <span className="tabular-nums">{p.rides}</span>,
          },
          {
            label: t("common.phone"),
            render: (p) => (
              <span className="muted tabular-nums">{p.phone}</span>
            ),
          },
          { label: "", render: (p) => approveBtn(p) },
        ]}
        card={(p) => (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Avatar
                  name={p.name}
                  size="sm"
                />
                <span>
                  <span className="block font-semibold">{p.name}</span>
                  <span className="muted block text-sm tabular-nums">
                    {p.phone} · {p.rides} {t("common.rides")}
                  </span>
                </span>
              </span>
              <RoleBadge pilot={p} />
            </span>
            {p.role === "volunteer" && (
              <span className="mt-2 block">{approveBtn(p)}</span>
            )}
          </>
        )}
      />

      {/* approve-with-missing-training warning */}
      <Modal
        open={!!approveId}
        onClose={() => setApproveId(null)}
      >
        {approvee && (
          <>
            <h3 className="h2 mb-3">
              {t("admin.pil.approveQ", { name: approvee.name })}
            </h3>
            <div className="alert alert-red">
              <Icon name="alert" />
              <div>
                <div className="font-bold">
                  {t("admin.pil.missing", {
                    list: missing.map((x) => x.title).join(", "),
                  })}
                </div>
                <div className="mt-1 text-sm">{t("admin.tr.intro")}</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setApproveId(null)}
              >
                {t("common.cancel")}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setApproveId(null);
                    router.push("/admin/training");
                  }}
                >
                  <Icon name="clipboard" />
                  {t("common.training")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const id = approveId!;
                    setApproveId(null);
                    doApprove(id);
                  }}
                >
                  {t("admin.pil.approveAnyway")}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  );
}

function InviteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [prole, setProle] = useState<"volunteer" | "pilot">("volunteer");

  const needed = requiredFor(db, "pilot")
    .map((x) => x.title)
    .join(", ");

  function send() {
    const nm = name.trim();
    if (!nm) return;
    onClose();
    update((d) => {
      d.pilots.push({
        id: uid("p"),
        name: nm,
        phone: phone.trim(),
        role: prole,
        trained: prole === "pilot",
        rides: 0,
        chapterId: CH,
        langs: ["de"],
        availability: [],
        trainingsDone: [],
      });
    });
    toast(t("admin.pil.invitedToast", { name: nm }));
    setName("");
    setPhone("");
    setProle("volunteer");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <ModalHead
        title={t("admin.pil.invite")}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4">
        <Field
          id="pi-name"
          label={t("admin.col.name")}
        >
          <input
            id="pi-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          id="pi-phone"
          label={t("common.phone")}
        >
          <input
            id="pi-phone"
            className="input"
            type="tel"
            placeholder="+49 170 555 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <div className="field">
          <span className="label">{t("admin.col.role")}</span>
          <div className="flex flex-wrap gap-2">
            {(["volunteer", "pilot"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`chip${prole === r ? " active" : ""}`}
                onClick={() => setProle(r)}
              >
                {t(
                  r === "pilot" ? "admin.pil.pilot" : "admin.pil.roleVolunteer",
                )}
              </button>
            ))}
          </div>
          <span className="hint">
            {t(
              prole === "pilot"
                ? "admin.pil.rolePilotHint"
                : "admin.pil.roleVolunteerHint",
            )}
          </span>
        </div>
        {needed && (
          <div className="alert alert-mint">
            <Icon name="clipboard" />
            <div>{t("admin.pil.needs", { list: needed })}</div>
          </div>
        )}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={send}
        >
          <Icon name="send" />
          {t("admin.pil.invite")}
        </button>
      </div>
    </Modal>
  );
}
