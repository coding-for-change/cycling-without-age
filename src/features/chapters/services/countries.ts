import { prisma } from "@/lib/prisma";

export const insertCountry = (data: { name: string; code: string }) =>
  prisma.country.create({ data });

export const findCountries = () =>
  prisma.country.findMany({ orderBy: { name: "asc" } });

export const findCountryById = (id: string) =>
  prisma.country.findUnique({ where: { id } });

export const findCountryByCode = (code: string) =>
  prisma.country.findUnique({ where: { code } });

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
