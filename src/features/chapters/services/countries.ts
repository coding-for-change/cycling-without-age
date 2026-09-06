import { prisma } from "@/lib/prisma";

export const insertCountry = (data: { name: string; code: string }) =>
  prisma.country.create({ data });

export const updateCountryById = (
  id: string,
  data: { name?: string; code?: string },
) => prisma.country.update({ where: { id }, data });

export const findCountries = () =>
  prisma.country.findMany({ orderBy: { name: "asc" } });

/** Only what an admin scope is built from. */
export const findCountryScopes = () =>
  prisma.country.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });

export const findCountryById = (id: string) =>
  prisma.country.findUnique({ where: { id } });

export const findCountryByCode = (code: string) =>
  prisma.country.findUnique({ where: { code } });

const footprintSelect = {
  _count: { select: { chapters: true, admins: true } },
  chapters: {
    select: { _count: { select: { members: true, passengers: true } } },
  },
} as const;

export const findCountryFootprint = (id: string) =>
  prisma.country.findUnique({ where: { id }, select: footprintSelect });

export const findCountryFootprints = (ids: string[]) =>
  prisma.country.findMany({
    where: { id: { in: ids } },
    select: { id: true, ...footprintSelect },
  });

// The chapter -> country relation restricts, so the chapters go first, and both
// deletes share one transaction: a half-deleted country is not a state to land in.
export const deleteCountryById = (id: string) =>
  prisma.$transaction([
    prisma.organization.deleteMany({ where: { countryId: id } }),
    prisma.country.delete({ where: { id } }),
  ]);

export const insertCountryAdmin = (userId: string, countryId: string) =>
  prisma.countryAdmin.upsert({
    where: { userId_countryId: { userId, countryId } },
    create: { userId, countryId },
    update: {},
  });

export const deleteCountryAdmin = (userId: string, countryId: string) =>
  prisma.countryAdmin.deleteMany({ where: { userId, countryId } });

export const findCountryAdminsOf = (userId: string) =>
  prisma.countryAdmin.findMany({
    where: { userId },
    select: { countryId: true },
  });

export const findCountryAdmins = (countryId: string) =>
  prisma.countryAdmin.findMany({
    where: { countryId },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });

export const findCountryAdminsOfCountries = (countryIds: string[]) =>
  prisma.countryAdmin.findMany({
    where: { countryId: { in: countryIds } },
    select: {
      countryId: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  });
