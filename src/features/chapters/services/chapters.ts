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
