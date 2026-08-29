"use client";

/* Training: the curriculum (videos + workshops, requiredFor chips) and the
   sign-off matrix — tapping a workshop cell toggles a captain sign-off. */

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, uid, find } from "@/lib/store";
import { toast } from "@/lib/ui";
import type { Pilot, Training } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/bits";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/chrome";
import {
  myPilots,
  PageHead,
  ModalHead,
  Field,
  CheckRow,
} from "../directory-ui";

export default function TrainingPage() {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [addType, setAddType] = useState<"video" | "workshop" | null>(null);

  const trs = db.trainings || [];
  const people = myPilots(db);

  const done = (p: Pilot, tr: Training) =>
    (p.trainingsDone || []).includes(tr.id);

  function toggleReq(trId: string, role: string) {
    update((d) => {
      const tr = find(d.trainings || [], trId);
      if (!tr) return;
      tr.requiredFor = tr.requiredFor || [];
      const i = tr.requiredFor.indexOf(role);
      if (i === -1) tr.requiredFor.push(role);
      else tr.requiredFor.splice(i, 1);
    });
    toast(t("admin.saved"));
  }

  function toggleSign(pid: string, trId: string) {
    let nowDone = false;
    update((d) => {
      const p = find(d.pilots, pid);
      if (!p) return;
      p.trainingsDone = p.trainingsDone || [];
      const i = p.trainingsDone.indexOf(trId);
      if (i === -1) {
        p.trainingsDone.push(trId);
        nowDone = true;
      } else p.trainingsDone.splice(i, 1);
    });
    toast(nowDone ? t("admin.tr.signedOff") : t("admin.saved"));
  }

  function progress(p: Pilot) {
    const need = trs.filter((tr) =>
      (tr.requiredFor || []).includes(
        p.role === "volunteer" ? "volunteer" : "pilot",
      ),
    );
    const set = need.length ? need : trs;
    const ok = set.filter((tr) => done(p, tr)).length;
    const pct = set.length ? Math.round((ok / set.length) * 100) : 100;
    return (
      <span className="flex min-w-24 items-center gap-2">
        <span className="bar-track w-16 flex-none">
          <span
            className="bar-fill block"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="muted text-xs tabular-nums">
          {ok}/{set.length}
        </span>
      </span>
    );
  }

  function cell(p: Pilot, tr: Training) {
    const isDone = done(p, tr);
    const mark = isDone ? (
      <Icon
        name="check"
        size={15}
        className="text-mint-deep"
      />
    ) : (
      <span className="muted">—</span>
    );
    if (tr.type !== "workshop") return mark;
    return (
      <button
        type="button"
        className="chip"
        aria-label={`${p.name} · ${tr.title}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleSign(p.id, tr.id);
        }}
      >
        {mark}
      </button>
    );
  }

  return (
    <>
      <PageHead
        title={t("common.training")}
        intro={t("admin.tr.intro")}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAddType("video")}
            >
              <Icon name="plus" />
              {t("admin.tr.addVideo")}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAddType("workshop")}
            >
              <Icon name="plus" />
              {t("admin.tr.addWorkshop")}
            </button>
          </div>
        }
      />

      <div>
        <h2 className="h2 mb-4">{t("admin.tr.curriculum")}</h2>
        {trs.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {trs.map((tr) => (
              <div
                key={tr.id}
                className="card"
              >
                <div className="flex items-center gap-3.5">
                  <span className="video-thumb h-14 w-24 flex-none rounded-xl">
                    {tr.type === "video" ? (
                      <span className="play-tri h-8 w-8">
                        <Icon
                          name="play"
                          size={14}
                        />
                      </span>
                    ) : (
                      <Icon
                        name="clipboard"
                        className="text-white"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge ${tr.type === "video" ? "badge-grey" : "badge-ink"}`}
                      >
                        {t(
                          tr.type === "video"
                            ? "admin.tr.video"
                            : "admin.tr.workshop",
                        )}
                      </span>
                      <span className="font-semibold">{tr.title}</span>
                    </div>
                    <div className="muted text-sm tabular-nums">
                      {tr.durationMin} {t("common.min")}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="muted text-sm">
                    {t("admin.tr.requiredFor")}
                  </span>
                  {(
                    [
                      ["pilot", "admin.tr.forPilot"],
                      ["volunteer", "admin.tr.forVolunteer"],
                    ] as const
                  ).map(([role, key]) => {
                    const on = (tr.requiredFor || []).includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        className={`chip${on ? " active" : ""}`}
                        onClick={() => toggleReq(tr.id, role)}
                      >
                        {on && (
                          <Icon
                            name="check"
                            size={13}
                          />
                        )}
                        {t(key)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon="clipboard"
              text={t("admin.tr.empty")}
            />
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h2">{t("admin.tr.matrix")}</h2>
          <span className="muted text-sm">{t("admin.tr.tapHint")}</span>
        </div>
        {trs.length && people.length ? (
          <>
            <div className="table-wrap table-desktop">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("admin.col.name")}</th>
                    {trs.map((tr) => (
                      <th key={tr.id}>{tr.title}</th>
                    ))}
                    <th>{t("admin.tr.progress")}</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="flex items-center gap-2">
                          <Avatar
                            name={p.name}
                            size="sm"
                          />
                          <span className="font-semibold">{p.name}</span>
                        </span>
                      </td>
                      {trs.map((tr) => (
                        <td key={tr.id}>{cell(p, tr)}</td>
                      ))}
                      <td>{progress(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cards-mobile">
              {people.map((p) => (
                <div
                  key={p.id}
                  className="record-card cursor-default"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Avatar
                        name={p.name}
                        size="sm"
                      />
                      <span className="font-semibold">{p.name}</span>
                    </span>
                    {progress(p)}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {trs.map((tr) => (
                      <div
                        key={tr.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="muted text-sm">{tr.title}</span>
                        {cell(p, tr)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card">
            <EmptyState
              icon="clipboard"
              text={t("admin.tr.empty")}
            />
          </div>
        )}
      </div>

      <AddTrainingModal
        type={addType}
        onClose={() => setAddType(null)}
      />
    </>
  );
}

function AddTrainingModal({
  type,
  onClose,
}: {
  type: "video" | "workshop" | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const update = useStore((s) => s.update);
  const isVideo = type === "video";
  const [title, setTitle] = useState("");
  const [dur, setDur] = useState<string>("");
  const [forPilot, setForPilot] = useState(true);
  const [forVol, setForVol] = useState(false);

  function add() {
    const ti = title.trim();
    if (!ti || !type) return;
    const d = parseInt(dur, 10);
    const req: string[] = [];
    if (forPilot) req.push("pilot");
    if (forVol) req.push("volunteer");
    onClose();
    update((db) => {
      db.trainings = db.trainings || [];
      db.trainings.push({
        id: uid(isVideo ? "v" : "w"),
        type: type,
        title: ti,
        durationMin: isNaN(d) ? (isVideo ? 10 : 120) : d,
        requiredFor: req,
      });
    });
    toast(t("admin.tr.added", { title: ti }));
    setTitle("");
    setDur("");
    setForPilot(true);
    setForVol(false);
  }

  return (
    <Modal
      open={!!type}
      onClose={onClose}
    >
      <ModalHead
        title={t(isVideo ? "admin.tr.addVideo" : "admin.tr.addWorkshop")}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4">
        <Field
          id="nt-title"
          label={t("admin.tr.titleLabel")}
        >
          <input
            id="nt-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field
          id="nt-dur"
          label={t("admin.tr.durationMin")}
        >
          <input
            id="nt-dur"
            className="input"
            type="number"
            min={1}
            placeholder={isVideo ? "10" : "120"}
            value={dur}
            onChange={(e) => setDur(e.target.value)}
          />
        </Field>
        {isVideo && (
          <div className="field">
            <span className="label">{t("admin.tr.video")}</span>
            <div className="alert alert-grey">
              <Icon name="download" />
              <div>
                <div className="font-semibold">{t("admin.tr.upload")}</div>
                <div className="hint">{t("admin.tr.uploadHint")}</div>
              </div>
            </div>
          </div>
        )}
        <div className="field">
          <span className="label">{t("admin.tr.requiredFor")}</span>
          <CheckRow
            id="nt-pilot"
            label={t("admin.tr.forPilot")}
            checked={forPilot}
            onChange={setForPilot}
          />
          <CheckRow
            id="nt-vol"
            label={t("admin.tr.forVolunteer")}
            checked={forVol}
            onChange={setForVol}
          />
        </div>
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
