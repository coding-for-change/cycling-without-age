import { prisma } from "@/lib/prisma";
import { instantAt, wallClock } from "@/lib/calendar";
import { fleet } from "@/features/fleet";
import { chapters } from "@/features/chapters";
import { defaultLocationFor } from "@/use-cases/manage-chapter";
import type {
  Gender,
  Prisma,
  RideCancellationReason,
  RideModel,
} from "@/generated/prisma";

if (process.env.NODE_ENV === "production" && !process.env.FEATURE_BRANCH) {
  throw new Error("Refusing to seed: NODE_ENV=production");
}

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const databaseHost = () => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
};
if (
  !LOCAL_HOSTS.includes(databaseHost()) &&
  process.env.ALLOW_DEMO_SEED !== "1"
) {
  throw new Error(
    "Refusing to seed: DATABASE_URL is not local (set ALLOW_DEMO_SEED=1 to override)",
  );
}

const DEMO = "demo-";
const FUTURE_DAYS = 14;
const DAY_MS = 86_400_000;
const TRIPS_PER_CHAPTER_DAY = 1.08;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261004);
const int = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(rand() * items.length)];
function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function poisson(mean: number) {
  const limit = Math.exp(-mean);
  let k = 0;
  let p = rand();
  while (p > limit) {
    k += 1;
    p *= rand();
  }
  return k;
}

type CountrySpec = { code: string; name: string };
type ChapterSpec = {
  slug: string;
  name: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  size: number;
  startMonthsAgo: number;
  seasonal: boolean;
  pilots: number;
  riders: number;
  existing?: boolean;
};

const COUNTRIES: CountrySpec[] = [
  { code: "DE", name: "Deutschland" },
  { code: "DK", name: "Danmark" },
  { code: "NL", name: "Nederland" },
  { code: "US", name: "United States" },
  { code: "SG", name: "Singapore" },
];

const CHAPTERS: ChapterSpec[] = [
  {
    slug: "muenchen",
    name: "",
    country: "DE",
    city: "München",
    latitude: 48.1361,
    longitude: 11.5647,
    timeZone: "Europe/Berlin",
    size: 1.2,
    startMonthsAgo: 18,
    seasonal: true,
    pilots: 12,
    riders: 34,
    existing: true,
  },
  {
    slug: "hamburg",
    name: "",
    country: "DE",
    city: "Hamburg",
    latitude: 53.5603,
    longitude: 9.9906,
    timeZone: "Europe/Berlin",
    size: 1.0,
    startMonthsAgo: 18,
    seasonal: true,
    pilots: 10,
    riders: 28,
    existing: true,
  },
  {
    slug: "copenhagen",
    name: "",
    country: "DK",
    city: "København",
    latitude: 55.6884,
    longitude: 12.5527,
    timeZone: "Europe/Copenhagen",
    size: 1.3,
    startMonthsAgo: 18,
    seasonal: true,
    pilots: 14,
    riders: 38,
    existing: true,
  },
  {
    slug: "berlin-demo",
    name: "Berlin – Kreuzberg (Demo)",
    country: "DE",
    city: "Berlin",
    latitude: 52.4986,
    longitude: 13.4033,
    timeZone: "Europe/Berlin",
    size: 1.1,
    startMonthsAgo: 16,
    seasonal: true,
    pilots: 11,
    riders: 30,
  },
  {
    slug: "aarhus-demo",
    name: "Aarhus – Frederiksbjerg (Demo)",
    country: "DK",
    city: "Aarhus",
    latitude: 56.1496,
    longitude: 10.2045,
    timeZone: "Europe/Copenhagen",
    size: 0.6,
    startMonthsAgo: 18,
    seasonal: true,
    pilots: 7,
    riders: 18,
  },
  {
    slug: "amsterdam-demo",
    name: "Amsterdam – De Pijp (Demo)",
    country: "NL",
    city: "Amsterdam",
    latitude: 52.3533,
    longitude: 4.8936,
    timeZone: "Europe/Amsterdam",
    size: 1.0,
    startMonthsAgo: 14,
    seasonal: true,
    pilots: 10,
    riders: 26,
  },
  {
    slug: "utrecht-demo",
    name: "Utrecht – Lombok (Demo)",
    country: "NL",
    city: "Utrecht",
    latitude: 52.0907,
    longitude: 5.1214,
    timeZone: "Europe/Amsterdam",
    size: 0.5,
    startMonthsAgo: 10,
    seasonal: true,
    pilots: 6,
    riders: 14,
  },
  {
    slug: "portland-demo",
    name: "Portland – Sellwood (Demo)",
    country: "US",
    city: "Portland",
    latitude: 45.4655,
    longitude: -122.6531,
    timeZone: "America/Los_Angeles",
    size: 0.8,
    startMonthsAgo: 18,
    seasonal: true,
    pilots: 9,
    riders: 22,
  },
  {
    slug: "boston-demo",
    name: "Boston – Jamaica Plain (Demo)",
    country: "US",
    city: "Boston",
    latitude: 42.3097,
    longitude: -71.1151,
    timeZone: "America/New_York",
    size: 0.7,
    startMonthsAgo: 12,
    seasonal: true,
    pilots: 8,
    riders: 20,
  },
  {
    slug: "singapore-demo",
    name: "Singapore – Toa Payoh (Demo)",
    country: "SG",
    city: "Singapore",
    latitude: 1.3343,
    longitude: 103.8563,
    timeZone: "Asia/Singapore",
    size: 0.9,
    startMonthsAgo: 9,
    seasonal: false,
    pilots: 9,
    riders: 24,
  },
  {
    slug: "rotterdam-demo",
    name: "Rotterdam – Kralingen (Demo)",
    country: "NL",
    city: "Rotterdam",
    latitude: 51.9244,
    longitude: 4.4777,
    timeZone: "Europe/Amsterdam",
    size: 0,
    startMonthsAgo: 0,
    seasonal: true,
    pilots: 3,
    riders: 4,
  },
];

