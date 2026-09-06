import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import type { ChapterRole } from "@/lib/access";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: NODE_ENV=production");
}

type CountrySeed = { code: string; name: string };
type ChapterSeed = {
  slug: string;
  name: string;
  country: string;
  city: string;
  address?: string;
  careHomeName?: string;
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
    latitude: 55.6884,
    longitude: 12.5527,
  },
];

const PERSONAS: Persona[] = [
  { email: "superadmin@cwa.local", name: "Sanne Superadmin", superadmin: true },
  {
    email: "country.de@cwa.local",
    name: "Clara Country (DE)",
    countryAdminOf: ["DE"],
  },
  {
    email: "admin.muenchen@cwa.local",
    name: "Anke Admin (München)",
    chapterRoles: { muenchen: ["admin"] },
  },
  {
    email: "pilot@cwa.local",
    name: "Piet Pilot",
    chapterRoles: { muenchen: ["pilot"], hamburg: ["pilot"] },
  },
  {
    email: "pilot.pending@cwa.local",
    name: "Pernille Pending",
    pendingPilotApplications: ["muenchen"],
  },
  {
    email: "passenger@cwa.local",
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
    email: "multi@cwa.local",
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
      // Keep an already-seeded chapter's position and service radius in step
      // with this file, so correcting either here is picked up by an existing
      // database rather than needing a wipe.
      const radius = chapter.serviceRadiusKm ?? existing.serviceRadiusKm;
      if (
        existing.latitude !== chapter.latitude ||
        existing.longitude !== chapter.longitude ||
        existing.serviceRadiusKm !== radius
      ) {
        await chapters.updateChapter(existing.id, {
          latitude: chapter.latitude,
          longitude: chapter.longitude,
          serviceRadiusKm: radius,
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

async function main() {
  const countryIds = await seedCountries();
  const chapterIds = await seedChapters(countryIds);

  const chapterId = (slug: string) => {
    const id = chapterIds.get(slug);
    if (!id) throw new Error(`Unknown chapter ${slug}`);
    return id;
  };

  for (const persona of PERSONAS) {
    const userId = await seedUser(persona);

    for (const code of persona.countryAdminOf ?? []) {
      await chapters.appointCountryAdmin(userId, countryIds.get(code)!);
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
  }

  console.table(
    PERSONAS.map((p) => ({
      email: p.email,
      roles: [
        p.superadmin ? "superadmin" : null,
        ...(p.countryAdminOf ?? []).map((c) => `country admin ${c}`),
        ...Object.entries(p.chapterRoles ?? {}).map(
          ([slug, roles]) => `${roles.join("+")} @ ${slug}`,
        ),
        ...(p.pendingPilotApplications ?? []).map(
          (s) => `pilot pending @ ${s}`,
        ),
      ]
        .filter(Boolean)
        .join(", "),
    })),
  );
  console.log(
    `${COUNTRIES.length} countries, ${CHAPTERS.length} chapters, ${PERSONAS.length} accounts. Sign in with an email OTP — see docs-internal/DEV-ACCOUNTS.md.`,
  );
}

await main();
await prisma.$disconnect();
