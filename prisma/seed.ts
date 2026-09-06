import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
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
};
type Persona = {
  email: string;
  name: string;
  superadmin?: boolean;
  phoneNumber?: string;
  countryAdminOf?: string[];
  chapterRoles?: Record<string, ChapterRole[]>;
  pendingPilotApplications?: string[];
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
  },
  {
    slug: "hamburg",
    name: "Hamburg – Alstergarten",
    country: "DE",
    city: "Hamburg",
    address: "Alsterufer 5, 20354 Hamburg",
    careHomeName: "Pflegeheim Alstergarten",
  },
  {
    slug: "copenhagen",
    name: "København – Nørrebro",
    country: "DK",
    city: "København",
    address: "Nørrebrogade 40, 2200 København",
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
