import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import type { ManagedRiderInput } from "@/features/passengers";
import { profile } from "@/features/profile";
import { fleet } from "@/features/fleet";
import { rideInput, rides } from "@/features/rides";
import { defaultLocationFor } from "@/use-cases/manage-chapter";
import type { ChapterRole } from "@/lib/access";

if (process.env.NODE_ENV === "production" && !process.env.FEATURE_BRANCH) {
  throw new Error("Refusing to seed: NODE_ENV=production");
}

const seedMailbox = process.env.SEED_MAILBOX?.trim();

function address(name: string) {
  if (!seedMailbox) return `${name}@cwa.local`;
  const [local, domain] = seedMailbox.split("@");
  if (!local || !domain)
    throw new Error("SEED_MAILBOX is not an email address");
  return `${local}+${name}@${domain}`;
}

type CountrySeed = { code: string; name: string };
type ChapterSeed = {
  slug: string;
  name: string;
  country: string;
  city: string;
  address?: string;
  careHomeName?: string;
  description: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm?: number;
};
type Persona = {
  email: string;
  name: string;
  superadmin?: boolean;
  phoneNumber?: string;
  countryAdminOf?: string[];
  chapterRoles?: Record<string, ChapterRole[]>;
  pendingPilotApplications?: string[];
  /** A rider profile for this account, in the chapter named by the slug. */
  passenger?: {
    chapter: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: "female" | "male" | "other";
  };
  /** Riders this account books for without riding themself. */
  manages?: {
    chapter: string;
    relationship: string;
    riders: ManagedRiderInput[];
  };
};

const COUNTRIES: CountrySeed[] = [
  { code: "DE", name: "Deutschland" },
  { code: "DK", name: "Danmark" },
];

const CHAPTERS: ChapterSeed[] = [
  {
    slug: "muenchen",
    name: "München – Seniorenheim Sonnenhof",
    country: "DE",
    city: "München",
    address: "Sonnenstraße 12, 80331 München",
    careHomeName: "Seniorenheim Sonnenhof",
    description:
      "Zwei Trishaws stehen im Innenhof vom Sonnenhof, gleich hinter der Sonnenstraße. Wir fahren meist vormittags an der Isar entlang und halten unterwegs auf einen Kaffee.",
    latitude: 48.1361,
    longitude: 11.5647,
  },
  {
    slug: "hamburg",
    name: "Hamburg – Alstergarten",
    country: "DE",
    city: "Hamburg",
    address: "Alsterufer 5, 20354 Hamburg",
    careHomeName: "Pflegeheim Alstergarten",
    description:
      "Unsere Trishaw steht im Alstergarten und wartet auf die nächste Runde um die Außenalster. Freitagnachmittags geht es zum Fischmarkt, wenn das Wetter mitspielt.",
    latitude: 53.5603,
    longitude: 9.9906,
    // Wider than the default, so the per-chapter radius is exercised rather
    // than just defaulted everywhere.
    serviceRadiusKm: 15,
  },
  {
    slug: "copenhagen",
    name: "København – Nørrebro",
    country: "DK",
    city: "København",
    address: "Nørrebrogade 40, 2200 København",
    description:
      "Vores to rickshaws holder på Nørrebrogade og kører en tur langs søerne næsten hver formiddag. Bagefter er der som regel kaffe på Jægersborggade.",
    latitude: 55.6884,
    longitude: 12.5527,
  },
];

const PERSONAS: Persona[] = [
  { email: address("superadmin"), name: "Sanne Superadmin", superadmin: true },
  {
    email: address("country.de"),
    name: "Clara Country (DE)",
    countryAdminOf: ["DE"],
  },
  {
    email: address("admin.muenchen"),
    name: "Anke Admin (München)",
    chapterRoles: { muenchen: ["admin"] },
  },
  {
    email: address("pilot"),
    name: "Piet Pilot",
    chapterRoles: { muenchen: ["pilot"], hamburg: ["pilot"] },
  },
  {
    email: address("pilot.pending"),
    name: "Pernille Pending",
    pendingPilotApplications: ["muenchen"],
  },
  {
    email: address("passenger"),
    name: "Peter Passenger",
    phoneNumber: "+4915112345678",
    chapterRoles: { muenchen: ["passenger"] },
    passenger: {
      chapter: "muenchen",
      firstName: "Peter",
      lastName: "Passenger",
      birthDate: "1938-04-19",
      gender: "male",
    },
  },
  {
    email: address("caretaker"),
    name: "Carla Caretaker",
    chapterRoles: { muenchen: ["passenger"] },
    manages: {
      chapter: "muenchen",
      relationship: "child",
      riders: [
        {
          firstName: "Inge",
          lastName: "Caretaker",
          birthDate: "1936-09-02",
          gender: "female",
          pickup: { residence: "careHome" },
        },
        {
          firstName: "Walter",
          lastName: "Caretaker",
          birthDate: "1933-01-17",
          gender: "male",
          pickup: {
            residence: "home",
            address: "Pariser Straße 21, 81667 München",
            latitude: 48.1302,
            longitude: 11.5946,
          },
        },
      ],
    },
  },
  {
    email: address("multi"),
    name: "Malou Multi",
    chapterRoles: { hamburg: ["pilot", "admin"] },
    countryAdminOf: ["DK"],
  },
];

