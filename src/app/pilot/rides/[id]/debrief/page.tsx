"use client";

/* The 30-second report: bike condition, battery on return, donation, feedback.
   Completes the ride and pings the chapter admin. */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore, find, notify } from "@/lib/store";
import { toast } from "@/lib/ui";
import { BackHead } from "@/components/chrome";
import { BtnHero } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { usePilot } from "../../../pilot-context";
import { firstName } from "../../../lib";

export default function DebriefPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const { pilotName } = usePilot();

  const ride = find(db.rides, id);
  const tri = ride?.trishawId ? find(db.trishaws, ride.trishawId) : undefined;

  const [bikeOk, setBikeOk] = useState(true);
  const [issue, setIssue] = useState("");
  const [battery, setBattery] = useState(tri ? tri.battery : 70);
  const [donation, setDonation] = useState("");
  const [feedback, setFeedback] = useState("");

  if (!ride) return <BackHead back="/pilot/rides" />;

  function submit() {
    update((d) => {
      const r2 = find(d.rides, id)!;
      r2.debrief = {
        bikeOk,
        issue: bikeOk ? "" : issue.trim(),
        batteryReturn: battery,
        donation: parseFloat(donation) || 0,
        feedback: feedback.trim(),
      };
      r2.status = "done";
      notify(
        d,
        "admin",
        "notif.debrief",
        { pilot: pilotName },
        `/admin/rides/${r2.id}`,
      );
    });
    toast(t("pilot.debrief.done", { name: firstName(pilotName) }));
    router.push("/pilot");
  }

  return (
    <>
      <BackHead
        back={`/pilot/rides/${id}`}
        title={t("pilot.debrief.title")}
        sub={fmt.rideWhen(ride)}
      />
      <div className="app-body gap-6">
        <div className="display display-sm reveal">
          {t("pilot.debrief.title")}
        </div>

        {/* bike condition */}
        <div
          className="field reveal"
          style={{ ["--i" as string]: 1 }}
        >
          <span className="label">{t("pilot.debrief.bike")}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`chip${bikeOk ? " active" : ""}`}
              onClick={() => setBikeOk(true)}
            >
              <Icon
                name="check"
                size={14}
              />
              {t("pilot.debrief.ok")}
            </button>
            <button
              type="button"
              className={`chip${!bikeOk ? " active" : ""}`}
              onClick={() => setBikeOk(false)}
            >
              <Icon
                name="wrench"
                size={14}
              />
              {t("pilot.debrief.problem")}
            </button>
          </div>
          {!bikeOk && (
            <textarea
              className="textarea"
              placeholder={t("pilot.debrief.issuePh")}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
          )}
        </div>

        {/* battery on return */}
        <div
          className="field reveal"
          style={{ ["--i" as string]: 2 }}
        >
          <label
            className="label"
            htmlFor="bat-range"
          >
            {t("pilot.debrief.battery")}
          </label>
          <div className="flex items-center gap-4">
            <input
              id="bat-range"
              type="range"
              min={0}
              max={100}
              value={battery}
              className="flex-1 accent-mint-deep"
              onChange={(e) => setBattery(parseInt(e.target.value, 10))}
            />
            <span className="numeric">{battery}%</span>
          </div>
        </div>

        {/* donation */}
        <div
          className="field reveal"
          style={{ ["--i" as string]: 3 }}
        >
          <label
            className="label"
            htmlFor="don-input"
          >
            {t("common.donation")}
          </label>
          <div className="flex items-center gap-3">
            <span className="h2 muted">€</span>
            <input
              id="don-input"
              type="number"
              min={0}
              step={1}
              className="input"
              placeholder="0"
              value={donation}
              onChange={(e) => setDonation(e.target.value)}
            />
          </div>
        </div>

        {/* feedback */}
        <div
          className="field reveal"
          style={{ ["--i" as string]: 4 }}
        >
          <label
            className="label"
            htmlFor="fb-input"
          >
            {t("pilot.debrief.feedback")}{" "}
            <span className="hint">({t("common.optional")})</span>
          </label>
          <textarea
            id="fb-input"
            className="textarea"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <BtnHero
          label={t("pilot.debrief.submit")}
          icon="checkCheck"
          onClick={submit}
        />
      </div>
    </>
  );
}
