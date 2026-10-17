import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const videoSelect = {
  id: true,
  scope: true,
  scopeKey: true,
  countryId: true,
  chapterId: true,
  language: true,
  title: true,
  description: true,
  status: true,
  progress: true,
  failureCode: true,
  sourceKey: true,
  sourceMime: true,
  sourceSize: true,
  uploadId: true,
  mediaKey: true,
  revision: true,
  durationSeconds: true,
  width: true,
  height: true,
  renditions: true,
  posterSeconds: true,
  uploadedByUserId: true,
  readyAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  country: { select: { id: true, name: true, code: true } },
  chapter: { select: { id: true, name: true, countryId: true } },
} satisfies Prisma.TrainingVideoSelect;

export type TrainingVideoRow = Prisma.TrainingVideoGetPayload<{
  select: typeof videoSelect;
}>;

export const statusSelect = {
  id: true,
  scope: true,
  countryId: true,
  chapterId: true,
  chapter: { select: { countryId: true } },
  status: true,
  progress: true,
  failureCode: true,
  mediaKey: true,
  revision: true,
  posterSeconds: true,
  durationSeconds: true,
} satisfies Prisma.TrainingVideoSelect;

export type VideoStatusRow = Prisma.TrainingVideoGetPayload<{
  select: typeof statusSelect;
}>;

export const findVideos = (where: Prisma.TrainingVideoWhereInput) =>
  prisma.trainingVideo.findMany({
    where,
    orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
    select: videoSelect,
    take: 500,
  });

export const findVideoById = (id: string) =>
  prisma.trainingVideo.findUnique({ where: { id }, select: videoSelect });

export const findVideoStatuses = (ids: string[]) =>
  prisma.trainingVideo.findMany({
    where: { id: { in: ids } },
    select: statusSelect,
  });

export const insertVideo = (data: Prisma.TrainingVideoUncheckedCreateInput) =>
  prisma.trainingVideo.create({ data, select: videoSelect });

export const updateVideoById = (
  id: string,
  data: Prisma.TrainingVideoUncheckedUpdateInput,
  db: Prisma.TransactionClient = prisma,
) => db.trainingVideo.update({ where: { id }, data, select: videoSelect });

export const updateVideoWhere = async (
  where: Prisma.TrainingVideoWhereUniqueInput & Prisma.TrainingVideoWhereInput,
  data: Prisma.TrainingVideoUncheckedUpdateInput,
  db: Prisma.TransactionClient = prisma,
) => (await db.trainingVideo.updateMany({ where, data })).count > 0;

export const deleteVideoById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.trainingVideo.delete({ where: { id }, select: { id: true } });

export const findStaleUploads = (before: Date, take: number) =>
  prisma.trainingVideo.findMany({
    where: { status: "uploading", createdAt: { lt: before } },
    select: { id: true, sourceKey: true, uploadId: true },
    take,
  });

export const findVideosOfOwners = (
  chapterIds: string[],
  countryIds: string[],
) =>
  prisma.trainingVideo.findMany({
    where: {
      OR: [
        { chapterId: { in: chapterIds } },
        { countryId: { in: countryIds } },
      ],
    },
    select: {
      id: true,
      mediaKey: true,
      sourceKey: true,
      uploadId: true,
    },
  });
