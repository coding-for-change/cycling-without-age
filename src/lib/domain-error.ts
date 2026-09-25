import { unstable_rethrow } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@/generated/prisma";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

export type DomainErrorCode =
  | "aboveThreshold"
  | "adminNotApplied"
  | "alreadyCleared"
  | "alreadyDecided"
  | "alreadyHasAccount"
  | "alreadyHasPassenger"
  | "alreadyMember"
  | "alreadyPilot"
  | "announcementOnly"
  | "cannotLeaveDirect"
  | "codeTaken"
  | "consentRequired"
  | "defaultLocation"
  | "editWindowClosed"
  | "frameNumberLocked"
  | "frameNumberTaken"
  | "frozen"
  | "invalidFile"
  | "invalidPromotion"
  | "lastAdmin"
  | "locationNotEmpty"
  | "notAssigned"
  | "notChapterMember"
  | "notFound"
  | "notMember"
  | "notOwnAccount"
  | "notOwner"
  | "notReachable"
  | "notSender"
  | "passengerChapterMismatch"
  | "poolInUse"
  | "rideEndsBeforeStart"
  | "rideTooLong"
  | "rideTooShort"
  | "self"
  | "selfChange"
  | "slugTaken"
  | "tooLong"
  | "trishawGrounded"
  | "trishawNotInChapter"
  | "trishawNotOnRide"
  | "trishawReserved"
  | "trishawUnavailable"
  | "typeInUse"
  | "typeNameTaken"
  | "unknownApplication"
  | "unknownChapter"
  | "unknownConversation"
  | "unknownCountry"
  | "unknownDamage"
  | "unknownLocation"
  | "unknownPool"
  | "unknownRide"
  | "unknownTrishaw"
  | "unknownTrishawType"
  | "uploadRejected";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode) {
    super(code);
    this.name = "DomainError";
    this.code = code;
  }
}

export const domainCode = (error: unknown): DomainErrorCode | null =>
  error instanceof DomainError ? error.code : null;

export const actionFailure = <E extends string = never>(
  error: unknown,
  map: Partial<Record<DomainErrorCode, E>>,
): { ok: false; error: E | "generic" } => {
  unstable_rethrow(error);

  const code = domainCode(error);
  if (code === null) {
    logger.error({ err: serializeError(error) }, "unexpected action error");
    Sentry.captureException(error);
  }

  return { ok: false, error: (code && map[code]) || "generic" };
};

const prismaCode = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;

export const isUniqueViolation = (error: unknown) =>
  prismaCode(error) === "P2002";

export const isMissingRelation = (error: unknown) =>
  prismaCode(error) === "P2003";

export async function mapping<T>(
  run: () => Promise<T>,
  codes: { unique?: DomainErrorCode; missingRelation?: DomainErrorCode },
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (codes.unique && isUniqueViolation(error))
      throw new DomainError(codes.unique);
    if (codes.missingRelation && isMissingRelation(error))
      throw new DomainError(codes.missingRelation);
    throw error;
  }
}
