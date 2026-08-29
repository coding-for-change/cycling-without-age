import type { Database, Pilot, Ride, RosterSlot } from "./types";
import { find } from "./store";
import { t } from "./i18n";

export function isActiveRide(r: Ride): boolean {
  return r.status !== "done" && r.status !== "cancelled";
}

/* ---- events: one shared vocabulary for all apps + admin ---- */

export function eventTitle(r: Ride, db?: Database): string {
  if (r.titleKey) return t(r.titleKey);
  if (r.title) return r.title;
  if (r.partnerId && db) {
    const p = find(db.partners, r.partnerId);
    if (p) return p.name;
  }
  return r.notes || t("type.event");
}

export function eventBody(r: Ride): string {
  return r.bodyKey ? t(r.bodyKey) : r.description || r.notes || "";
}

export function eventArt(r: Ride): string {
  return r.art || "park";
}

export function eventSeats(r: Ride): {
  total: number;
  taken: number;
  free: number;
} {
  const roster = r.roster || [];
  const taken = roster.filter((s) => !!s.name).length;
  return { total: roster.length, taken, free: roster.length - taken };
}

export function rosterNames(roster: RosterSlot[] | undefined): string[] {
  return (roster || []).filter((s) => !!s.name).map((s) => s.name as string);
}

/** Events a passenger can see: public ones, or those at their partner facility. */
export function eventsForClient(db: Database, clientId: string): Ride[] {
  const client = find(db.clients, clientId);
  return db.rides
    .filter(
      (r) =>
        r.type === "event" &&
        isActiveRide(r) &&
        r.ts > Date.now() &&
        (r.public || (!!client?.partnerId && r.partnerId === client.partnerId)),
    )
    .sort((a, b) => a.ts - b.ts);
}

/* ---- pilots & training ---- */

/** A pilot may only grab rides when every training required for pilots is done. */
export function pilotCleared(db: Database, pilot: Pilot): boolean {
  return db.trainings
    .filter((tr) => tr.requiredFor.includes("pilot"))
    .every((tr) => pilot.trainingsDone.includes(tr.id));
}

export function trainingProgress(db: Database, pilot: Pilot) {
  const required = db.trainings.filter((tr) =>
    tr.requiredFor.includes("pilot"),
  );
  const done = required.filter((tr) =>
    pilot.trainingsDone.includes(tr.id),
  ).length;
  return {
    done,
    total: required.length,
    pct: required.length ? Math.round((done / required.length) * 100) : 100,
    cleared: done === required.length,
  };
}

/* ---- rides per viewer ---- */

export function ridesForPilot(db: Database, pilotId: string): Ride[] {
  return db.rides.filter(
    (r) =>
      r.pilotId === pilotId ||
      (r.type === "event" &&
        !!r.pilots &&
        Object.values(r.pilots).includes(pilotId)),
  );
}

/** Open rides a pilot could grab (1:1 rides without a pilot, event trishaws without one). */
export function openRides(db: Database, chapterId: string): Ride[] {
  return db.rides
    .filter((r) => r.chapterId === chapterId && r.status === "open")
    .filter((r) =>
      r.type === "event"
        ? Object.values(r.pilots || {}).some((p) => !p)
        : !r.pilotId,
    )
    .sort((a, b) => a.ts - b.ts);
}

export function ridesForClient(db: Database, clientId: string): Ride[] {
  return db.rides.filter((r) => r.clientId === clientId);
}

export function chatForRide(db: Database, rideId: string) {
  return db.chats.find((c) => c.rideId === rideId);
}
