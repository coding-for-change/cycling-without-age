"use client";

/* Pilot-app ride helpers — ported from pilot.js. Pure functions over the db. */

import type { Database, Ride } from "@/lib/types";
import { find } from "@/lib/store";
import { t, fmt } from "@/lib/i18n";
import { eventTitle } from "@/lib/selectors";

export const DEMO_PHONE = "+49 170 555 0134";
export const DEMO_CODE = "6 1 8 3 2 5";

export function firstName(n: string): string {
  return String(n || "").split(" ")[0];
}

export function isMine(r: Ride, pilotId: string): boolean {
  if (r.pilotId === pilotId) return true;
  if (r.pilots)
    for (const k of Object.keys(r.pilots))
      if (r.pilots[k] === pilotId) return true;
  return false;
}

export function needsPilot(r: Ride): boolean {
  if (r.pilots) {
    for (const k of Object.keys(r.pilots)) if (!r.pilots[k]) return true;
    return false;
  }
  return !r.pilotId;
}

export function freeTrishaw(r: Ride): string | null {
  if (r.pilots)
    for (const k of Object.keys(r.pilots)) if (!r.pilots[k]) return k;
  return null;
}

export function clientOf(r: Ride, d: Database) {
  return r.clientId ? find(d.clients, r.clientId) : undefined;
}

export function partnerOf(r: Ride, d: Database) {
  return r.partnerId ? find(d.partners, r.partnerId) : undefined;
}

export function rideName(r: Ride, d: Database): string {
  if (r.type === "event") return eventTitle(r, d);
  const c = clientOf(r, d);
  if (c) return c.name;
  const p = partnerOf(r, d);
  return p ? p.name : "";
}

export function ridersText(n: number): string {
  return `${fmt.num(n)} ${t(n === 1 ? "common.passenger" : "common.passengers")}`;
}

export const byTs = (a: Ride, b: Ride) => a.ts - b.ts;

export function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function openRides(d: Database, pilotId: string): Ride[] {
  return d.rides
    .filter(
      (r) =>
        r.chapterId === "muc" &&
        r.status === "open" &&
        r.ts > Date.now() - 30 * 6e4 &&
        needsPilot(r) &&
        !isMine(r, pilotId),
    )
    .sort(byTs);
}

export function myUpcoming(d: Database, pilotId: string): Ride[] {
  return d.rides
    .filter(
      (r) =>
        (r.status === "staffed" ||
          r.status === "in_progress" ||
          (r.status === "open" && r.type === "event")) &&
        isMine(r, pilotId),
    )
    .sort(byTs);
}

/* ---- training gating ---- */
export function requiredTrainings(d: Database) {
  return d.trainings.filter((tr) => (tr.requiredFor || []).includes("pilot"));
}

export function trainingDone(
  p: { trainingsDone?: string[] } | undefined,
  id: string,
): boolean {
  return !!p && (p.trainingsDone || []).includes(id);
}

export function cleared(d: Database, pilotId: string): boolean {
  const p = find(d.pilots, pilotId);
  if (!p) return false;
  return requiredTrainings(d).every((tr) => trainingDone(p, tr.id));
}

export function trainingProgress(d: Database, pilotId: string) {
  const p = find(d.pilots, pilotId);
  const req = requiredTrainings(d);
  const done = req.filter((tr) => trainingDone(p, tr.id)).length;
  return {
    done,
    total: req.length,
    pct: req.length ? Math.round((done / req.length) * 100) : 100,
  };
}

/* ---- week helpers ---- */
export function weekDays(off: number): number[] {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const monday = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - ((d.getDay() + 6) % 7) + off * 7,
  );
  const out: number[] = [];
  for (let i = 0; i < 7; i++)
    out.push(
      new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      ).getTime(),
    );
  return out;
}

/* ---- pilot stats (home + profile share these) ---- */
export function pilotStats(d: Database, pilotId: string) {
  const p = find(d.pilots, pilotId);
  const doneMine = d.rides.filter(
    (r) => r.status === "done" && r.pilotId === pilotId,
  );
  const base = p ? p.rides : 0;
  const rides = base + doneMine.length;
  /* rides logged in this demo carry a real duration; the pilot's historic count
     is valued at the chapter's average ride (75 min) */
  const hours = Math.round(
    (doneMine.reduce((s, r) => s + (r.durationMin || 60), 0) + base * 75) / 60,
  );
  const donations = doneMine.reduce(
    (s, r) => s + (r.debrief?.donation || 0),
    0,
  );
  return { rides, hours, donations };
}
