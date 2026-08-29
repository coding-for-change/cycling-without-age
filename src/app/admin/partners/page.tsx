"use client";

/* Partner facilities: card per partner with map + upcoming event rides,
   "plan a ride day" jumps into the rides area, add-partner modal. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, uid } from "@/lib/store";
import { toast } from "@/lib/ui";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { EmptyState } from "@/components/chrome";
import {
  mucRides,
  PageHead,
  ModalHead,
  Field,
  AddrField,
} from "../directory-ui";

export default function PartnersPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [addOpen, setAddOpen] = useState(false);
  const [now] = useState(() => Date.now());

  return (
    <>
      <PageHead
        title={t("admin.nav.partners")}
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddOpen(true)}
          >
            <Icon name="plus" />
            {t("admin.par.add")}
          </button>
        }
      />
      {db.partners.length ? (
        db.partners.map((pn) => {
          const upcoming = mucRides(db)
            .filter(
              (r) =>
                r.type === "event" &&
                r.partnerId === pn.id &&
                r.ts > now &&
                r.status !== "cancelled",
            )
            .sort((a, b) => a.ts - b.ts);
          return (
            <div
              key={pn.id}
              className="card"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="icon-tile">
                    <Icon name="building" />
                  </span>
                  <div>
                    <div className="text-base font-semibold">{pn.name}</div>
                    <div className="muted text-sm">
                      {pn.contactName} ·{" "}
                      <span className="tabular-nums">{pn.phone}</span>
                    </div>
                    <div className="muted text-sm">
                      {pn.address} ·{" "}
                      {t("admin.par.residents", { n: pn.residents })}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => router.push(`/admin/rides?plan=${pn.id}`)}
                >
                  <Icon name="plus" />
                  {t("admin.par.plan")}
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <MapEmbed
                  address={pn.address}
                  small
                />
                <div>
                  <div className="muted mb-2 text-sm font-semibold">
                    {t("admin.par.upcoming")}
                  </div>
                  {upcoming.length ? (
                    <div className="flex flex-col gap-2">
                      {upcoming.map((r) => {
                        const filled = (r.roster || []).filter(
                          (x) => x.name,
                        ).length;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className="record-card"
                            onClick={() => router.push(`/admin/rides/${r.id}`)}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span>
                                <span className="block font-semibold">
                                  {fmt.rideWhen(r)}
                                </span>
                                <span className="muted block text-sm">
                                  {t("admin.ev.progress", {
                                    filled,
                                    total: (r.roster || []).length,
                                  })}
                                </span>
                              </span>
                              <StatusBadge status={r.status} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="muted text-sm">{t("admin.par.none")}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="card">
          <EmptyState
            icon="building"
            text={t("admin.par.none")}
          />
        </div>
      )}

      <AddPartnerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </>
  );
}

function AddPartnerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const update = useStore((s) => s.update);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState("");
  const [res, setRes] = useState("10");

  function add() {
    const nm = name.trim();
    if (!nm) return;
    const resV = parseInt(res, 10);
    onClose();
    update((d) => {
      d.partners.push({
        id: uid("n"),
        name: nm,
        contactName: contact.trim(),
        phone: phone.trim(),
        address: addr.trim(),
        residents: isNaN(resV) ? 0 : resV,
      });
    });
    toast(t("admin.par.addedToast", { name: nm }));
    setName("");
    setContact("");
    setPhone("");
    setAddr("");
    setRes("10");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <ModalHead
        title={t("admin.par.add")}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4">
        <Field
          id="pa-name"
          label={t("admin.col.name")}
        >
          <input
            id="pa-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          id="pa-contact"
          label={t("admin.par.contactName")}
        >
          <input
            id="pa-contact"
            className="input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </Field>
        <Field
          id="pa-phone"
          label={t("common.phone")}
        >
          <input
            id="pa-phone"
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <AddrField
          id="pa-addr"
          label={t("admin.col.address")}
          value={addr}
          onChange={setAddr}
        />
        <Field
          id="pa-res"
          label={t("admin.par.residentsLabel")}
        >
          <input
            id="pa-res"
            className="input"
            type="number"
            min={0}
            value={res}
            onChange={(e) => setRes(e.target.value)}
          />
        </Field>
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
