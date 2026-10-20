export const MEDIA_FAILURE_CODES = [
  "unsupportedFormat",
  "noVideoStream",
  "tooLong",
  "tooLarge",
  "sourceMissing",
  "transcodeFailed",
  "timeout",
] as const;

export type MediaFailureCode = (typeof MEDIA_FAILURE_CODES)[number];

export class MediaFailure extends Error {
  constructor(readonly code: MediaFailureCode) {
    super(`media failure: ${code}`);
    this.name = "MediaFailure";
  }
}

export const isMediaFailureCode = (value: unknown): value is MediaFailureCode =>
  typeof value === "string" &&
  (MEDIA_FAILURE_CODES as readonly string[]).includes(value);
