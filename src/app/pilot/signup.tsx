"use client";

/* Become-a-pilot sign-up wizard: name & phone → your chapter → how it works →
   passkey ceremony. Creates a real volunteer record in the store. */

import { useState } from "react";
import { useStore, find, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { auth, type Session } from "@/lib/auth";
import { BackHead } from "@/components/chrome";
import { BtnHero } from "@/components/bits";
import { MapEmbed } from "@/components/MapEmbed";
import { Icon } from "@/components/Icon";

export function SignupWizard({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (s: Session) => void;
}) {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const chapter = find(db.chapters, "muc");
  const pilotCount = db.pilots.filter((p) => p.chapterId === "muc").length;
  const canNext = step !== 1 || (!!name.trim() && !!phone.trim());

  function create() {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      const id = uid("p");
      update((d) => {
        d.pilots.push({
          id,
          name: name.trim(),
          phone: phone.trim(),
          role: "volunteer",
          trained: false,
          rides: 0,
          chapterId: "muc",
          langs: [],
          availability: [],
          trainingsDone: [],
        });
      });
      onCreated(
        auth.save("pilot", { userId: id, name: name.trim(), loggedIn: true }),
      );
    }, 1500);
  }

  return (
    <>
      <BackHead
        onBack={() => (step > 1 ? setStep(step - 1) : onBack())}
        title={t("auth.signup")}
      />
      <div className="app-body gap-5 pb-10">
        <div className="progress-dots">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={i < step ? "done" : i === step ? "current" : ""}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="display display-sm">{t("pilot.signup.q1")}</div>
            <div className="field">
              <label
                className="label"
                htmlFor="su-name"
              >
                {t("pilot.signup.nameLabel")}
              </label>
              <input
                id="su-name"
                className="input"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="hint">{t("pilot.signup.phoneHint")}</span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="display display-sm">{t("pilot.signup.q2")}</div>
            <div className="tile tile-mint flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="icon-tile on-ink">
                  <Icon name="mapPin" />
                </span>
                <span>
                  <span
                    className="tile-value block"
                    style={{ fontSize: "1.375rem" }}
                  >
                    {chapter?.name}
                  </span>
                  <span className="tile-label">
                    {t("pilot.signup.chapterFound")}
                  </span>
                </span>
              </div>
              <div className="text-sm">
                {t("pilot.signup.chapterPilots", { n: fmt.num(pilotCount) })}
              </div>
            </div>
            <MapEmbed
              address={db.garages[0]?.address || "München"}
              small
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="display display-sm">{t("pilot.signup.q3")}</div>
            <div className="flex flex-col gap-3">
              {(
                [
                  ["play", "pilot.signup.s1", "on-grey"],
                  ["users", "pilot.signup.s2", "on-grey"],
                  ["bike", "pilot.signup.s3", "on-mint"],
                ] as const
              ).map(([icon, key, tone], i) => (
                <div
                  key={key}
                  className="card reveal flex items-center gap-3.5"
                  style={{ ["--i" as string]: i }}
                >
                  <span className={`icon-tile ${tone}`}>
                    <Icon name={icon} />
                  </span>
                  <span className="flex-1 text-sm">{t(key)}</span>
                  <span className="numeric muted">{i + 1}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="display display-sm">{t("pilot.signup.q4")}</div>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className={`passkey-orb${busy ? " ok" : ""}`}>
                <Icon name={busy ? "check" : "key"} />
              </div>
              <div className="text-center text-sm muted">
                {t(busy ? "pilot.signup.creating" : "pilot.signup.passkeyHint")}
              </div>
            </div>
          </>
        )}

        {step < 4 ? (
          <BtnHero
            tone="ink"
            label={t("common.next")}
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
          />
        ) : (
          <BtnHero
            label={t(busy ? "pilot.signup.creating" : "pilot.signup.create")}
            icon="key"
            disabled={busy}
            onClick={create}
          />
        )}
      </div>
    </>
  );
}
