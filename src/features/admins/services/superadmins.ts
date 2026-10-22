import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const CANDIDATES = { role: { contains: "superadmin" } } as const;

export const lockSuperadminCandidates = (db: Prisma.TransactionClient) =>
  db.$queryRaw<{ id: string; role: string | null }[]>`
    SELECT id, role FROM \`user\` WHERE role LIKE '%superadmin%' FOR UPDATE`;

export const findSuperadminCandidates = () =>
  prisma.user.findMany({
    where: CANDIDATES,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { passkeys: true } },
    },
  });

export const findUserRole = async (
  userId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))
    ?.role ?? null;

export const updateUserRole = (
  userId: string,
  role: string,
  db: Prisma.TransactionClient = prisma,
) => db.user.update({ where: { id: userId }, data: { role } });
