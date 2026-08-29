"use client";

/* Sign-up wizard: name & phone → where you live (home / facility) → your local
   chapter → waiver → passkey. Creates a real client record in the store. */

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, uid, find } from "@/lib/store";
import { auth, type Session } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { BackHead } from "@/components/chrome";
import { BtnHero } from "@/components/bits";
import { MapEmbed, AddressDatalist } from "@/components/MapEmbed";
import { Dots, BigOpt } from "./parts";

const PERSONA = "passenger" as const;

interface SuState {
  step: number;
  name: string;
  phone: string;
  where: "home" | "facility" | null;
  address: string;
  partnerId: string | null;
  waiver: boolean;
  creating: boolean;
}

export function SignupWizard({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (s: Session) => void;
}) {
  const { t } = useI18n();
  const db = useStore((st) => st.db)!;
  const update = useStore((st) => st.update);
  const [s, setS] = useState<SuState>({
    step: 1,
    name: "",
    phone: "",
    where: null,
    address: "",
    partnerId: null,
    waiver: false,
    creating: false,
  });
  const set = (patch: Partial<SuState>) =>
    setS((prev) => ({ ...prev, ...patch }));
  const chapter = find(db.chapters, "muc")!;

  const stepOk =
    s.step === 1
      ? !!(s.name.trim() && s.phone.trim())
      : s.step === 2
        ? s.where === "facility"
          ? !!s.partnerId
          : s.where === "home" && s.address.trim().length >= 4
        : s.step === 4
          ? s.waiver
          : true;

  function createAccount() {
    let sess: Session | null = null;
    update((d) => {
      const partner = s.partnerId ? find(d.partners, s.partnerId) : undefined;
      const c = {
        id: uid("c"),
        name: s.name.trim(),
        age: 0,
        phone: s.phone.trim(),
        address: partner ? partner.name : s.address.trim(),
        mobilityNotes: "",
        waiverSigned: true,
        proxy: null,
        ...(partner ? { partnerId: partner.id } : {}),
      };
      d.clients.push(c);
      sess = { userId: c.id, name: c.name, loggedIn: true };
    });
    if (sess) {
      auth.save(PERSONA, sess);
      onDone(sess);
    }
  }

  const nextBtn = (
    <BtnHero
      label={t("common.next")}
      tone="ink"
      disabled={!stepOk}
      onClick={() => set({ step: s.step + 1 })}
    />
  );

  let body: React.ReactNode = null;
  if (s.step === 1) {
    body = (
      <>
        <div className="display display-sm">{t("pax.su.q1")}</div>
        <div className="field">
          <label
            className="label"
            htmlFor="su-name"
          >
            {t("pax.yourName")}
          </label>
          <input
            id="su-name"
            className="input"
            type="text"
            value={s.name}
            placeholder={t("pax.su.namePh")}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <label
            className="label"
            htmlFor="su-phone"
          >
            {t("common.phone")}
          </label>
          <input
            id="su-phone"
            className="input"
            type="tel"
            value={s.phone}
            placeholder={t("pax.su.phonePh")}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </div>
        {nextBtn}
      </>
    );
  } else if (s.step === 2) {
    body = (
      <>
        <div className="display display-sm">{t("pax.su.q2")}</div>
        <div className="flex flex-col gap-3">
          <BigOpt
            icon="home"
            tone="on-mint"
            title={t("pax.atHome")}
            hint={t("pax.su.atHomeSub")}
            selected={s.where === "home"}
            onClick={() => set({ where: "home", partnerId: null })}
          />
          <BigOpt
            icon="building"
            tone="on-grey"
            title={t("pax.su.facility")}
            hint={t("pax.su.facilitySub")}
            selected={s.where === "facility"}
            onClick={() => set({ where: "facility", address: "" })}
          />
        </div>
        {s.where === "home" && (
          <>
            <div className="field">
              <label
                className="label"
                htmlFor="su-address"
              >
                {t("pax.address")}
              </label>
              <input
                id="su-address"
                className="input"
                type="text"
                list="cwa-addresses"
                value={s.address}
                onChange={(e) => set({ address: e.target.value })}
              />
            </div>
            <AddressDatalist />
            {s.address.trim().length >= 4 && (
              <MapEmbed
                address={s.address.trim()}
                small
              />
            )}
            {nextBtn}
          </>
        )}
        {s.where === "facility" && (
          <>
            <div className="label">{t("pax.su.pickFacility")}</div>
            <div className="flex flex-col gap-3">
              {db.partners.map((p) => (
                <BigOpt
                  key={p.id}
                  icon="armchair"
                  tone="on-grey"
                  title={p.name}
                  hint={p.address}
                  selected={s.partnerId === p.id}
                  onClick={() => set({ partnerId: p.id })}
                />
              ))}
            </div>
            {nextBtn}
          </>
        )}
      </>
    );
  } else if (s.step === 3) {
    const mapAddr = s.partnerId
      ? find(db.partners, s.partnerId)?.address || ""
      : s.address;
    body = (
      <>
        <div className="display display-sm">{t("pax.su.chapterFound")}</div>
        <div className="tile tile-mint flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="icon-tile on-ink">
              <Icon name="mapPin" />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="tile-value"
                style={{ fontSize: "1.375rem" }}
              >
                {chapter.name}
              </div>
              <div className="tile-label">{chapter.phone}</div>
            </div>
          </div>
          <div className="text-sm">{t("pax.su.chapterHint")}</div>
        </div>
        <MapEmbed
          address={mapAddr}
          small
        />
        {nextBtn}
      </>
    );
  } else if (s.step === 4) {
    body = (
      <>
        <div className="display display-sm">{t("waiver.title")}</div>
        <label className={`check-row${s.waiver ? " checked" : ""}`}>
          <input
            type="checkbox"
            checked={s.waiver}
            onChange={(e) => set({ waiver: e.target.checked })}
          />
          <span>{t("waiver.text")}</span>
        </label>
        {nextBtn}
      </>
    );
  } else {
    body = (
      <>
        <div className="display display-sm">{t("pax.su.q5")}</div>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`passkey-orb${s.creating ? " ok" : ""}`}>
            <Icon name={s.creating ? "check" : "key"} />
          </div>
          <div className="hint">
            {s.creating ? t("auth.verifying") : t("pax.su.passkeyLine")}
          </div>
        </div>
        <BtnHero
          label={t("pax.su.createPasskey")}
          icon="key"
          disabled={s.creating}
          onClick={() => {
            set({ creating: true });
            setTimeout(createAccount, 1400);
          }}
        />
      </>
    );
  }

  return (
    <>
      <BackHead
        title={t("auth.signup")}
        onBack={() => (s.step > 1 ? set({ step: s.step - 1 }) : onBack())}
      />
      <div className="app-body gap-5 pb-10">
        <Dots
          step={s.step}
          total={5}
        />
        {body}
      </div>
    </>
  );
}
