import type { Database, Ride } from "./types";

export const DB_VERSION = 1;

/** Local date at +dayOffset days, hh:mm — seed dates stay relative to "now"
 * so the demo always has live rides and alerts. */
function at(dayOffset: number, h: number, m = 0): number {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.getTime();
}

/** "in about N hours" — but never outside the chapter's opening hours, so the
 * demo never seeds a ride at 00:37. Falls back to the next morning slot. */
function soon(hoursAhead: number): number {
  const d = new Date(Date.now() + hoursAhead * 36e5);
  if (d.getHours() >= 9 && d.getHours() < 17) return d.getTime();
  return at(new Date().getHours() >= 9 ? 1 : 0, 10, 0);
}

export function seedDatabase(): Database {
  const now = Date.now();
  const s: Database = {
    meta: { version: DB_VERSION, seededAt: now, seq: 100 },

    chapters: [
      {
        id: "muc",
        name: "München",
        country: "de",
        leadTimeHours: 48,
        autoSchedule: true,
        operatingDays: [1, 2, 3, 4, 5, 6],
        openHour: 9,
        closeHour: 18,
        phone: "+49 89 1234 5678",
        slotWindows: { morning: [9, 12], afternoon: [13, 17] },
      },
      {
        id: "cph",
        name: "København Ø",
        country: "dk",
        leadTimeHours: 24,
        autoSchedule: true,
        operatingDays: [1, 2, 3, 4, 5, 6, 0],
        openHour: 8,
        closeHour: 19,
        phone: "+45 26 86 39 34",
      },
    ],

    countries: [
      {
        id: "de",
        name: "Germany",
        flag: "🇩🇪",
        chapters: 74,
        pilots: 2140,
        stats: { rides: 18240, hours: 15900 },
      },
      {
        id: "dk",
        name: "Denmark",
        flag: "🇩🇰",
        chapters: 118,
        pilots: 4820,
        stats: { rides: 41200, hours: 36100 },
      },
      {
        id: "us",
        name: "United States",
        flag: "🇺🇸",
        chapters: 96,
        pilots: 3350,
        stats: { rides: 22750, hours: 19800 },
      },
      {
        id: "uk",
        name: "United Kingdom",
        flag: "🇬🇧",
        chapters: 52,
        pilots: 1610,
        stats: { rides: 9800, hours: 8400 },
      },
      {
        id: "au",
        name: "Australia",
        flag: "🇦🇺",
        chapters: 34,
        pilots: 980,
        stats: { rides: 6100, hours: 5300 },
      },
    ],

    pilots: [
      {
        id: "p1",
        name: "Jonas Weber",
        phone: "+49 170 555 0134",
        role: "pilot",
        trained: true,
        rides: 34,
        chapterId: "muc",
        langs: ["de", "en"],
        availability: [2, 4, 6],
        trainingsDone: ["v1", "v2", "w1"],
      },
      {
        id: "p2",
        name: "Petra Klein",
        phone: "+49 170 555 077",
        role: "captain",
        trained: true,
        rides: 121,
        chapterId: "muc",
        langs: ["de"],
        availability: [1, 2, 3, 4, 5],
        trainingsDone: ["v1", "v2", "w1"],
      },
      {
        id: "p3",
        name: "Ali Yilmaz",
        phone: "+49 160 555 0912",
        role: "volunteer",
        trained: false,
        rides: 0,
        chapterId: "muc",
        langs: ["de", "en"],
        availability: [6, 0],
        trainingsDone: ["v1"],
      },
      {
        id: "p4",
        name: "Sofia Brandl",
        phone: "+49 151 555 0428",
        role: "pilot",
        trained: true,
        rides: 58,
        chapterId: "muc",
        langs: ["de", "en"],
        availability: [1, 3, 5],
        trainingsDone: ["v1", "v2", "w1"],
      },
    ],

    /* onboarding curriculum, managed by chapter admins.
       'video' plays in the pilot app (mock player); 'workshop' is signed off by a captain. */
    trainings: [
      {
        id: "v1",
        type: "video",
        title: "Safe trishaw handling",
        durationMin: 12,
        requiredFor: ["pilot"],
      },
      {
        id: "v2",
        type: "video",
        title: "Passenger care & dementia basics",
        durationMin: 9,
        requiredFor: ["pilot"],
      },
      {
        id: "w1",
        type: "workshop",
        title: "Practical riding workshop",
        durationMin: 120,
        requiredFor: ["pilot"],
      },
    ],

    clients: [
      {
        id: "c1",
        name: "Maria Huber",
        age: 85,
        phone: "+49 89 555 2211",
        address: "Agnes-Bernauer-Str. 12",
        mobilityNotes: "Uses a walking frame. Needs a little time to board.",
        waiverSigned: true,
        proxy: null,
      },
      {
        id: "c2",
        name: "Karl Brandt",
        age: 79,
        phone: "+49 89 555 8890",
        address: "Fürstenrieder Str. 45",
        mobilityNotes: "Hard of hearing on the left side.",
        waiverSigned: true,
        signedBy: "proxy",
        proxy: {
          name: "Sabine Brandt",
          relation: "daughter",
          phone: "+49 172 555 3321",
        },
      },
      {
        id: "c3",
        name: "Hilde Maier",
        age: 88,
        phone: "+49 89 555 1043",
        address: "Seniorenheim Rosenau",
        partnerId: "n1",
        mobilityNotes: "Loves the Nymphenburg park route.",
        waiverSigned: true,
        proxy: null,
      },
      {
        id: "c4",
        name: "Erna Vogel",
        age: 82,
        phone: "+49 89 555 6674",
        address: "Hirschgartenallee 8",
        mobilityNotes: "",
        waiverSigned: false,
        proxy: null,
      },
    ],

    partners: [
      {
        id: "n1",
        name: "Seniorenheim Rosenau",
        contactName: "Frau Schneider",
        phone: "+49 89 555 7000",
        address: "Rosenauer Weg 3, 80689 München",
        residents: 12,
      },
    ],

    garages: [
      {
        id: "g1",
        name: "Garage Westpark",
        address: "Westendstr. 305",
        accessInstructions:
          "Key box left of the gate, code 4711. Please lock up after leaving.",
      },
      {
        id: "g2",
        name: "Rosenau shed",
        address: "At Seniorenheim Rosenau, backyard",
        accessInstructions: "Gate code 2233, shed key at the reception desk.",
      },
    ],

    trishaws: [
      {
        id: "t1",
        number: "MUC-01",
        model: "Triobike Taxi",
        garageId: "g1",
        battery: 85,
        lockCode: "2580",
        status: "ok",
      },
      {
        id: "t2",
        number: "MUC-02",
        model: "Van Raam Chat",
        garageId: "g2",
        battery: 62,
        lockCode: "1199",
        status: "ok",
      },
    ],

    stories: [
      {
        id: "st1",
        tKey: "story.hilde",
        author: "Hilde Maier",
        role: "passenger",
        art: "park",
      },
      {
        id: "st2",
        tKey: "story.jonas",
        author: "Jonas Weber",
        role: "pilot",
        art: "rose",
      },
      {
        id: "st3",
        tKey: "story.sabine",
        author: "Sabine Brandt",
        role: "family",
        art: "cafe",
      },
    ],

    rides: [],
    chats: [],
    notifications: [],
  };

  /* --- live rides --- */
  // Needs a pilot in ~3.5 h → alert in admin, pinned in pilot feed
  s.rides.push({
    id: "r-alert",
    chapterId: "muc",
    type: "pleasure",
    status: "open",
    clientId: "c3",
    partnerId: "n1",
    source: "admin",
    ts: soon(3.5),
    slot: "exact",
    durationMin: 45,
    riders: 1,
    pickup: "Seniorenheim Rosenau",
    stops: [],
    returnRide: false,
    trishawId: "t2",
    pilotId: null,
    notes: "Hilde would love the park route.",
    debrief: null,
    createdAt: now - 2 * 864e5,
  });
  // Staffed errand ride tomorrow → pilot's "next ride" with full logistics + chat
  s.rides.push({
    id: "r-func",
    chapterId: "muc",
    type: "functional",
    status: "staffed",
    clientId: "c2",
    source: "app",
    ts: at(1, 9, 30),
    slot: "exact",
    durationMin: 90,
    riders: 1,
    pickup: "Fürstenrieder Str. 45",
    destination: "Praxis Dr. Steiner, Laimer Platz 2",
    stops: ["Apotheke am Laimer Platz"],
    returnRide: true,
    trishawId: "t1",
    pilotId: "p1",
    notes: "Doctor appointment at 10:15. Booked by daughter Sabine.",
    debrief: null,
    createdAt: now - 3 * 864e5,
  });
  // Staffed pleasure ride for Maria in 2 days → lets Maria test the chat as a passenger
  s.rides.push({
    id: "r-maria",
    chapterId: "muc",
    type: "pleasure",
    status: "staffed",
    clientId: "c1",
    source: "app",
    ts: at(2, 14, 0),
    slot: "exact",
    durationMin: 60,
    riders: 1,
    pickup: "Agnes-Bernauer-Str. 12",
    stops: [],
    returnRide: false,
    trishawId: "t2",
    pilotId: "p1",
    notes: "Maria enjoys the river route along the Isar.",
    debrief: null,
    createdAt: now - 864e5,
  });
  // Group event at the nursing home in 3 days, 5 of 8 slots filled, second trishaw needs a pilot
  s.rides.push({
    id: "r-event",
    chapterId: "muc",
    type: "event",
    status: "open",
    partnerId: "n1",
    source: "admin",
    titleKey: "evt.rosenau.t",
    bodyKey: "evt.rosenau.b",
    art: "care",
    location: "Rosenauer Weg 3, 80689 München",
    ts: at(3, 10, 0),
    slot: "exact",
    durationMin: 120,
    riders: 5,
    pickup: "Seniorenheim Rosenau",
    stops: [],
    returnRide: false,
    trishaws: ["t1", "t2"],
    pilots: { t1: "p4", t2: null },
    trishawId: null,
    pilotId: null,
    roster: [
      { time: "10:00", trishawId: "t1", name: "Hilde Maier", order: 1 },
      { time: "10:00", trishawId: "t2", name: "Georg Lang", order: 2 },
      { time: "10:30", trishawId: "t1", name: "Anni Roth", order: 3 },
      { time: "10:30", trishawId: "t2", name: null, order: null },
      { time: "11:00", trishawId: "t1", name: "Rosa Eder", order: 4 },
      { time: "11:00", trishawId: "t2", name: null, order: null },
      { time: "11:30", trishawId: "t1", name: "Franz Obermeier", order: 5 },
      { time: "11:30", trishawId: "t2", name: null, order: null },
    ],
    closeWhenFull: true,
    notes: "Monthly Rosenau morning. Coffee together afterwards.",
    debrief: null,
    createdAt: now - 6 * 864e5,
  });
  // Public chapter event in 10 days — passengers can reserve a seat from their app
  s.rides.push({
    id: "r-fest",
    chapterId: "muc",
    type: "event",
    status: "open",
    public: true,
    partnerId: null,
    source: "admin",
    titleKey: "evt.fest.t",
    bodyKey: "evt.fest.b",
    art: "festival",
    location: "Westpark Rosengarten, 81373 München",
    ts: at(10, 14, 0),
    slot: "exact",
    durationMin: 180,
    riders: 2,
    pickup: "Westpark Rosengarten",
    stops: [],
    returnRide: false,
    trishaws: ["t1", "t2"],
    pilots: { t1: "p1", t2: "p4" },
    trishawId: null,
    pilotId: null,
    roster: [
      { time: "14:00", trishawId: "t1", name: "Georg Lang", order: 1 },
      { time: "14:00", trishawId: "t2", name: null, order: null },
      { time: "14:45", trishawId: "t1", name: null, order: null },
      { time: "14:45", trishawId: "t2", name: "Liesl Huber", order: 2 },
      { time: "15:30", trishawId: "t1", name: null, order: null },
      { time: "15:30", trishawId: "t2", name: null, order: null },
    ],
    closeWhenFull: true,
    notes: "Summer festival ride day — coffee, cake and roses.",
    debrief: null,
    createdAt: now - 864e5,
  });
  // Fully staffed public event — passengers can still reserve, pilots see it under "my rides"
  s.rides.push({
    id: "r-rose",
    chapterId: "muc",
    type: "event",
    status: "open",
    public: true,
    partnerId: null,
    source: "admin",
    titleKey: "evt.rose.t",
    bodyKey: "evt.rose.b",
    art: "rose",
    location: "Westpark Rosengarten, 81373 München",
    ts: at(5, 15, 0),
    slot: "exact",
    durationMin: 120,
    riders: 2,
    pickup: "Westpark Rosengarten",
    stops: [],
    returnRide: false,
    trishaws: ["t1", "t2"],
    pilots: { t1: "p4", t2: "p2" },
    trishawId: null,
    pilotId: null,
    roster: [
      { time: "15:00", trishawId: "t1", name: "Anni Roth", order: 1 },
      { time: "15:00", trishawId: "t2", name: null, order: null },
      { time: "15:40", trishawId: "t1", name: null, order: null },
      { time: "15:40", trishawId: "t2", name: "Rosa Eder", order: 2 },
      { time: "16:20", trishawId: "t1", name: null, order: null },
      { time: "16:20", trishawId: "t2", name: null, order: null },
    ],
    closeWhenFull: true,
    notes: "",
    debrief: null,
    createdAt: now - 4 * 864e5,
  });
  // Public café ride still looking for a second pilot → grabbable in the pilot feed
  s.rides.push({
    id: "r-cafe",
    chapterId: "muc",
    type: "event",
    status: "open",
    public: true,
    partnerId: null,
    source: "admin",
    titleKey: "evt.cafe.t",
    bodyKey: "evt.cafe.b",
    art: "cafe",
    location: "Hirschgartenallee 8, 80639 München",
    ts: at(17, 14, 30),
    slot: "exact",
    durationMin: 150,
    riders: 1,
    pickup: "Hirschgartenallee 8",
    stops: [],
    returnRide: false,
    trishaws: ["t1", "t2"],
    pilots: { t1: "p4", t2: null },
    trishawId: null,
    pilotId: null,
    roster: [
      { time: "14:30", trishawId: "t1", name: "Georg Lang", order: 1 },
      { time: "14:30", trishawId: "t2", name: null, order: null },
      { time: "15:15", trishawId: "t1", name: null, order: null },
      { time: "15:15", trishawId: "t2", name: null, order: null },
      { time: "16:00", trishawId: "t1", name: null, order: null },
      { time: "16:00", trishawId: "t2", name: null, order: null },
    ],
    closeWhenFull: true,
    notes: "",
    debrief: null,
    createdAt: now - 2 * 864e5,
  });
  // Request that failed auto-validation → admin scheduling drawer demo
  s.rides.push({
    id: "r-req",
    chapterId: "muc",
    type: "pleasure",
    status: "requested",
    clientId: "c4",
    source: "app",
    ts: at(0, 19, 30),
    slot: "exact",
    durationMin: 60,
    riders: 2,
    pickup: "Hirschgartenallee 8",
    stops: [],
    returnRide: false,
    trishawId: null,
    pilotId: null,
    notes: "Together with my neighbour, if possible.",
    flag: "outside_hours",
    waiverPending: true,
    debrief: null,
    createdAt: now - 2 * 36e5,
  });
  // Past completed rides → stats, history, debrief examples
  const pastNames = ["c1", "c3", "c2", "c1", "c3", "c4", "c2", "c1"];
  for (let i = 0; i < 8; i++) {
    s.rides.push({
      id: `r-past${i}`,
      chapterId: "muc",
      type: i % 3 === 0 ? "functional" : "pleasure",
      status: "done",
      clientId: pastNames[i],
      source: i % 4 === 0 ? "whatsapp" : "app",
      ts: at(-(3 + i * 5), 10 + (i % 5), 0),
      slot: "exact",
      durationMin: 60,
      riders: 1 + (i % 2),
      pickup: "München",
      stops: [],
      returnRide: i % 3 === 0,
      trishawId: i % 2 ? "t2" : "t1",
      pilotId: i % 2 ? "p4" : "p1",
      notes: "",
      createdAt: at(-(6 + i * 5), 9, 0),
      debrief: {
        bikeOk: i !== 4,
        issue: i === 4 ? "Front brake feels soft" : "",
        batteryReturn: 40 + i * 5,
        donation: [0, 10, 5, 0, 20, 0, 15, 0][i],
        feedback: "Lovely ride, lots of smiles.",
      },
    } as Ride);
  }

  /* --- chat for the staffed rides --- */
  s.chats.push({
    id: "chat-r-func",
    rideId: "r-func",
    messages: [
      {
        from: "system",
        name: "",
        text: "",
        tKey: "chat.sysCreated",
        ts: now - 3 * 864e5,
      },
      {
        from: "pilot",
        name: "Jonas Weber",
        text: "Hello Mr Brandt! I am Jonas, your pilot for Friday. I will ring the doorbell at 9:30.",
        ts: now - 26 * 36e5,
      },
      {
        from: "client",
        name: "Sabine Brandt",
        text: "Thank you Jonas! My father is really looking forward to it. He will bring a blanket.",
        ts: now - 24 * 36e5,
      },
    ],
  });
  s.chats.push({
    id: "chat-r-maria",
    rideId: "r-maria",
    messages: [
      {
        from: "system",
        name: "",
        text: "",
        tKey: "chat.sysCreated",
        ts: now - 864e5,
      },
      {
        from: "pilot",
        name: "Jonas Weber",
        text: "Hello Maria! I am Jonas, your pilot for Sunday. Looking forward to our Isar ride — I will be at your door at 14:00.",
        ts: now - 10 * 36e5,
      },
      {
        from: "client",
        name: "Maria Huber",
        text: "Wonderful, Jonas! I will be ready. Can we stop at the bench near the bridge?",
        ts: now - 8 * 36e5,
      },
      {
        from: "pilot",
        name: "Jonas Weber",
        text: "Of course — that is one of my favourite spots too. See you then!",
        ts: now - 7 * 36e5,
      },
    ],
  });

  return s;
}