async function seedCountries() {
  const ids = new Map<string, string>();
  for (const country of COUNTRIES) {
    const existing = await chapters.getCountryByCode(country.code);
    ids.set(
      country.code,
      existing?.id ?? (await chapters.createCountry(country)).id,
    );
  }
  return ids;
}

async function seedChapters(countryIds: Map<string, string>) {
  const ids = new Map<string, string>();
  for (const { country, ...chapter } of CHAPTERS) {
    const existing = await chapters.getChapterBySlug(chapter.slug);
    if (existing) {
      ids.set(chapter.slug, existing.id);
      // Keep an already-seeded chapter's position, service radius and blurb in
      // step with this file, so correcting any of them here is picked up by an
      // existing database rather than needing a wipe.
      const radius = chapter.serviceRadiusKm ?? existing.serviceRadiusKm;
      if (
        existing.latitude !== chapter.latitude ||
        existing.longitude !== chapter.longitude ||
        existing.serviceRadiusKm !== radius ||
        existing.description !== chapter.description
      ) {
        await chapters.updateChapter(existing.id, {
          latitude: chapter.latitude,
          longitude: chapter.longitude,
          serviceRadiusKm: radius,
          description: chapter.description,
        });
      }
      continue;
    }
    const countryId = countryIds.get(country);
    if (!countryId) throw new Error(`Unknown country ${country}`);
    ids.set(
      chapter.slug,
      (await chapters.createChapter({ ...chapter, countryId })).id,
    );
  }
  for (const id of ids.values()) {
    if (await fleet.getDefaultLocation(id)) continue;
    const chapter = (await chapters.getChapter(id))!;
    await fleet.createDefaultLocation(defaultLocationFor(chapter));
  }
  return ids;
}

// Users go through BetterAuth so the account/user rows stay consistent. No password
// is passed, so no credential account exists — every persona signs in with an OTP.
async function seedUser(persona: Persona) {
  const existing = await prisma.user.findUnique({
    where: { email: persona.email },
  });
  if (existing) return existing.id;

  const { user } = await auth.api.createUser({
    body: {
      email: persona.email,
      name: persona.name,
      ...(persona.superadmin ? { role: "superadmin" } : {}),
      data: {
        emailVerified: true,
        ...(persona.phoneNumber
          ? { phoneNumber: persona.phoneNumber, phoneNumberVerified: true }
          : {}),
      },
    },
  });
  return user.id;
}

const TRISHAW_TYPES = {
  "Triobike Taxi": {
    seats: 2,
    wheelchairAccessible: false,
    description:
      "Electric-assist trishaw with a covered bench for **two passengers**.",
  },
  VeloPlus: {
    seats: 1,
    wheelchairAccessible: true,
    description:
      "Front-loading platform that takes a **wheelchair** without a transfer.",
  },
} satisfies Record<
  string,
  { seats: number; wheelchairAccessible: boolean; description: string }
>;

const TRISHAWS: Record<
  string,
  { name: string; type: keyof typeof TRISHAW_TYPES }[]
> = {
  muenchen: [
    { name: "Sonnenstrahl", type: "Triobike Taxi" },
    { name: "Isarwind", type: "VeloPlus" },
  ],
  hamburg: [{ name: "Alsterschwan", type: "Triobike Taxi" }],
  copenhagen: [{ name: "Nørrebro 1", type: "Triobike Taxi" }],
};

