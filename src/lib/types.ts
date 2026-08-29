/** Domain model — the vanilla mockup's store shapes, typed. Shaped the way a
 * Postgres schema would look so a real backend later is a drop-in replacement. */

export interface Chapter {
  id: string;
  name: string;
  country: string;
  leadTimeHours: number;
  autoSchedule: boolean;
  operatingDays: number[]; // 0 (Sun) – 6 (Sat)
  openHour: number;
  closeHour: number;
  phone?: string;
  slotWindows?: { morning: [number, number]; afternoon: [number, number] };
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  chapters: number;
  pilots: number;
  stats: { rides: number; hours: number };
}

export type PilotRole = "pilot" | "captain" | "volunteer";

export interface Pilot {
  id: string;
  name: string;
  phone: string;
  role: PilotRole;
  trained: boolean;
  rides: number;
  chapterId: string;
  langs: string[];
  availability: number[]; // weekday ints, 0–6
  trainingsDone: string[];
}

export interface Training {
  id: string;
  type: "video" | "workshop";
  title: string;
  durationMin: number;
  requiredFor: string[];
}

export interface Client {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  partnerId?: string; // set when the client resides at a partner facility
  mobilityNotes: string;
  waiverSigned: boolean;
  signedBy?: "proxy";
  proxy: { name: string; relation: string; phone: string } | null;
}

export interface Partner {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  address: string;
  residents: number;
}

export interface Garage {
  id: string;
  name: string;
  address: string;
  accessInstructions: string;
}

export interface Trishaw {
  id: string;
  number: string;
  model: string;
  garageId: string;
  battery: number;
  lockCode: string;
  status: "ok" | "service";
}

/** Editorial community quotes for home cards. tKey points at a registered
 * string so quotes read properly in EN/DE/DA; names stay data. */
export interface Story {
  id: string;
  tKey: string;
  author: string;
  role: "passenger" | "pilot" | "family";
  art: string;
}

export type RideType = "pleasure" | "functional" | "event";

/** requested = failed auto-validation, needs admin review (`flag` holds why) →
 * open (visible to pilots) → staffed → in_progress → done (+ cancelled). */
export type RideStatus =
  "requested" | "open" | "staffed" | "in_progress" | "done" | "cancelled";

export type RideSlot = "morning" | "afternoon" | "exact";

export interface RosterSlot {
  time: string; // "HH:mm"
  trishawId: string;
  name: string | null;
  order: number | null;
}

export interface Debrief {
  bikeOk: boolean;
  issue: string;
  batteryReturn: number;
  donation: number;
  feedback: string;
}

export interface Ride {
  id: string;
  chapterId: string;
  type: RideType;
  status: RideStatus;
  clientId?: string;
  partnerId?: string | null;
  source: "app" | "admin" | "whatsapp";
  ts: number; // start time, epoch ms
  slot: RideSlot;
  durationMin: number;
  riders: number;
  pickup: string;
  destination?: string;
  stops: string[];
  returnRide: boolean;
  trishawId: string | null;
  pilotId: string | null;
  notes: string;
  flag?: "outside_hours" | "lead_time";
  waiverPending?: boolean;
  debrief: Debrief | null;
  createdAt: number;
  checkin?: { walkUps?: number; waiverSigned?: boolean; ts: number } | null;
  // event-only fields
  public?: boolean;
  titleKey?: string;
  bodyKey?: string;
  /** Ad-hoc events created at runtime carry plain strings instead of keys. */
  title?: string;
  description?: string;
  art?: string;
  location?: string;
  trishaws?: string[];
  pilots?: Record<string, string | null>;
  roster?: RosterSlot[];
  closeWhenFull?: boolean;
}

export type ChatRole = "client" | "pilot" | "admin" | "system";

export interface ChatMessage {
  from: ChatRole;
  name: string;
  text: string;
  /** system messages carry a translation key instead of text */
  tKey?: string;
  ts: number;
}

export interface Chat {
  id: string; // 'chat-<rideId>'
  rideId: string;
  messages: ChatMessage[];
}

export interface AppNotification {
  id: number;
  audience: string; // 'admin' | 'pilot' | 'global' | 'client:<id>'
  tKey: string; // a notif.* pair — '.t'/'.b' suffixed keys exist in the dictionary
  params: Record<string, string>;
  hash: string; // route on the RECEIVING app, e.g. '/pilot/rides/r-xyz'
  ts: number;
}

export interface Database {
  meta: { version: number; seededAt: number; seq: number };
  chapters: Chapter[];
  countries: Country[];
  pilots: Pilot[];
  trainings: Training[];
  clients: Client[];
  partners: Partner[];
  garages: Garage[];
  trishaws: Trishaw[];
  stories: Story[];
  rides: Ride[];
  chats: Chat[];
  notifications: AppNotification[];
}
