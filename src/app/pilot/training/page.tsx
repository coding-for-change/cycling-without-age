"use client";

/* Onboarding training: two videos (mock player fills a meter, then counts as
   watched) and the captain-signed-off practical workshop. */

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import { Scene } from "@/lib/art";
import type { Training } from "@/lib/types";
import { BackHead } from "@/components/chrome";
import { Ring } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { usePilot } from "../pilot-context";
import { cleared, trainingDone, trainingProgress } from "../lib";

export default function TrainingPage() {
  const { t, fmt } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const { pilotId } = usePilot();

  const [playing, setPlaying] = useState<Training | null>(null);
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);

  const p = find(db.pilots, pilotId);
  const tp = trainingProgress(db, pilotId);

  function finish(tr: Training) {
    update((d) => {
      const p2 = find(d.pilots, pilotId)!;
      if (!p2.trainingsDone) p2.trainingsDone = [];
      if (!p2.trainingsDone.includes(tr.id)) p2.trainingsDone.push(tr.id);
    });
    setPlaying(null);
    /* read the fresh state for the toast */
    const d2 = { ...db };
    const nowDone = [...(p?.trainingsDone || []), tr.id];
    const allDone = d2.trainings
      .filter((x) => x.requiredFor.includes("pilot"))
      .every((x) => nowDone.includes(x.id));
    if (allDone) {
      toast(t("pilot.training.allDone"));
      if (p?.role === "volunteer")
        toast(t("pilot.training.captainApproves"), "info");
    } else {
      toast(t("pilot.training.videoDone"));
    }
  }

  /* mock player: the meter fills over ~2.5s, then the video counts as watched */
  useEffect(() => {
    if (!playing) return;
    doneRef.current = false;
    setPct(0);
    const iv = setInterval(() => {
      setPct((prev) => {
        const next = prev + 5;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          clearInterval(iv);
          setTimeout(() => finish(playing), 150);
        }
        return Math.min(next, 100);
      });
    }, 125);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <>
      <BackHead
        back="/pilot/profile"
        title={t("common.training")}
      />
      <div className="app-body gap-6">
        <div
          className={`tile ${cleared(db, pilotId) ? "tile-mint" : "tile-red"} reveal flex items-center gap-4`}
        >
          <Ring
            pct={tp.pct}
            label={`${tp.pct}%`}
            tone={cleared(db, pilotId) ? "mint" : "red"}
          />
          <div className="flex-1">
            <div
              className="tile-value"
              style={{ fontSize: "1.25rem" }}
            >
              {t("pilot.training.progress", {
                done: fmt.num(tp.done),
                total: fmt.num(tp.total),
              })}
            </div>
            <div className="tile-label">{t("pilot.training.intro")}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {db.trainings.map((tr, i) => {
            const done = trainingDone(p, tr.id);
            const required = (tr.requiredFor || []).includes("pilot");
            const tappable = tr.type === "video" && !done;
            const inner = (
              <>
                <span
                  className={`flex h-14 w-20 flex-none items-center justify-center rounded-xl ${done ? "bg-mint-tint" : "bg-mint-deep text-white"}`}
                >
                  {done ? (
                    <Icon name="check" />
                  ) : (
                    <span
                      className="play-tri"
                      style={{ width: "2rem", height: "2rem" }}
                    >
                      <Icon
                        name="play"
                        size={14}
                      />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                  <span className="font-semibold">{tr.title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs muted">
                    <span>
                      {t(
                        tr.type === "video"
                          ? "pilot.training.video"
                          : "pilot.training.workshop",
                      )}
                    </span>
                    <span>
                      {fmt.num(tr.durationMin)} {t("common.min")}
                    </span>
                    {required && (
                      <span className="badge badge-outline">
                        {t("pilot.training.required")}
                      </span>
                    )}
                  </span>
                  {done ? (
                    <span>
                      <span className="badge badge-mint">
                        <Icon name="check" />
                        {t("pilot.training.completed")}
                      </span>
                    </span>
                  ) : tr.type === "video" ? (
                    <span className="text-sm font-bold">
                      {t("pilot.training.watch")}
                    </span>
                  ) : (
                    <span className="text-xs muted">
                      {t("pilot.training.workshopHint")}
                    </span>
                  )}
                </span>
                {tappable && (
                  <Icon
                    name="chevronRight"
                    className="muted"
                  />
                )}
              </>
            );
            return tappable ? (
              <button
                key={tr.id}
                type="button"
                className="record-card reveal flex items-center gap-3.5"
                style={{ ["--i" as string]: i }}
                onClick={() => setPlaying(tr)}
              >
                {inner}
              </button>
            ) : (
              <div
                key={tr.id}
                className="record-card reveal flex items-center gap-3.5"
                style={{ ["--i" as string]: i }}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!playing}
        onClose={() => setPlaying(null)}
      >
        {playing && (
          <div className="flex flex-col gap-4">
            <div className="cover">
              <Scene name="garage" />
            </div>
            <div className="h2">{playing.title}</div>
            <div className="text-sm muted">
              {fmt.num(playing.durationMin)} {t("common.min")}
            </div>
            <div className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-center text-sm muted">
              {t("pilot.training.playing")}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => setPlaying(null)}
            >
              {t("common.close")}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
