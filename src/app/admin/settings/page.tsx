"use client";

/* Chapter settings: operating model (auto-schedule + lead time), calendar
   (days + hours), booking channels, notifications, waiver text, chapter info. */

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import { AddressDatalist } from "@/components/MapEmbed";
import {
  CH,
  type ChapterX,
  dayName,
  PageHead,
  Field,
  AddrField,
  SwitchRow,
  SettingCard,
} from "../directory-ui";

const DAY_INTS = [1, 2, 3, 4, 5, 6, 0];

export default function SettingsPage() {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const ch = find(db.chapters, CH) as ChapterX;
  const sw = ch.slotWindows || { morning: [9, 12], afternoon: [13, 17] };

  /* draft state, seeded from the chapter once */
  const [auto, setAuto] = useState(!!ch.autoSchedule);
  const [lead, setLead] = useState(String(ch.leadTimeHours));
  const [days, setDays] = useState<number[]>(ch.operatingDays || []);
  const [openH, setOpenH] = useState(String(ch.openHour));
  const [closeH, setCloseH] = useState(String(ch.closeHour));
  const [chan, setChan] = useState(
    ch.channels || { app: true, whatsapp: true, phone: true },
  );
  const [rem, setRem] = useState(
    ch.reminders || { ride: 24, noPilot: 4, demand: "monthly" },
  );
  const [waiverText, setWaiverText] = useState(ch.waiverText || "");
  const [name, setName] = useState(ch.name);
  const [phone, setPhone] = useState(ch.phone || "");
  const [addr, setAddr] = useState(ch.address || "");
  const [waiverSeeded, setWaiverSeeded] = useState(false);

  /* the default waiver text is a translation — seed it client-side once */
  useEffect(() => {
    if (!waiverSeeded && !ch.waiverText) setWaiverText(t("waiver.text"));
    setWaiverSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const co = find(db.countries, ch.country);

  function save(fn: (c: ChapterX) => void) {
    update((d) => {
      const c = find(d.chapters, CH) as ChapterX | undefined;
      if (c) fn(c);
    });
    toast(t("admin.saved"));
  }

  const hourOpts = [];
  for (let h = 8; h <= 20; h++) hourOpts.push(h);

  return (
    <>
      <PageHead title={t("admin.nav.settings")} />
      <div className="flex max-w-2xl flex-col gap-5">
        <SettingCard
          icon="sparkles"
          title={t("admin.set.opModel")}
          desc={t("admin.set.opModelDesc")}
          onSave={() =>
            save((c) => {
              c.autoSchedule = auto;
              c.leadTimeHours = parseInt(lead, 10) || 48;
            })
          }
        >
          <SwitchRow
            id="set-auto"
            label={t("admin.set.auto")}
            hint={t("admin.set.autoHint")}
            checked={auto}
            onChange={setAuto}
          />
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-sm font-semibold"
              htmlFor="set-lead"
            >
              {t("admin.set.leadTime")}
            </label>
            <select
              id="set-lead"
              className="select w-44"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            >
              {[24, 48, 72].map((h) => (
                <option
                  key={h}
                  value={h}
                >
                  {t("admin.set.hoursN", { h })}
                </option>
              ))}
            </select>
          </div>
        </SettingCard>

        <SettingCard
          icon="calendar"
          title={t("admin.set.calCard")}
          desc={t("admin.set.calDesc")}
          onSave={() =>
            save((c) => {
              c.operatingDays = [...days];
              c.openHour = parseInt(openH, 10) || 9;
              c.closeHour = parseInt(closeH, 10) || 18;
            })
          }
        >
          <div className="field">
            <span className="label">{t("admin.set.days")}</span>
            <div className="flex flex-wrap gap-2">
              {DAY_INTS.map((di) => (
                <button
                  key={di}
                  type="button"
                  className={`chip${days.includes(di) ? " active" : ""}`}
                  onClick={() =>
                    setDays((cur) =>
                      cur.includes(di)
                        ? cur.filter((x) => x !== di)
                        : [...cur, di],
                    )
                  }
                >
                  {dayName(fmt, di)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="set-open"
              label={t("admin.set.opens")}
            >
              <select
                id="set-open"
                className="select"
                value={openH}
                onChange={(e) => setOpenH(e.target.value)}
              >
                {hourOpts.map((h) => (
                  <option
                    key={h}
                    value={h}
                  >
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="set-close"
              label={t("admin.set.closes")}
            >
              <select
                id="set-close"
                className="select"
                value={closeH}
                onChange={(e) => setCloseH(e.target.value)}
              >
                {hourOpts.map((h) => (
                  <option
                    key={h}
                    value={h}
                  >
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="hint">
            {t("admin.set.slotHint", {
              m0: sw.morning[0],
              m1: sw.morning[1],
              a0: sw.afternoon[0],
              a1: sw.afternoon[1],
            })}
          </div>
        </SettingCard>

        <SettingCard
          icon="phone"
          title={t("admin.set.channels")}
          desc={t("admin.set.channelsDesc")}
          onSave={() =>
            save((c) => {
              c.channels = { ...chan };
            })
          }
        >
          <SwitchRow
            id="set-ch-app"
            label={t("admin.set.chApp")}
            hint={t("admin.set.chAppHint")}
            checked={chan.app !== false}
            onChange={(v) => setChan({ ...chan, app: v })}
          />
          <SwitchRow
            id="set-ch-wa"
            label={t("admin.set.chWa")}
            hint={t("admin.set.chWaHint")}
            checked={chan.whatsapp !== false}
            onChange={(v) => setChan({ ...chan, whatsapp: v })}
          />
          <SwitchRow
            id="set-ch-ph"
            label={t("admin.set.chPhone")}
            hint={t("admin.set.chPhoneHint")}
            checked={chan.phone !== false}
            onChange={(v) => setChan({ ...chan, phone: v })}
          />
        </SettingCard>

        <SettingCard
          icon="bell"
          title={t("admin.set.notif")}
          desc={t("admin.set.notifDesc")}
          onSave={() =>
            save((c) => {
              c.reminders = { ...rem };
            })
          }
        >
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-sm font-semibold"
              htmlFor="set-rem-ride"
            >
              {t("admin.set.rideReminder")}
            </label>
            <select
              id="set-rem-ride"
              className="select w-44"
              value={rem.ride}
              onChange={(e) =>
                setRem({ ...rem, ride: parseInt(e.target.value, 10) })
              }
            >
              {[24, 48].map((h) => (
                <option
                  key={h}
                  value={h}
                >
                  {t("admin.set.hBefore", { h })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-sm font-semibold"
              htmlFor="set-rem-pilot"
            >
              {t("admin.set.noPilotAlert")}
            </label>
            <select
              id="set-rem-pilot"
              className="select w-44"
              value={rem.noPilot}
              onChange={(e) =>
                setRem({ ...rem, noPilot: parseInt(e.target.value, 10) })
              }
            >
              {[2, 4, 6].map((h) => (
                <option
                  key={h}
                  value={h}
                >
                  {t("admin.set.hBefore", { h })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <label
                className="text-sm font-semibold"
                htmlFor="set-rem-demand"
              >
                {t("admin.set.demandCheck")}
              </label>
              <div className="hint">{t("admin.set.demandHint")}</div>
            </div>
            <select
              id="set-rem-demand"
              className="select w-44"
              value={rem.demand}
              onChange={(e) => setRem({ ...rem, demand: e.target.value })}
            >
              <option value="weekly">{t("admin.set.weekly")}</option>
              <option value="monthly">{t("admin.set.monthly")}</option>
              <option value="off">{t("admin.set.off")}</option>
            </select>
          </div>
        </SettingCard>

        <SettingCard
          icon="shield"
          title={t("waiver.title")}
          desc={t("admin.set.waiverDesc")}
          onSave={() =>
            save((c) => {
              c.waiverText = waiverText;
            })
          }
        >
          <textarea
            className="textarea"
            rows={4}
            aria-label={t("waiver.title")}
            value={waiverText}
            onChange={(e) => setWaiverText(e.target.value)}
          />
          <div className="hint">{t("admin.set.waiverHint")}</div>
        </SettingCard>

        <SettingCard
          icon="building"
          title={t("admin.set.infoCard")}
          desc={t("admin.set.infoDesc")}
          onSave={() =>
            save((c) => {
              c.name = name.trim() || "München";
              c.phone = phone.trim();
              c.address = addr.trim();
            })
          }
        >
          <Field
            id="set-name"
            label={t("admin.set.name")}
          >
            <input
              id="set-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            id="set-phone"
            label={t("common.phone")}
          >
            <input
              id="set-phone"
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <AddrField
            id="set-addr"
            label={t("admin.col.address")}
            value={addr}
            onChange={setAddr}
          />
          <div className="field">
            <span className="label">{t("admin.set.country")}</span>
            <div>
              <span className="badge badge-grey">
                {co ? `${co.flag} ${co.name}` : t("admin.set.germany")}
              </span>
            </div>
          </div>
        </SettingCard>
      </div>
      <AddressDatalist />
    </>
  );
}