const FIRST_NAMES: Record<string, string[]> = {
  DE: [
    "Anna",
    "Lukas",
    "Greta",
    "Jonas",
    "Hilde",
    "Felix",
    "Ursula",
    "Moritz",
    "Erika",
    "Paul",
    "Ingrid",
    "Max",
    "Lotte",
    "Karl",
  ],
  DK: [
    "Freja",
    "Mads",
    "Karen",
    "Søren",
    "Inge",
    "Rasmus",
    "Birthe",
    "Anders",
    "Ida",
    "Niels",
    "Grethe",
    "Emil",
  ],
  NL: [
    "Sanne",
    "Daan",
    "Wilma",
    "Joost",
    "Annelies",
    "Pieter",
    "Femke",
    "Bram",
    "Riet",
    "Thijs",
    "Mieke",
    "Sem",
  ],
  US: [
    "Emily",
    "James",
    "Dorothy",
    "Michael",
    "Betty",
    "Daniel",
    "Margaret",
    "Ethan",
    "Ruth",
    "Noah",
    "Helen",
    "Grace",
  ],
  SG: [
    "Wei Ling",
    "Jun Jie",
    "Mei Hua",
    "Arjun",
    "Siti",
    "Kai Wen",
    "Priya",
    "Hui Min",
    "Ahmad",
    "Li Na",
    "Rajesh",
    "Xin Yi",
  ],
};
const LAST_NAMES: Record<string, string[]> = {
  DE: [
    "Müller",
    "Schmidt",
    "Weber",
    "Fischer",
    "Wagner",
    "Becker",
    "Hoffmann",
    "Schäfer",
    "Koch",
    "Richter",
  ],
  DK: [
    "Nielsen",
    "Jensen",
    "Hansen",
    "Pedersen",
    "Andersen",
    "Christensen",
    "Larsen",
    "Sørensen",
    "Rasmussen",
  ],
  NL: [
    "de Jong",
    "Jansen",
    "de Vries",
    "van den Berg",
    "Bakker",
    "Visser",
    "Smit",
    "Meijer",
    "de Boer",
  ],
  US: [
    "Johnson",
    "Miller",
    "Davis",
    "Garcia",
    "Wilson",
    "Anderson",
    "Taylor",
    "Thomas",
    "Moore",
    "Clark",
  ],
  SG: [
    "Tan",
    "Lim",
    "Lee",
    "Ng",
    "Wong",
    "Goh",
    "Chua",
    "Nair",
    "Rahman",
    "Pillai",
  ],
};

