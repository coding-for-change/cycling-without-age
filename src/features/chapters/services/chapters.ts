import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const insertChapter = (data: Prisma.OrganizationUncheckedCreateInput) =>
  prisma.organization.create({ data });

export const updateChapterById = (
  id: string,
  data: Prisma.OrganizationUncheckedUpdateInput,
) => prisma.organization.update({ where: { id }, data });

export const findChapterById = (id: string) =>
  prisma.organization.findUnique({ where: { id } });

export const findChaptersByIds = (ids: string[]) =>
  prisma.organization.findMany({ where: { id: { in: ids } } });

export const findChapterBySlug = (slug: string) =>
  prisma.organization.findUnique({ where: { slug } });

export const findChapterCountryId = (id: string) =>
  prisma.organization.findUnique({
    where: { id },
    select: { countryId: true },
  });

export const findChapters = (countryId?: string) =>
  prisma.organization.findMany({
    where: countryId ? { countryId } : undefined,
    orderBy: { name: "asc" },
  });

export const findChapterScopes = () =>
  prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, countryId: true },
  });

export const deleteChapterById = (id: string) =>
  prisma.organization.delete({ where: { id } });

export const findChapterFootprint = (id: string) =>
  prisma.organization.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          members: true,
          passengers: true,
          applications: { where: { status: "pending" } },
        },
      },
    },
  });
