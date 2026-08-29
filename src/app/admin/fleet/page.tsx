"use client";

/* Fleet: trishaws (battery, lock code, garage, status) and garages
   (address, map, access instructions) with add wizards. */

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, uid, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import { Icon } from "@/components/Icon";
import { BatteryBar } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { PageHead, ModalHead, Field, AddrField } from "../directory-ui";

export default function FleetPage() {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const [twOpen, setTwOpen] = useState(false);
  const [gOpen, setGOpen] = useState(false);

  return (
    <>
      <PageHead
        title={t("admin.nav.resources")}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setTwOpen(true)}
            >
              <Icon name="plus" />
              {t("admin.res.addTrishaw")}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setGOpen(true)}
            >
              <Icon name="plus" />
              {t("admin.res.addGarage")}
            </button>
          </div>
        }
      />

      <div>
        <h2 className="h2 mb-4">{t("admin.res.trishaws")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {db.trishaws.map((tw) => {
            const g = find(db.garages, tw.garageId);
            return (
              <div
                key={tw.id}
                className="card"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span className="icon-tile on-mint">
                      <Icon name="bike" />
                    </span>
                    <div>
                      <div className="text-base font-semibold">{tw.number}</div>
                      <div className="muted text-sm">{tw.model}</div>
                    </div>
                  </div>
                  {tw.status === "ok" ? (
                    <span className="badge badge-mint">
                      {t("admin.res.ok")}
                    </span>
                  ) : (
                    <span className="badge badge-red">
                      <Icon name="wrench" /> {t("admin.res.service")}
                    </span>
                  )}
                </div>
                <div className="detail-list">
                  <div>
                    <dt className="muted">{t("common.garage")}</dt>
                    <dd>{g ? g.name : "—"}</dd>
                  </div>
                  <div>
                    <dt className="muted">{t("common.battery")}</dt>
                    <dd>
                      <BatteryBar pct={tw.battery} />
                    </dd>
                  </div>
                  <div>
                    <dt className="muted">{t("common.lockCode")}</dt>
                    <dd>
                      <span className="rounded-md bg-grey-tint px-2 py-0.5 font-display font-bold tabular-nums">
                        {tw.lockCode}
                      </span>
                    </dd>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="h2 mb-4">{t("admin.res.garages")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {db.garages.map((g) => (
            <div
              key={g.id}
              className="card"
            >
              <div className="mb-4 flex items-center gap-3.5">
                <span className="icon-tile">
                  <Icon name="warehouse" />
                </span>
                <div>
                  <div className="text-base font-semibold">{g.name}</div>
                  <div className="muted text-sm">{g.address}</div>
                </div>
              </div>
              <MapEmbed
                address={g.address}
                small
                caption={false}
              />
              <div className="mt-4 text-sm">
                <span className="font-semibold">{t("admin.res.access")}:</span>{" "}
                <span className="muted">{g.accessInstructions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddTrishawModal
        open={twOpen}
        onClose={() => setTwOpen(false)}
      />
      <AddGarageModal
        open={gOpen}
        onClose={() => setGOpen(false)}
      />
    </>
  );
}

function AddTrishawModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [number, setNumber] = useState("");
  const [model, setModel] = useState("");
  const [garageId, setGarageId] = useState(db.garages[0]?.id || "");
  const [lock, setLock] = useState("");

  function add() {
    const n = number.trim();
    if (!n) return;
    onClose();
    update((d) => {
      d.trishaws.push({
        id: uid("t"),
        number: n,
        model: model.trim(),
        garageId,
        battery: 100,
        lockCode: lock.trim(),
        status: "ok",
      });
    });
    toast(t("admin.res.trishawAdded", { n }));
    setNumber("");
    setModel("");
    setLock("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <ModalHead
        title={t("admin.res.addTrishaw")}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4">
        <Field
          id="rs-num"
          label={t("admin.res.number")}
        >
          <input
            id="rs-num"
            className="input"
            placeholder="MUC-03"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </Field>
        <Field
          id="rs-model"
          label={t("admin.res.model")}
        >
          <input
            id="rs-model"
            className="input"
            placeholder="Van Raam Chat"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </Field>
        <Field
          id="rs-garage"
          label={t("common.garage")}
        >
          <select
            id="rs-garage"
            className="select"
            value={garageId}
            onChange={(e) => setGarageId(e.target.value)}
          >
            {db.garages.map((g) => (
              <option
                key={g.id}
                value={g.id}
              >
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="rs-lock"
          label={t("common.lockCode")}
        >
          <input
            id="rs-lock"
            className="input"
            placeholder="0000"
            value={lock}
            onChange={(e) => setLock(e.target.value)}
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
    </Modal>
  );
}

function AddGarageModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const update = useStore((s) => s.update);
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [access, setAccess] = useState("");

  function add() {
    const nm = name.trim();
    if (!nm) return;
    onClose();
    update((d) => {
      d.garages.push({
        id: uid("g"),
        name: nm,
        address: addr.trim(),
        accessInstructions: access.trim(),
      });
    });
    toast(t("admin.res.garageAdded", { name: nm }));
    setName("");
    setAddr("");
    setAccess("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <ModalHead
        title={t("admin.res.addGarage")}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4">
        <Field
          id="rg-name"
          label={t("admin.col.name")}
        >
          <input
            id="rg-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <AddrField
          id="rg-addr"
          label={t("admin.col.address")}
          value={addr}
          onChange={setAddr}
        />
        <Field
          id="rg-access"
          label={t("admin.res.accessInstr")}
        >
          <textarea
            id="rg-access"
            className="textarea"
            value={access}
            onChange={(e) => setAccess(e.target.value)}
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
