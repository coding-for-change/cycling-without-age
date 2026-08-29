"use client";

/* Animated, swipeable, skippable onboarding carousel — shown once per persona
   after sign-up (auth.markOnboarded gates it). */

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Hero } from "@/lib/art";
import { BtnHero } from "@/components/bits";

export interface OnbSlide {
  art: string;
  title: string;
  body: string;
}

export function Onboarding({
  slides,
  onDone,
}: {
  slides: OnbSlide[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"r" | "l">("r");
  const x0 = useRef<number | null>(null);
  const s = slides[i];
  const last = i === slides.length - 1;

  return (
    <div className="onb">
      <div className="onb-top">
        {!last && (
          <button
            type="button"
            className="onb-skip"
            onClick={onDone}
          >
            {t("common.skip")}
          </button>
        )}
      </div>
      <div
        key={`${i}-${dir}`}
        className={`onb-stage slide-in-${dir}`}
        onTouchStart={(e) => {
          x0.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (x0.current === null) return;
          const dx = e.changedTouches[0].clientX - x0.current;
          x0.current = null;
          if (dx < -50 && !last) {
            setDir("r");
            setI(i + 1);
          }
          if (dx > 50 && i > 0) {
            setDir("l");
            setI(i - 1);
          }
        }}
      >
        <div className="onb-art">
          <Hero name={s.art} />
        </div>
        <div className="onb-copy">
          <div className="display">{s.title}</div>
          <p className="muted">{s.body}</p>
        </div>
      </div>
      <div className="onb-foot">
        <div className="progress-dots">
          {slides.map((_, k) => (
            <span
              key={k}
              className={k < i ? "done" : k === i ? "current" : ""}
            />
          ))}
        </div>
        <BtnHero
          label={t(last ? "common.start" : "common.continue")}
          icon={last ? "check" : "arrowRight"}
          onClick={() => {
            if (last) onDone();
            else {
              setDir("r");
              setI(i + 1);
            }
          }}
        />
      </div>
    </div>
  );
}