/** Midnight today, in the seeding machine's own zone. */
function startOfToday() {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

const at = (base: Date, dayOffset: number, hour: number, minute = 0) => {
  const d = new Date(base);
  d.setDate(base.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

/**
 * Rides are seeded relative to today so the calendar always has a populated
 * week. They are rebuilt on every run — re-seeding a moving window is the only
 * way to keep it idempotent.
 */
async function seedRides(
  chapterId: (slug: string) => string,
  userIds: Map<string, string>,
) {
  const slugs = Object.keys(TRISHAWS);
  await prisma.ride.deleteMany({
    where: { chapterId: { in: slugs.map(chapterId) } },
  });

  const typeIds = new Map<string, string>();
  for (const [name, spec] of Object.entries(TRISHAW_TYPES)) {
    const row = await prisma.trishawType.upsert({
      where: { scopeKey_name: { scopeKey: "global", name } },
      update: spec,
      create: { name, ...spec },
    });
    typeIds.set(name, row.id);
  }

  const muenchen = chapterId("muenchen");
  const muenchenChapter = await chapters.getChapter(muenchen);
  const pool =
    (await prisma.storageLocation.findFirst({
      where: { kind: "pool", name: "Depot Sonnenhof" },
      select: { id: true },
    })) ??
    (await fleet.createPool(
      {
        countryId: muenchenChapter!.countryId,
        name: "Depot Sonnenhof",
        address: "Sonnenstraße 12, 80331 München",
        latitude: 48.1371,
        longitude: 11.5654,
        entrance: "Gate B on the courtyard side, next to the bike racks.",
        accessCode: "4711",
        returnInstructions:
          "Plug the battery into the charger by the door and lock the gate.",
      },
      "seed",
    ));
  await prisma.storageLocationChapter.upsert({
    where: {
      storageLocationId_chapterId: {
        storageLocationId: pool.id,
        chapterId: muenchen,
      },
    },
    update: {},
    create: {
      storageLocationId: pool.id,
      chapterId: muenchen,
      status: "approved",
    },
  });

  const trishawIds = new Map<string, string>();
  for (const [slug, list] of Object.entries(TRISHAWS)) {
    const home =
      slug === "muenchen"
        ? pool.id
        : (await fleet.getDefaultLocation(chapterId(slug)))!.id;
    for (const trishaw of list) {
      const existing = await prisma.trishaw.findFirst({
        where: {
          name: trishaw.name,
          storageLocation: {
            OR: [{ id: home }, { ownerChapterId: chapterId(slug) }],
          },
        },
      });
      if (existing && existing.storageLocationId !== home)
        await prisma.trishaw.update({
          where: { id: existing.id },
          data: { storageLocationId: home },
        });
      trishawIds.set(
        `${slug}/${trishaw.name}`,
        existing?.id ??
          (
            await fleet.addTrishaw(
              {
                name: trishaw.name,
                storageLocationId: home,
                typeId: typeIds.get(trishaw.type)!,
              },
              null,
            )
          ).id,
      );
    }
  }

  const today = startOfToday();
  const pilot = userIds.get(address("pilot"))!;
  const multi = userIds.get(address("multi"))!;
  const rider = await passengers.getOwnPassenger(
    userIds.get(address("passenger"))!,
  );
  const [inge, walter] = (
    await passengers.listPassengersManagedBy(userIds.get(address("caretaker"))!)
  ).filter((managed) => managed.userId === null);
  const cared = (...people: (typeof inge | undefined)[]) =>
    people.flatMap((person) => (person ? [person.id] : []));

  // Offsets are days from today, not from Monday: the seed must leave something
  // in the past for the week grid and something ahead for the two agendas
  // whichever day of the week it is run.
  const plan = [
    {
      chapter: "muenchen",
      trishaws: ["muenchen/Sonnenstrahl", "muenchen/Isarwind"],
      day: -2,
      from: 10,
      to: 12,
      model: "event" as const,
      title: "Sommerfest im Sonnenhof",
      // A Multiple Ride Event running two trishaws at once — the case a single
      // FK could not express.
      location: "Seniorenheim Sonnenhof",
      staff: [pilot, multi],
      riders: [...(rider ? [rider.id] : []), ...cared(inge, walter)],
    },
    {
      chapter: "muenchen",
      trishaws: ["muenchen/Isarwind"],
      day: 1,
      from: 14,
      to: 16,
      model: "event" as const,
      title: "Ausfahrt in den Englischen Garten",
      location: "Englischer Garten",
      staff: [pilot],
      riders: cared(walter),
    },
    {
      chapter: "muenchen",
      trishaws: ["muenchen/Sonnenstrahl"],
      day: 2,
      from: 9,
      to: 10,
      model: "functional" as const,
      location: "Seniorenheim Sonnenhof",
      destination: "Hausarzt Dr. Weber",
      staff: [],
      riders: rider ? [rider.id] : [],
    },
    {
      chapter: "muenchen",
      trishaws: ["muenchen/Isarwind"],
      day: 4,
      from: 15,
      to: 17,
      model: "pleasure" as const,
      location: "Seniorenheim Sonnenhof",
      staff: [pilot],
      riders: cared(inge),
    },
    {
      chapter: "hamburg",
      trishaws: ["hamburg/Alsterschwan"],
      day: 3,
      from: 11,
      to: 13,
      model: "event" as const,
      title: "Rund um die Alster",
      location: "Alstergarten",
      staff: [pilot, multi],
      riders: [],
    },
    {
      chapter: "hamburg",
      trishaws: ["hamburg/Alsterschwan"],
      day: 5,
      from: 10,
      to: 12,
      model: "event" as const,
      title: "Hafenrundfahrt",
      location: "Alstergarten",
      staff: [multi],
      riders: [],
      cancel: "Weather — storm warning",
    },
  ];

  for (const item of plan) {
    const ride = await rides.scheduleRide(
      rideInput.parse({
        chapterId: chapterId(item.chapter),
        trishawIds: item.trishaws.map((key) => trishawIds.get(key)!),
        model: item.model,
        startsAt: at(today, item.day, item.from),
        endsAt: at(today, item.day, item.to),
        locationName: item.location,
        destinationName: item.destination ?? null,
        title: item.title ?? null,
        capacity: item.model === "event" ? 8 : null,
        requiredPilots: Math.max(1, item.staff.length),
      }),
      null,
    );
    for (const userId of item.staff) {
      await rides.assignVolunteer(ride.id, userId, null);
    }
    for (const passengerId of item.riders) {
      await rides.bookRider(ride.id, passengerId, null);
    }
    if (item.cancel)
      await rides.cancelRide(
        ride.id,
        { reasonCode: "weather", note: item.cancel },
        null,
      );
  }

  return plan.length;
}

function describeRoles(persona: Persona) {
  return [
    persona.superadmin ? "superadmin" : null,
    ...(persona.countryAdminOf ?? []).map((c) => `country admin ${c}`),
    ...Object.entries(persona.chapterRoles ?? {}).map(
      ([slug, roles]) => `${roles.join("+")} @ ${slug}`,
    ),
    ...(persona.pendingPilotApplications ?? []).map(
      (s) => `pilot pending @ ${s}`,
    ),
    persona.manages
      ? `caretaker of ${persona.manages.riders.length} @ ${persona.manages.chapter}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

async function listAccounts() {
  const existing = new Set(
    (
      await prisma.user.findMany({
        where: { email: { in: PERSONAS.map((p) => p.email) } },
        select: { email: true },
      })
    ).map((user) => user.email),
  );
  for (const persona of PERSONAS) {
    if (existing.has(persona.email))
      console.log(`SEED_ACCOUNT\t${persona.email}\t${describeRoles(persona)}`);
  }
}

async function main() {
  if (process.argv.includes("--if-empty") && (await prisma.user.count()) > 0) {
    console.log("Database already has accounts, skipping the seed.");
  } else {
    await seed();
  }
  if (process.argv.includes("--list-accounts")) await listAccounts();
}

async function seed() {
  const countryIds = await seedCountries();
  const chapterIds = await seedChapters(countryIds);

  const chapterId = (slug: string) => {
    const id = chapterIds.get(slug);
    if (!id) throw new Error(`Unknown chapter ${slug}`);
    return id;
  };

  let superAdminId: string | null = null;
  const userIds = new Map<string, string>();

  for (const persona of PERSONAS) {
    const userId = await seedUser(persona);
    if (persona.superadmin) superAdminId = userId;
    userIds.set(persona.email, userId);

    for (const code of persona.countryAdminOf ?? []) {
      await chapters.appointCountryAdmin(
        userId,
        countryIds.get(code)!,
        superAdminId ?? userId,
      );
    }
    for (const [slug, roles] of Object.entries(persona.chapterRoles ?? {})) {
      for (const role of roles) {
        await membership.grantChapterRole(userId, chapterId(slug), role);
      }
    }
    // Re-applying would reset `updatedAt`, so only apply where nothing exists yet.
    const applied = new Set(
      (await membership.listApplicationsOfUser(userId)).map((a) => a.chapterId),
    );
    for (const slug of persona.pendingPilotApplications ?? []) {
      if (applied.has(chapterId(slug))) continue;
      await membership.applyAsPilot({ userId, chapterId: chapterId(slug) });
    }

    if (persona.passenger && !(await passengers.getOwnPassenger(userId))) {
      const { chapter, birthDate, ...person } = persona.passenger;
      await passengers.addPassenger({
        ...person,
        birthDate: new Date(birthDate),
        chapterId: chapterId(chapter),
        managedByUserId: userId,
        userId,
      });
    }

    if (persona.manages) {
      const managed = await passengers.listPassengersManagedBy(userId);
      if (!managed.some((rider) => rider.userId === null)) {
        await passengers.addManagedPassengers(
          userId,
          chapterId(persona.manages.chapter),
          persona.manages.riders,
        );
      }
      await profile.markManagesOthers(userId, persona.manages.relationship);
    }
  }

  const rideCount = await seedRides(chapterId, userIds);

  console.table(
    PERSONAS.map((p) => ({ email: p.email, roles: describeRoles(p) })),
  );
  console.log(
    `${COUNTRIES.length} countries, ${CHAPTERS.length} chapters, ${PERSONAS.length} accounts, ${rideCount} rides. Sign in with an email OTP — see docs-internal/DEV-ACCOUNTS.md.`,
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
