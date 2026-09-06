import { Prisma } from "@/generated/prisma";

/**
 * Every refusal a Facade can hand back, named. The Actions turn these straight
 * into their own result shape, so a code the UI has no word for is a type
 * error rather than a toast that says "Something went wrong".
 */
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
  | "selfChange"
  | "slugTaken"
  | "unknownApplication"
  | "unknownChapter"
  | "unknownCountry";

/**
 * A refusal the UI can name. Facades throw these instead of prose, so an Action
 * forwards `error.code` rather than matching on an English sentence that a
 * rename would silently turn into a generic error.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode) {
    super(code);
    this.name = "DomainError";
    this.code = code;
  }
}

/** The code if this is a domain refusal, `null` if it is a real fault. */
export const domainCode = (error: unknown): DomainErrorCode | null =>
  error instanceof DomainError ? error.code : null;

const prismaCode = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;

/** A unique index rejected the write — the row already exists. */
export const isUniqueViolation = (error: unknown) =>
  prismaCode(error) === "P2002";

/** A foreign key rejected the write — the row it points at does not exist. */
export const isMissingRelation = (error: unknown) =>
  prismaCode(error) === "P2003";

/**
 * Runs a write and renames the constraint that rejected it. Pre-checks lose
 * races; the index is the only thing that cannot.
 */
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