const PLACES: Record<string, { start: string[]; destinations: string[] }> = {
  DE: {
    start: ["Seniorenheim", "Pflegeheim am Park", "Haus Lindenhof"],
    destinations: ["Hausarzt", "Friedhof", "Wochenmarkt", "Apotheke"],
  },
  DK: {
    start: ["Plejehjemmet", "Ældrecentret", "Bostedet ved Søen"],
    destinations: ["Lægen", "Kirkegården", "Torvehallerne", "Frisøren"],
  },
  NL: {
    start: ["Zorgcentrum", "Verpleeghuis De Linde", "Woonzorg Parkzicht"],
    destinations: ["Huisarts", "Markt", "Begraafplaats", "Kapper"],
  },
  US: {
    start: ["Senior Living", "Care Home Main Entrance", "Assisted Living"],
    destinations: ["Clinic", "Farmers Market", "Library", "Church"],
  },
  SG: {
    start: ["Nursing Home", "Senior Activity Centre", "Eldercare Centre"],
    destinations: ["Polyclinic", "Hawker Centre", "Wet Market", "Temple"],
  },
};

const CANCELLATIONS: readonly (readonly [
  RideCancellationReason | null,
  number,
  string[],
])[] = [
  [
    "weather",
    35,
    [
      "Heavy rain forecast",
      "Storm warning",
      "Too hot for the passengers",
      "Icy roads",
    ],
  ],
  [
    "rider",
    25,
    [
      "Passenger not feeling well",
      "Passenger had a doctor's appointment",
      "Family visit",
    ],
  ],
  [
    "facility",
    12,
    [
      "Care home outbreak, visits paused",
      "Care home event clashed",
      "Staff shortage at the home",
    ],
  ],
  ["volunteers", 6, ["No pilot available", "Pilot fell ill"]],
  ["equipment", 4, ["Trishaw battery fault", "Trishaw in repair"]],
  ["noRiders", 3, ["Nobody signed up"]],
  [
    "other",
    8,
    ["Road closed for a marathon", "Street festival blocked the route"],
  ],
  [null, 10, ["Cancelled"]],
];

const MODEL_MIX: readonly (readonly [RideModel, number])[] = [
  ["pleasure", 55],
  ["event", 25],
  ["functional", 20],
];

const WEEKDAY = [0.35, 1.0, 1.1, 1.15, 1.1, 1.0, 0.6];

type Person = { id: string; weight: number; from: number; until: number };

function localToday(timeZone: string) {
  const { year, month, day } = wallClock(new Date(), timeZone);
  return { y: year, m: month - 1, d: day };
}

