"use client";

import { useEffect } from "react";
import {
  DISPLAY_COOKIE_MAX_AGE,
  MOTION_COOKIE,
  REDUCED_MOTION,
  TEXT_SIZE_COOKIE,
  motionAttribute,
  textSizeAttribute,
  type TextSize,
} from "@/lib/display-preferences";

const write = (name: string, value: string) => {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${DISPLAY_COOKIE_MAX_AGE}; samesite=lax${secure}`;
};

const read = (name: string) =>
  document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] ?? null;

/** Sets or clears one `data-*` attribute on `<html>`. */
export function applyToRoot(attribute: string, value: string | null) {
  const root = document.documentElement;
  if (value === null) root.removeAttribute(attribute);
  else root.setAttribute(attribute, value);
}

export function applyTextSize(size: TextSize) {
  applyToRoot("data-text-size", textSizeAttribute(size));
}

export function applyMotion(reduceMotion: boolean) {
  applyToRoot("data-motion", motionAttribute(reduceMotion));
}

/**
 * The account holds the display choice; the cookies only let the next page be
 * drawn right before it paints. On a device that has not seen this account
 * yet — or after a choice made elsewhere — this puts both back in step, once.
 */
export function DisplayCookieSync({
  textSize,
  reduceMotion,
}: {
  textSize: TextSize;
  reduceMotion: boolean;
}) {
  useEffect(() => {
    if (read(TEXT_SIZE_COOKIE) !== textSize) {
      write(TEXT_SIZE_COOKIE, textSize);
      applyTextSize(textSize);
    }
    const motion = reduceMotion ? REDUCED_MOTION : "";
    if ((read(MOTION_COOKIE) ?? "") !== motion) {
      write(MOTION_COOKIE, motion);
      applyMotion(reduceMotion);
    }
  }, [textSize, reduceMotion]);

  return null;
}
