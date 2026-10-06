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
  | "capacityBelowRoster"
  | "capacityRequired"
  | "codeTaken"
  | "consentRequired"
  | "defaultLocation"
  | "destinationRequired"
  | "editWindowClosed"
  | "frameNumberLocked"
  | "frameNumberTaken"
  | "frozen"
  | "invalidFile"
  | "invalidPromotion"
  | "lastAdmin"
  | "legsOverlap"
  | "locationNotEmpty"
  | "notAssigned"
  | "notChapterMember"
  | "notFound"
  | "notMember"
  | "notOwnAccount"
  | "notOwner"
  | "notPilot"
  | "notReachable"
  | "otherLegScheduled"
  | "notSender"
  | "partOfRoundTrip"
  | "passengerChapterMismatch"
  | "photosEventOnly"
  | "pilotsFull"
  | "pleasureLimit"
  | "poolInUse"
  | "rideClosed"
  | "rideEndsBeforeStart"
  | "rideFull"
  | "rideNotCancelled"
  | "rideTooLong"
  | "rideTooShort"
  | "riderNotInChapter"
  | "rosterChanged"
  | "self"
  | "selfChange"
  | "slugTaken"
  | "titleRequired"
  | "tooLong"
  | "tooManyPilots"
  | "trishawBooked"
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
  | "unknownPassenger"
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

export type ActionResult<E extends string, T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: E };

export function createAttempt<C extends DomainErrorCode>(
  codes: readonly C[],
  refresh: () => void,
) {
  const map: Partial<Record<DomainErrorCode, C>> = Object.fromEntries(
    codes.map((code) => [code, code]),
  );
  const failed = (error: unknown) => actionFailure<C>(error, map);
  async function attempt<T extends object = object>(
    run: () => Promise<T | void>,
    { revalidate = true }: { revalidate?: boolean } = {},
  ): Promise<ActionResult<C | "generic", T>> {
    try {
      const extra = await run();
      if (revalidate) refresh();
      return { ok: true, ...extra } as ActionResult<C | "generic", T>;
    } catch (error) {
      return failed(error);
    }
  }
  return { attempt, failed };
}

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
