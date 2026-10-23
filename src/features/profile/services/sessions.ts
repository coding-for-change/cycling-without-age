import { prisma } from "@/lib/prisma";

export const stampPasskeyVerified = (sessionId: string, at: Date) =>
  prisma.session.updateMany({
    where: { id: sessionId },
    data: { passkeyVerifiedAt: at },
  });

export const findPasskeyVerifiedAt = async (sessionId: string) =>
  (
    await prisma.session.findUnique({
      where: { id: sessionId },
      select: { passkeyVerifiedAt: true },
    })
  )?.passkeyVerifiedAt ?? null;
