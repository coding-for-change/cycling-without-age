"use client";

/* Mock per-persona sessions — the TS port of CWA.auth's session half.
   The golden-path demo needs zero login: boot() seeds the demo persona unless
   the user explicitly logged out. The launcher's "start at the sign-in screen"
   uses replay() to wipe the session + onboarding flag. */

export type Persona = "passenger" | "pilot";

export interface Session {
  userId: string;
  name: string;
  loggedIn: true;
}

const key = (p: Persona) => `cwa.auth.${p}`;
const outKey = (p: Persona) => `cwa.auth.${p}.loggedOut`;
const onbKey = (p: Persona) => `cwa.onb.${p}`;

export const auth = {
  read(persona: Persona): Session | null {
    try {
      return JSON.parse(localStorage.getItem(key(persona)) || "null");
    } catch {
      return null;
    }
  },
  save(persona: Persona, s: Session): Session {
    localStorage.setItem(key(persona), JSON.stringify(s));
    localStorage.removeItem(outKey(persona));
    return s;
  },
  /** Auto-login as the demo persona unless the user logged out. */
  boot(persona: Persona, demo: Session): Session | null {
    const s = this.read(persona);
    if (s && s.loggedIn) return s;
    if (localStorage.getItem(outKey(persona)) === "1") return null;
    return this.save(persona, demo);
  },
  logout(persona: Persona) {
    localStorage.removeItem(key(persona));
    localStorage.setItem(outKey(persona), "1");
  },
  /** Used by the launcher to replay the flow from the very first screen. */
  replay(persona: Persona) {
    localStorage.removeItem(key(persona));
    localStorage.removeItem(onbKey(persona));
    localStorage.setItem(outKey(persona), "1");
  },
  onboarded(persona: Persona): boolean {
    return localStorage.getItem(onbKey(persona)) === "1";
  },
  markOnboarded(persona: Persona) {
    localStorage.setItem(onbKey(persona), "1");
  },
};

export const DEMO_SESSIONS: Record<Persona, Session> = {
  passenger: { userId: "c1", name: "Maria Huber", loggedIn: true },
  pilot: { userId: "p1", name: "Jonas Weber", loggedIn: true },
};
