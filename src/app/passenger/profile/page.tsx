"use client";

/* Profile: identity, account details (editable), my chapter, settings, logout. */

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { auth } from "@/lib/auth";
import { toast } from "@/lib/ui";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { HeroHead, BrandDot } from "@/components/chrome";
import { Avatar, LangMenu } from "@/components/bits";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { usePassenger, NOTIF_KEY } from "../session";

export default function ProfilePage() {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const session = usePassenger();
  const [editOpen, setEditOpen] = useState(false);
  const [notifsOn, setNotifsOn] = useState(() => {
    try {
      return localStorage.getItem(NOTIF_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const c = find(db.clients, session.userId)!;
  const chapter = find(db.chapters, "muc")!;
  const partner = c.partnerId ? find(db.partners, c.partnerId) : undefined;
  const residence = partner
    ? partner.name
    : `${t("pax.atHome")} · ${c.address || ""}`;
  const mapAddress = partner ? partner.address : c.address;
  const done = db.rides.filter(
    (r) => r.clientId === session.userId && r.status === "done",
  );

  const rows: [string, string][] = [
    [t("pax.yourName"), c.name],
    [t("common.phone"), c.phone || ""],
    [
      partner ? t("common.chapter") : t("pax.address"),
      partner ? partner.name : c.address || "",
    ],
  ];

  return (
    <>
      <HeroHead
        lead={<BrandDot />}
        title={t("pax.tab.profile")}
      />
      <div className="app-body gap-5">
        {/* identity */}
        <div className="tile tile-grey reveal flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <Avatar
              name={c.name}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div
                className="tile-value"
                style={{ fontSize: "1.5rem" }}
              >
                {c.name}
              </div>
              <div className="tile-label">{c.phone || ""}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="cover-chip">
              <Icon name="user" />
              {t("common.passenger")}
            </span>
            <span className="cover-chip">
              <Icon name="mapPin" />
              {chapter.name}
            </span>
            {done.length > 0 && (
              <span className="cover-chip">
                <Icon name="bike" />
                {fmt.num(done.length)} {t("common.rides")}
              </span>
            )}
          </div>
        </div>

        {/* account */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="eyebrow">{t("pax.account")}</div>
          <dl className="detail-list">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => {
              setForm({
                name: c.name,
                phone: c.phone || "",
                address: c.address || "",
              });
              setEditOpen(true);
            }}
          >
            <Icon name="pencil" />
            {t("common.edit")}
          </button>
        </div>

        {/* my chapter */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 2 }}
        >
          <div className="eyebrow">{t("pax.myChapter")}</div>
          <div className="flex items-center gap-3.5">
            <span className="icon-tile on-red">
              <Icon name="mapPin" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="h2 block">{chapter.name}</span>
              <span className="muted block text-sm">{residence}</span>
            </span>
          </div>
          <MapEmbed
            address={mapAddress || ""}
            small
          />
          <a
            className="btn btn-outline btn-xl btn-block"
            href={`tel:${chapter.phone?.replace(/\s+/g, "")}`}
          >
            <Icon name="phone" />
            {chapter.phone}
          </a>
        </div>

        {/* settings */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 3 }}
        >
          <div className="eyebrow">{t("common.settings")}</div>
          <div className="flex items-center justify-between gap-3">
            <span>{t("common.language")}</span>
            <LangMenu />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div>{t("common.notifications")}</div>
              <div className="hint">{t("pax.notifsHint")}</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={notifsOn}
                onChange={(e) => {
                  setNotifsOn(e.target.checked);
                  localStorage.setItem(NOTIF_KEY, e.target.checked ? "1" : "0");
                }}
              />
              <span className="switch-slider" />
            </label>
          </div>
          <Link
            href="/whatsapp"
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <Icon
                name="whatsapp"
                size={17}
              />
              <span>{t("pax.wa.row")}</span>
            </span>
            <Icon
              name="chevronRight"
              className="muted"
            />
          </Link>
          <div className="text-center">
            <Link
              href="/"
              className="text-sm muted"
            >
              {t("pax.demoHome")}
            </Link>
          </div>
        </div>

        {/* logout */}
        <button
          type="button"
          className="btn btn-destructive-outline btn-xl btn-block"
          onClick={() => {
            auth.logout("passenger");
            // full reload so the shell re-boots into the sign-in flow
            location.reload();
          }}
        >
          <Icon name="logout" />
          {t("auth.logout")}
        </button>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
      >
        <div className="flex flex-col gap-5">
          <div className="h2">{t("pax.editAccount")}</div>
          <div className="field">
            <label
              className="label"
              htmlFor="ed-name"
            >
              {t("pax.yourName")}
            </label>
            <input
              id="ed-name"
              className="input"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label
              className="label"
              htmlFor="ed-phone"
            >
              {t("common.phone")}
            </label>
            <input
              id="ed-phone"
              className="input"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          {!partner && (
            <>
              <div className="field">
                <label
                  className="label"
                  htmlFor="ed-address"
                >
                  {t("pax.address")}
                </label>
                <input
                  id="ed-address"
                  className="input"
                  type="text"
                  list="cwa-addresses"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
              <AddressDatalist />
            </>
          )}
          <button
            type="button"
            className="btn btn-primary btn-xl btn-block"
            onClick={() => {
              const name = form.name.trim();
              if (!name) return;
              update((d) => {
                const cc = find(d.clients, session.userId);
                if (!cc) return;
                cc.name = name;
                cc.phone = form.phone.trim();
                if (!partner) cc.address = form.address.trim();
              });
              auth.save("passenger", { ...session, name });
              setEditOpen(false);
              toast(t("pax.savedToast"), "success");
            }}
          >
            {t("common.save")}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-xl btn-block"
            onClick={() => setEditOpen(false)}
          >
            {t("common.cancel")}
          </button>
        </div>
      </Modal>
    </>
  );
}
