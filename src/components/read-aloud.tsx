"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

/** A touch slower than a voice's default: read to, not read at. */
const RATE = 0.9;

const never = () => () => {};
const canSpeak = () => "speechSynthesis" in window;

/**
 * Reads a text aloud with the device's own voice, in the page's language.
 * The text is written on the server in full sentences; nothing leaves the
 * device. Hidden where the browser has no speech synthesis.
 */
export function ReadAloud({
  text,
  lang,
  labels,
  className,
}: {
  text: string;
  lang: string;
  labels: { listen: string; stop: string };
  className?: string;
}) {
  const supported = useSyncExternalStore(never, canSpeak, () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(
    () => () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    },
    [],
  );

  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = RATE;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    haptics.tap();
    setSpeaking(true);
    synth.speak(utterance);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggle}
      aria-pressed={speaking}
      className={cn(
        "min-h-11 gap-2 rounded-full border-line px-4 text-base",
        speaking && "border-mint-deep bg-mint-tint",
        className,
      )}
    >
      {speaking ? <Square aria-hidden /> : <Volume2 aria-hidden />}
      {speaking ? labels.stop : labels.listen}
    </Button>
  );
}
