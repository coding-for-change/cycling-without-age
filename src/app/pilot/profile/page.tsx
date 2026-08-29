"use client";

/* Profile: identity, impact, training shortcut, account, availability,
   chapter card, settings, logout. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import { HeroHead, BrandDot } from "@/components/chrome";
import { Avatar, LangMenu, Ring } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { MapEmbed } from "@/components/MapEmbed";
import { Icon } from "@/components/Icon";
import { usePilot } from "../pilot-context";
import { cleared, pilotStats, trainingProgress, weekDays } from "../lib";

export default function ProfilePage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const { pilotId, rename, logout } = usePilot();

  const [editOpen, setEditOpen] = useState(false);
  const [edName, setEdName] = useState("");
  const [edPhone, setEdPhone] = useState("");
  const [notifOn, setNotifOn] = useState(true);

  const pilot = find(db.pilots, pilotId);
  if (!pilot) return null;
  const chapter = find(db.chapters, pilot.chapterId);
  const garage = db.garages[0];
  const stats = pilotStats(db, pilotId);
  const tp = trainingProgress(db, pilotId);
  const isCleared = cleared(db, pilotId);

  function saveEdit() {
    const name = edName.trim();
    if (!name) return;
    update((d) => {
      const p2 = find(d.pilots, pilotId)!;
      p2.name = name;
      p2.phone = edPhone.trim();
    });
    rename(name);
    setEditOpen(false);
    toast(t("pilot.profile.saved"));
  }

  function toggleAvail(dayInt: number) {
    update((d) => {
      const p2 = find(d.pilots, pilotId)!;
      if (!p2.availability) p2.availability = [];
      const i = p2.availability.indexOf(dayInt);
      if (i === -1) p2.availability.push(dayInt);
      else p2.availability.splice(i, 1);
      p2.availability.sort((a, b) => a - b);
    });
  }

  return (
    <>
      <HeroHead
        lead={<BrandDot />}
        title={t("pilot.tab.profile")}
      />
      <div className="app-body gap-6">
        {/* identity */}
        <div className="tile tile-grey reveal flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <Avatar
              name={pilot.name}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div
                className="tile-value"
                style={{ fontSize: "1.5rem" }}
              >
                {pilot.name}
              </div>
              <div className="tile-label">{pilot.phone}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="cover-chip">
              <Icon name={isCleared ? "shield" : "clock"} />
              {t(
                isCleared
                  ? "pilot.profile.trained"
                  : "pilot.profile.inTraining",
              )}
            </span>
            <span className="cover-chip">
              <Icon name="mapPin" />
              {chapter?.name}
            </span>
            <span className="cover-chip">
              <Icon name="bike" />
              {fmt.num(stats.rides)} {t("common.rides")}
            </span>
          </div>
        </div>

        {/* stats */}
        <div
          className="tile-grid-3 reveal"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="tile tile-mint">
            <div className="tile-value">{fmt.num(stats.rides)}</div>
            <div className="tile-label">{t("pilot.statRides")}</div>
          </div>
          <div className="tile tile-grey">
            <div className="tile-value">{fmt.num(stats.hours)}</div>
            <div className="tile-label">{t("pilot.statHours")}</div>
          </div>
          <div className="tile tile-paper">
            <div
              className="tile-value"
              style={{ fontSize: "1.25rem" }}
            >
              {fmt.euro(stats.donations)}
            </div>
            <div className="tile-label">{t("pilot.statDonations")}</div>
          </div>
        </div>

        {/* training */}
        <button
          type="button"
          className="card reveal flex items-center gap-3.5 text-left"
          style={{ ["--i" as string]: 2 }}
          onClick={() => router.push("/pilot/training")}
        >
          <Ring
            pct={tp.pct}
            label={`${tp.pct}%`}
            tone={isCleared ? "mint" : "red"}
          />
          <span className="flex-1">
            <span className="h2 block">{t("common.training")}</span>
            <span className="text-sm muted">
              {t("pilot.training.progress", {
                done: fmt.num(tp.done),
                total: fmt.num(tp.total),
              })}
            </span>
          </span>
          <Icon
            name="chevronRight"
            className="muted"
          />
        </button>

        {/* account */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 3 }}
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">{t("pilot.profile.account")}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setEdName(pilot.name);
                setEdPhone(pilot.phone);
                setEditOpen(true);
              }}
            >
              <Icon name="pencil" />
              {t("common.edit")}
            </button>
          </div>
          <dl className="detail-list">
            <div>
              <dt className="muted">{t("pilot.profile.name")}</dt>
              <dd className="font-semibold">{pilot.name}</dd>
            </div>
            <div>
              <dt className="muted">{t("common.phone")}</dt>
              <dd className="font-semibold">{pilot.phone}</dd>
            </div>
          </dl>
        </div>

        {/* availability */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 4 }}
        >
          <div className="eyebrow">{t("common.availability")}</div>
          <div className="week-strip">
            {weekDays(0).map((ts) => {
              const dayInt = new Date(ts).getDay();
              const on = (pilot.availability || []).includes(dayInt);
              return (
                <button
                  key={ts}
                  type="button"
                  className={on ? "active" : ""}
                  onClick={() => toggleAvail(dayInt)}
                >
                  <span>{fmt.weekday(ts)}</span>
                  <span className="dnum">
                    {on ? (
                      <Icon
                        name="check"
                        size={15}
                      />
                    ) : (
                      "·"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="hint">{t("pilot.profile.availHint")}</div>
        </div>

        {/* chapter */}
        <div
          className="card reveal flex flex-col gap-3"
          style={{ ["--i" as string]: 5 }}
        >
          <div className="eyebrow">{t("pilot.profile.chapterCard")}</div>
          <div className="flex items-center gap-3.5">
            <span className="icon-tile on-red">
              <Icon name="mapPin" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="h2 block">{chapter?.name}</span>
              {garage && (
                <span className="text-sm muted">
                  {t("pilot.profile.homeBase")}: {garage.name}
                </span>
              )}
            </span>
          </div>
          {garage && (
            <MapEmbed
              address={garage.address}
              small
            />
          )}
          {chapter?.phone && (
            <a
              className="btn btn-outline btn-xl btn-block"
              href={`tel:${chapter.phone.replace(/\s+/g, "")}`}
            >
              <Icon name="phone" />
              {chapter.phone}
            </a>
          )}
        </div>

        {/* settings */}
        <div
          className="card reveal flex flex-col gap-4"
          style={{ ["--i" as string]: 6 }}
        >
          <div className="eyebrow">{t("common.settings")}</div>
          <div className="flex items-center justify-between">
            <span>{t("common.language")}</span>
            <LangMenu />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex-1">
              <span className="block">{t("common.notifications")}</span>
              <span className="hint">{t("pilot.profile.notifHint")}</span>
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={notifOn}
                onChange={(e) => setNotifOn(e.target.checked)}
              />
              <span className="switch-slider" />
            </label>
          </div>
          <div className="text-center">
            <Link
              className="text-sm muted underline"
              href="/"
            >
              {t("pilot.profile.home")}
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-destructive-outline btn-xl btn-block"
          onClick={logout}
        >
          <Icon name="logout" />
          {t("auth.logout")}
        </button>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="h2">{t("pilot.profile.editTitle")}</div>
          <div className="field">
            <label
              className="label"
              htmlFor="ed-name"
            >
              {t("pilot.profile.name")}
            </label>
            <input
              id="ed-name"
              className="input"
              value={edName}
              onChange={(e) => setEdName(e.target.value)}
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
              value={edPhone}
              onChange={(e) => setEdPhone(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline flex-1"
              onClick={() => setEditOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={saveEdit}
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
