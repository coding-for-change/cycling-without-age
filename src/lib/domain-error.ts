import { Prisma } from "@/generated/prisma";

export type DomainErrorCode =
  | "adminNotApplied"
  | "alreadyDecided"
  | "alreadyHasAccount"
  | "alreadyHasPassenger"
  | "alreadyPilot"
  | "codeTaken"
  | "consentRequired"
  | "lastAdmin"
  | "notChapterMember"
  | "notOwnAccount"
  | "passengerChapterMismatch"
  | "rideEndsBeforeStart"
  | "rideTooLong"
  | "rideTooShort"
  | "selfChange"
  | "slugTaken"
  | "trishawNotInChapter"
  | "trishawReserved"
  | "trishawUnavailable"
  | "unknownApplication"
  | "unknownChapter"
  | "unknownCountry"
  | "unknownRide"
  | "unknownTrishaw"
  | "unknownTrishawType";

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

export const actionFailure = <E extends string>(
  error: unknown,
  map: Partial<Record<DomainErrorCode, E>>,
): { ok: false; error: E | "generic" } => {
  const code = domainCode(error);
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
