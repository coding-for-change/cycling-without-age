"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";

type Alternative = { transcript: string };
type Result = { isFinal: boolean; 0: Alternative };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: { resultIndex: number; results: ArrayLike<Result> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionClass = new () => Recognition;

const recognitionClass = (): RecognitionClass | null => {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionClass;
    webkitSpeechRecognition?: RecognitionClass;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

const never = () => () => {};
const canListen = () => recognitionClass() !== null;

/** Once someone has read where the recording goes, they are not asked again. */
const CONSENT_KEY = "cwa.dictation.understood";

const understood = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    localStorage.setItem(CONSENT_KEY, "1");
  } catch {}
};

export type DictationStrings = {
  start: string;
  stop: string;
  listening: string;
  privacy: string;
  allow: string;
  add: string;
  discard: string;
  heard: string;
  failed: string;
  denied: string;
};

type Phase = "idle" | "consent" | "listening" | "review";

/**
 * Tell it instead of typing it. The browser turns speech into text — sending
 * the recording to Google or Apple, which the person is told before the
 * first time — and nothing reaches their profile until they add what was heard.
 * Hidden where the browser cannot listen.
 */
export function Dictation({
  lang,
  strings,
  onAdd,
}: {
  lang: string;
  strings: DictationStrings;
  onAdd: (heard: string) => Promise<ActionResult>;
}) {
  const supported = useSyncExternalStore(never, canListen, () => false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [pending, setPending] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => () => recognition.current?.abort(), []);

  if (!supported) return null;

  const listen = () => {
    const Recognizer = recognitionClass();
    if (!Recognizer) return;
    const session = new Recognizer();
    session.lang = lang;
    session.continuous = true;
    session.interimResults = true;
    let finished = "";
    session.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finished += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      setHeard(`${finished}${interim}`.trim());
    };
    session.onerror = (event) => {
      haptics.error();
      toast.error(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? strings.denied
          : strings.failed,
      );
    };
    session.onend = () => {
      recognition.current = null;
      setPhase((current) => (current === "listening" ? "review" : current));
    };
    recognition.current = session;
    setHeard("");
    setPhase("listening");
    haptics.tap();
    session.start();
  };

  const start = () => {
    if (understood()) listen();
    else setPhase("consent");
  };

  const add = async () => {
    setPending(true);
    const result = await onAdd(heard);
    setPending(false);
    if (!result.ok) {
      haptics.error();
      toast.error(strings.failed);
      return;
    }
    setHeard("");
    setPhase("idle");
  };

  if (phase === "consent")
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-canvas-deep p-4">
        <p className="text-sm">{strings.privacy}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              remember();
              listen();
            }}
            className="min-h-11 rounded-full bg-mint-deep px-5 text-white hover:bg-mint-deep/90"
          >
            <Mic aria-hidden />
            {strings.allow}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPhase("idle")}
            className="min-h-11 rounded-full"
          >
            {strings.discard}
          </Button>
        </div>
      </div>
    );

  if (phase === "listening")
    return (
      <div
        aria-live="polite"
        className="flex flex-col gap-3 rounded-2xl border-2 border-mint bg-mint-tint p-4"
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden
            className="size-2.5 rounded-full bg-mint-deep motion-safe:animate-pulse"
          />
          {strings.listening}
        </p>
        {heard ? <p className="text-base">{heard}</p> : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => recognition.current?.stop()}
          className="min-h-11 w-fit rounded-full border-line"
        >
          <Square aria-hidden />
          {strings.stop}
        </Button>
      </div>
    );

  if (phase === "review" && heard)
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <p className="text-sm text-ink-soft">{strings.heard}</p>
        <p className="text-base">{heard}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => void add()}
            className="min-h-11 rounded-full bg-mint-deep px-5 text-white hover:bg-mint-deep/90"
          >
            {strings.add}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setHeard("");
              setPhase("idle");
            }}
            className="min-h-11 rounded-full"
          >
            {strings.discard}
          </Button>
        </div>
      </div>
    );

  return (
    <Button
      type="button"
      variant="outline"
      onClick={start}
      className="min-h-11 w-fit gap-2 rounded-full border-line px-4 text-base"
    >
      <Mic aria-hidden />
      {strings.start}
    </Button>
  );
}
