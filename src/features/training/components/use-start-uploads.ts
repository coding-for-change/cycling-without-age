"use client";

import { useState } from "react";
import { formatDuration, wordsLocale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import type { ContentLanguage } from "../schemas";
import { enqueue } from "./upload-store";
import { validateVideoFile, type VideoCheck } from "./video-upload";

export type UploadLimits = { maxBytes: number; maxDurationSeconds: number };

export type InvalidVideoLabels = {
  type: string;
  size: string;
  duration: string;
  empty: string;
};

const TITLE_MAX = 160;

export const titleFromFileName = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_MAX) || name.slice(0, TITLE_MAX);

const sizeFormats = new Map<string, Intl.NumberFormat>();

export const sizeLimitOf = (bytes: number, language: string) => {
  const locale = wordsLocale(language);
  const unit = bytes >= 1024 ** 3 ? "gigabyte" : "megabyte";
  const id = `${locale}:${unit}`;
  let format = sizeFormats.get(id);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits: 1,
    });
    sizeFormats.set(id, format);
  }
  return format.format(bytes / (unit === "gigabyte" ? 1024 ** 3 : 1024 ** 2));
};

export function useStartUploads({
  scope,
  limits,
  invalid,
  language,
}: {
  scope?: string;
  limits: UploadLimits;
  invalid: InvalidVideoLabels;
  language: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const reason = (check: Exclude<VideoCheck, { ok: true }>) => {
    if (check.reason === "size")
      return formatMessage(
        invalid.size,
        { size: sizeLimitOf(limits.maxBytes, language) },
        language,
      );
    if (check.reason === "duration")
      return formatMessage(
        invalid.duration,
        {
          duration: formatDuration(
            limits.maxDurationSeconds,
            wordsLocale(language),
          ),
        },
        language,
      );
    return invalid[check.reason];
  };

  const start = async (
    files: File[],
    videoLanguage: ContentLanguage,
    assignTo?: string,
  ): Promise<string[]> => {
    if (files.length === 0) return [];
    setChecking(true);
    const checks = await Promise.all(
      files.map((file) => validateVideoFile(file, limits)),
    );
    setChecking(false);
    const accepted = files.filter((_, index) => checks[index].ok);
    const rejected = checks.find(
      (check): check is Exclude<VideoCheck, { ok: true }> => !check.ok,
    );
    setError(
      rejected
        ? `${files[checks.indexOf(rejected)].name}: ${reason(rejected)}`
        : null,
    );
    if (accepted.length === 0) {
      haptics.warning();
      return [];
    }
    haptics.tap();
    return enqueue(
      accepted.map((file, index) => ({
        file,
        title: titleFromFileName(file.name),
        language: videoLanguage,
        scope,
        assignTo: index === accepted.length - 1 ? assignTo : undefined,
      })),
    );
  };

  return { start, error, checking, clearError: () => setError(null) };
}