function localDay(timeZone: string, offset: number) {
  const { y, m, d } = localToday(timeZone);
  const date = new Date(Date.UTC(y, m, d + offset));
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth(),
    d: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

function season(month: number, latitude: number) {
  const northern = latitude >= 0 ? 1 : -1;
  return 0.6 + 0.45 * northern * Math.cos((2 * Math.PI * (month - 6.5)) / 12);
}

async function seedCountries() {
  const ids = new Map<string, string>();
  for (const country of COUNTRIES) {
    const row = await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
    ids.set(country.code, row.id);
  }
  return ids;
}

async function seedChapters(countryIds: Map<string, string>) {
  const ids = new Map<string, string>();
  for (const spec of CHAPTERS) {
    if (spec.existing) {
      const row = await prisma.organization.findUnique({
        where: { slug: spec.slug },
        select: { id: true },
      });
      if (!row)
        throw new Error(
          `Chapter ${spec.slug} is missing. Run npm run db:seed first.`,
        );
      ids.set(spec.slug, row.id);
      continue;
    }
    const createdAt = new Date(
      Date.now() - (spec.startMonthsAgo || 0.5) * 30.4 * DAY_MS,
    );
    const data = {
      name: spec.name,
      countryId: countryIds.get(spec.country)!,
      city: spec.city,
      latitude: spec.latitude,
      longitude: spec.longitude,
      timeZone: spec.timeZone,
      description: `Demo chapter for the reports dashboard in ${spec.city}.`,
    } satisfies Prisma.OrganizationUncheckedUpdateInput;
    const row = await prisma.organization.upsert({
      where: { slug: spec.slug },
      update: data,
      create: { ...data, slug: spec.slug, createdAt },
    });
    ids.set(spec.slug, row.id);
    if (!(await fleet.getDefaultLocation(row.id))) {
      const chapter = (await chapters.getChapter(row.id))!;
      await fleet.createDefaultLocation(defaultLocationFor(chapter));
    }
  }
  return ids;
}

type People = { pilots: Person[]; riders: Person[] };

async function seedPeople(
  spec: ChapterSpec,
  chapterId: string,
): Promise<People> {
  const first = FIRST_NAMES[spec.country];
  const last = LAST_NAMES[spec.country];
  const historyStart = -Math.round(spec.startMonthsAgo * 30.4);
  const inactiveCut = -380;

  const users: Prisma.UserCreateManyInput[] = [];
  const members: Prisma.MemberCreateManyInput[] = [];
  const pilots: Person[] = [];
  for (let i = 0; i < spec.pilots; i++) {
    const id = `${DEMO}user-${spec.slug}-p${i + 1}`;
    const inactive = historyStart < inactiveCut - 60 && i % 5 === 4;
    const from =
      i < 3
        ? historyStart
        : int(historyStart, Math.min(-30, historyStart + 240));
    pilots.push({
      id,
      weight: 1 / Math.pow(i + 1, 0.8),
      from,
      until: inactive ? int(historyStart + 40, inactiveCut - 10) : FUTURE_DAYS,
    });
    users.push({
      id,
      name: `${pick(first)} ${pick(last)}`,
      email: `${DEMO}${spec.slug}.pilot${i + 1}@cwa.local`,
      emailVerified: true,
      createdAt: new Date(Date.now() + from * DAY_MS),
    });
    members.push({
      id: `${DEMO}member-${spec.slug}-p${i + 1}`,
      organizationId: chapterId,
      userId: id,
      role: "pilot",
      createdAt: new Date(Date.now() + from * DAY_MS),
    });
  }

  const passengers: Prisma.PassengerCreateManyInput[] = [];
  const riders: Person[] = [];
  for (let i = 0; i < spec.riders; i++) {
    const id = `${DEMO}pax-${spec.slug}-${i + 1}`;
    const inactive = historyStart < inactiveCut - 60 && i % 6 === 5;
    const from =
      i < 6 ? historyStart : int(historyStart, Math.max(historyStart, -14));
    riders.push({
      id,
      weight: 0.4 + rand(),
      from,
      until: inactive ? int(historyStart + 30, inactiveCut - 10) : FUTURE_DAYS,
    });
    passengers.push({
      id,
      chapterId,
      managedByUserId: pilots[0].id,
      firstName: pick(first),
      lastName: pick(last),
      birthDate: new Date(Date.UTC(int(1928, 1948), int(0, 11), int(1, 28))),
      gender: weighted<Gender>([
        ["female", 62],
        ["male", 36],
        ["other", 2],
      ]),
      createdAt: new Date(Date.now() + from * DAY_MS),
    });
  }

  await prisma.user.createMany({ data: users, skipDuplicates: true });
  await prisma.member.createMany({ data: members, skipDuplicates: true });
  await prisma.passenger.createMany({ data: passengers, skipDuplicates: true });
  return { pilots, riders };
}

function choose(pool: Person[], count: number) {
  const chosen: string[] = [];
  const left = [...pool];
  while (chosen.length < count && left.length) {
    const person = weighted(left.map((p) => [p, p.weight] as const));
    chosen.push(person.id);
    left.splice(left.indexOf(person), 1);
  }
  return chosen;
}

type Planned = {
  ride: Prisma.RideCreateManyInput;
  pilots: string[];
  riders: string[];
};

function planChapter(spec: ChapterSpec, chapterId: string, people: People) {
  const planned: Planned[] = [];
  const returns: Planned[] = [];
  if (spec.size === 0) return { planned, returns };
  const places = PLACES[spec.country];
  const historyStart = -Math.round(spec.startMonthsAgo * 30.4);
  const now = Date.now();
  let n = 0;

  for (let offset = historyStart; offset <= FUTURE_DAYS; offset++) {
    const day = localDay(spec.timeZone, offset);
    const ramp = Math.min(1, 0.45 + (offset - historyStart) / 240);
    const seasonal = spec.seasonal ? season(day.m + 1, spec.latitude) : 1;
    const mean =
      TRIPS_PER_CHAPTER_DAY *
      spec.size *
      seasonal *
      WEEKDAY[day.weekday] *
      ramp;
    const trips = poisson(mean);
    const pilotPool = people.pilots.filter(
      (p) => p.from <= offset && p.until >= offset,
    );
    const riderPool = people.riders.filter(
      (p) => p.from <= offset && p.until >= offset,
    );
    if (!pilotPool.length || !riderPool.length) continue;

    for (let t = 0; t < trips; t++) {
      const model = weighted(MODEL_MIX);
      const hour = model === "event" ? int(10, 15) : int(9, 16);
      const minute = pick([0, 0, 15, 30, 30, 45]);
      const minutes =
        model === "event"
          ? int(4, 6) * 30
          : model === "pleasure"
            ? int(2, 4) * 30
            : int(1, 3) * 30;
      const startsAt = instantAt(
        { year: day.y, month: day.m + 1, day: day.d, hour, minute },
        spec.timeZone,
      );
      const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
      const riderCount =
        model === "event" ? (rand() < 0.6 ? 2 : 1) : rand() < 0.35 ? 2 : 1;
      const pilotCount = model === "event" && rand() < 0.3 ? 2 : 1;
      const winter = spec.seasonal && (day.m <= 1 || day.m === 11);
      const cancelled = rand() < (winter ? 0.14 : 0.08);
      const future = startsAt.getTime() > now;
      const id = `${DEMO}ride-${spec.slug}-${++n}`;
      const destination =
        model === "functional"
          ? `${pick(places.destinations)} ${spec.city}`
          : null;

      const ride: Prisma.RideCreateManyInput = {
        id,
        chapterId,
        model,
        status: cancelled ? "cancelled" : future ? "scheduled" : "completed",
        startsAt,
        endsAt,
        locationName: `${pick(places.start)} ${spec.city}`,
        latitude: spec.latitude + (rand() - 0.5) * 0.02,
        longitude: spec.longitude + (rand() - 0.5) * 0.02,
        destinationName: destination,
        createdAt: new Date(startsAt.getTime() - int(3, 21) * DAY_MS),
      };
      if (cancelled) {
        const [category, , reasons] = weighted(
          CANCELLATIONS.map(
            (entry) =>
              [
                entry,
                entry[0] === "weather" && winter ? entry[1] * 1.8 : entry[1],
              ] as const,
          ),
        );
        ride.cancellationReasonCode = category;
        ride.cancellationNote = pick(reasons);
        ride.cancelledAt = new Date(
          startsAt.getTime() - int(2, 72) * 3_600_000,
        );
      }
      const entry = {
        ride,
        pilots: choose(pilotPool, pilotCount),
        riders: choose(riderPool, riderCount),
      };
      planned.push(entry);

      if (model === "functional" && !cancelled && rand() < 0.45) {
        const backAt = new Date(endsAt.getTime() + int(2, 4) * 30 * 60_000);
        returns.push({
          ride: {
            ...ride,
            id: `${id}-back`,
            returnLegOfId: id,
            startsAt: backAt,
            endsAt: new Date(backAt.getTime() + minutes * 60_000),
            locationName: destination,
            destinationName: ride.locationName,
            status: backAt.getTime() > now ? "scheduled" : "completed",
          },
          pilots: entry.pilots,
          riders: entry.riders,
        });
      }
    }
  }
  return { planned, returns };
}

async function insert(list: Planned[]) {
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500);
    await prisma.ride.createMany({ data: batch.map((p) => p.ride) });
    await prisma.rideAssignment.createMany({
      data: batch.flatMap((p) =>
        p.pilots.map((userId) => ({
          rideId: p.ride.id!,
          userId,
          role: "pilot" as const,
        })),
      ),
    });
    await prisma.rideRosterEntry.createMany({
      data: batch.flatMap((p) =>
        p.riders.map((passengerId, position) => ({
          rideId: p.ride.id!,
          passengerId,
          position,
          checkedInAt: p.ride.status === "completed" ? p.ride.startsAt : null,
        })),
      ),
    });
  }
}

async function main() {
  const countryIds = await seedCountries();
  const chapterIds = await seedChapters(countryIds);

  const removed = await prisma.ride.deleteMany({
    where: { id: { startsWith: `${DEMO}ride-` } },
  });

  const all: Planned[] = [];
  const allReturns: Planned[] = [];
  for (const spec of CHAPTERS) {
    const chapterId = chapterIds.get(spec.slug)!;
    const people = await seedPeople(spec, chapterId);
    const { planned, returns } = planChapter(spec, chapterId, people);
    all.push(...planned);
    allReturns.push(...returns);
  }
  await insert(all);
  await insert(allReturns);

  const rides = [...all, ...allReturns];
  const cancelled = rides.filter((p) => p.ride.status === "cancelled").length;
  const riderRides = rides
    .filter((p) => p.ride.status === "completed")
    .reduce((sum, p) => sum + p.riders.length, 0);
  console.log(
    `Removed ${removed.count} demo rides; inserted ${rides.length} (${allReturns.length} return legs, ${cancelled} cancelled, ${riderRides} completed rider-rides) across ${CHAPTERS.length} chapters.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });
