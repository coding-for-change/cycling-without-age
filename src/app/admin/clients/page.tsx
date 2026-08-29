"use client";

/* Passengers: roster table, detail modal (mark the paper waiver signed),
   add-passenger wizard — residence drives address vs. partner facility. */

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, uid, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { Client } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import {
  PageHead,
  ModalHead,
  WaiverBadge,
  Field,
  AddrField,
  CheckRow,
} from "../directory-ui";

export default function ClientsPage() {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <PageHead
        title={t("admin.nav.clients")}
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setWizardOpen(true)}
          >
            <Icon name="plus" />
            {t("admin.cli.add")}
          </button>
        }
      />
      <ResponsiveTable
        rows={db.clients}
        onRow={(c) => setDetailId(c.id)}
        cols={[
          {
            label: t("admin.col.name"),
            render: (c) => (
              <span className="flex items-center gap-2">
                <Avatar
                  name={c.name}
                  size="sm"
                />
                <span className="font-semibold">{c.name}</span>
              </span>
            ),
          },
          {
            label: t("admin.col.age"),
            render: (c) => <span className="tabular-nums">{c.age || "—"}</span>,
          },
          { label: t("admin.col.address"), render: (c) => c.address },
          {
            label: t("common.waiver"),
            render: (c) => <WaiverBadge client={c} />,
          },
          {
            label: t("admin.col.proxy"),
            render: (c) =>
              c.proxy ? (
                <>
                  {c.proxy.name}{" "}
                  <span className="muted text-sm">({c.proxy.relation})</span>
                </>
              ) : (
                "—"
              ),
          },
          {
            label: t("admin.col.mobility"),
            render: (c) => {
              const s = c.mobilityNotes || "";
              return (
                <span className="muted text-sm">
                  {s.length > 42 ? `${s.slice(0, 42)}…` : s || "—"}
                </span>
              );
            },
          },
        ]}
        card={(c) => (
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Avatar
                name={c.name}
                size="sm"
              />
              <span>
                <span className="block font-semibold">
                  {c.name}
                  {c.age ? `, ${c.age}` : ""}
                </span>
                <span className="muted block text-sm">{c.address}</span>
              </span>
            </span>
            <WaiverBadge client={c} />
          </span>
        )}
      />

      <ClientModal
        id={detailId}
        onClose={() => setDetailId(null)}
      />
      <ClientWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}

function ClientModal({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [waiverCheck, setWaiverCheck] = useState(false);
  const c = id ? find(db.clients, id) : undefined;

  function markSigned() {
    onClose();
    update((d) => {
      const cl = find(d.clients, id!);
      if (cl) cl.waiverSigned = true;
    });
    toast(t("admin.cli.signedToast"));
    setWaiverCheck(false);
  }

  return (
    <Modal
      open={!!c}
      onClose={onClose}
    >
      {c && (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <Avatar
                name={c.name}
                size="lg"
              />
              <div>
                <h3 className="h2">{c.name}</h3>
                <div className="muted text-sm">{c.address}</div>
              </div>
            </div>
            <button
              type="button"
              className="icon-pill"
              aria-label={t("common.close")}
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="detail-list">
            <div>
              <dt className="muted">{t("admin.col.age")}</dt>
              <dd>{c.age || "—"}</dd>
            </div>
            <div>
              <dt className="muted">{t("common.phone")}</dt>
              <dd className="tabular-nums">{c.phone}</dd>
            </div>
            <div>
              <dt className="muted">{t("admin.col.address")}</dt>
              <dd>{c.address}</dd>
            </div>
            <div>
              <dt className="muted">{t("common.waiver")}</dt>
              <dd>
                <WaiverBadge client={c} />
              </dd>
            </div>
            {c.mobilityNotes && (
              <div>
                <dt className="muted">{t("admin.col.mobility")}</dt>
                <dd>{c.mobilityNotes}</dd>
              </div>
            )}
            {c.proxy && (
              <>
                <div>
                  <dt className="muted">{t("admin.col.proxy")}</dt>
                  <dd>
                    {c.proxy.name} ({c.proxy.relation})
                  </dd>
                </div>
                <div>
                  <dt className="muted">
                    {t("common.phone")} · {t("admin.col.proxy")}
                  </dt>
                  <dd className="tabular-nums">{c.proxy.phone}</dd>
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            <MapEmbed
              address={c.address}
              small
            />
          </div>
          {!c.waiverSigned && (
            <div className="mt-4 flex flex-col gap-3">
              <CheckRow
                id="cw-check"
                label={t("admin.req.waiverToday")}
                checked={waiverCheck}
                onChange={setWaiverCheck}
              />
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={!waiverCheck}
                onClick={markSigned}
              >
                {t("admin.cli.markSigned")}
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function ClientWizard({
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
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [where, setWhere] = useState<"home" | "facility">("home");
  const [addr, setAddr] = useState("");
  const [partnerId, setPartnerId] = useState(db.partners[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [waiver, setWaiver] = useState(false);

  function add() {
    const nm = name.trim();
    if (!nm) return;
    const atHome = where === "home";
    const pn = find(db.partners, partnerId);
    const ageV = parseInt(age, 10);
    onClose();
    update((d) => {
      const c: Client = {
        id: uid("c"),
        name: nm,
        age: isNaN(ageV) ? 0 : ageV,
        phone: phone.trim(),
        address: atHome ? addr.trim() : pn ? pn.name : "",
        mobilityNotes: notes.trim(),
        waiverSigned: waiver,
        proxy: null,
      };
      if (!atHome) c.partnerId = partnerId;
      d.clients.push(c);
    });
    toast(t("admin.cli.addedToast", { name: nm }));
    setName("");
    setAge("");
    setPhone("");
    setAddr("");
    setNotes("");
    setWaiver(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <ModalHead
        title={t("admin.cli.add")}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4">
        <Field
          id="cl-name"
          label={t("admin.col.name")}
        >
          <input
            id="cl-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="cl-age"
            label={t("admin.col.age")}
          >
            <input
              id="cl-age"
              className="input"
              type="number"
              min={1}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </Field>
          <Field
            id="cl-phone"
            label={t("common.phone")}
          >
            <input
              id="cl-phone"
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>
        <div className="field">
          <span className="label">{t("admin.cli.residence")}</span>
          {(
            [
              ["home", "admin.cli.atHome"],
              ["facility", "admin.cli.inFacility"],
            ] as const
          ).map(([w, key]) => (
            <button
              key={w}
              type="button"
              className={`big-option${where === w ? " selected" : ""}`}
              onClick={() => setWhere(w)}
            >
              <span className="flex-1">{t(key)}</span>
              {where === w && <Icon name="check" />}
            </button>
          ))}
        </div>
        {where === "home" ? (
          <AddrField
            id="cl-addr"
            label={t("admin.col.address")}
            value={addr}
            onChange={setAddr}
          />
        ) : (
          <Field
            id="cl-partner"
            label={t("admin.cli.facility")}
          >
            <select
              id="cl-partner"
              className="select"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              {db.partners.map((pn) => (
                <option
                  key={pn.id}
                  value={pn.id}
                >
                  {pn.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field
          id="cl-notes"
          label={t("admin.col.mobility")}
        >
          <textarea
            id="cl-notes"
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <CheckRow
          id="cl-waiver"
          label={t("admin.cli.waiverPaper")}
          checked={waiver}
          onChange={setWaiver}
        />
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={add}
        >
          {t("common.add")}
        </button>
      </div>
      <AddressDatalist />
    </Modal>
  );
}
