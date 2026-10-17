"use client";

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { I18nProvider } from "@videojs/react/i18n";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { VideoPlayer } from "@videojs/react/video";
import {
  SeekLimitContext,
  type SeekLimitState,
} from "@/components/videojs/ui/seek-limit";
import { VideoSkin } from "@/components/videojs/video/skin";
import { cn } from "@/lib/utils";
import {
  videojsTranslations,
  type TrainingPlayerStrings,
} from "./training-player-strings";

export type { TrainingPlayerStrings } from "./training-player-strings";

export type TrainingPlayerHandle = {
  currentTime(): number;
  seek(seconds: number): void;
  play(): void;
  paused(): boolean;
};

export type TrainingPlayerProps = {
  src: string;
  poster?: string | null;
  title: string;
  strings: TrainingPlayerStrings;
  locale?: string;
  seekLimit?: number;
  startAt?: number;
  onTime?: (seconds: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeeked?: (seconds: number) => void;
  onEnded?: () => void;
  onReady?: (info: { duration: number }) => void;
  className?: string;
  ref?: Ref<TrainingPlayerHandle>;
};

const LIMITED_MAX_RATE = 1.5;
const SEEK_TOLERANCE_SECONDS = 0.25;
const BLOCKED_HINT_MS = 1_600;

export default function TrainingPlayer({
  src,
  poster,
  title,
  strings,
  locale,
  seekLimit,
  startAt,
  onTime,
  onPlay,
  onPause,
  onSeeked,
  onEnded,
  onReady,
  className,
  ref,
}: TrainingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [blocked, setBlocked] = useState({ on: false, nonce: 0 });
  const limited = seekLimit !== undefined;

  useImperativeHandle(
    ref,
    () => ({
      currentTime: () => videoRef.current?.currentTime ?? 0,
      seek: (seconds: number) => {
        if (videoRef.current) videoRef.current.currentTime = seconds;
      },
      play: () => {
        void videoRef.current?.play().catch(() => undefined);
      },
      paused: () => videoRef.current?.paused ?? true,
    }),
    [],
  );

  useEffect(() => {
    if (!blocked.on) return;
    const timer = setTimeout(
      () => setBlocked((state) => ({ ...state, on: false })),
      BLOCKED_HINT_MS,
    );
    return () => clearTimeout(timer);
  }, [blocked]);

  const translations = useMemo(() => videojsTranslations(strings), [strings]);

  const seekLimitState = useMemo<SeekLimitState | null>(
    () =>
      limited
        ? {
            percent:
              duration > 0 ? Math.min(100, (seekLimit / duration) * 100) : 0,
            blocked: blocked.on,
            nonce: blocked.nonce,
            message: strings.watchFirst,
          }
        : null,
    [limited, seekLimit, duration, blocked, strings.watchFirst],
  );

  const clampSeek = () => {
    const video = videoRef.current;
    if (!video || !limited) return;
    if (video.currentTime <= seekLimit + SEEK_TOLERANCE_SECONDS) return;
    video.currentTime = seekLimit;
    setBlocked((state) => ({ on: true, nonce: state.nonce + 1 }));
  };

  const capRate = () => {
    const video = videoRef.current;
    if (video && limited && video.playbackRate > LIMITED_MAX_RATE)
      video.playbackRate = LIMITED_MAX_RATE;
  };

  const readDuration = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setDuration(video.duration);
  };

  return (
    <I18nProvider
      locale={locale}
      translations={translations}
    >
      <SeekLimitContext value={seekLimitState}>
        <VideoPlayer
          poster={poster ?? undefined}
          title={title}
        >
          <VideoSkin className={cn("aspect-video w-full", className)}>
            <HlsJsVideo
              ref={videoRef}
              src={src}
              playsInline
              crossOrigin="anonymous"
              preload="metadata"
              onLoadedMetadata={() => {
                readDuration();
                capRate();
                const video = videoRef.current;
                if (video && startAt && startAt > 0)
                  video.currentTime = limited
                    ? Math.min(startAt, seekLimit)
                    : startAt;
                onReady?.({ duration: video?.duration ?? 0 });
              }}
              onDurationChange={readDuration}
              onSeeking={clampSeek}
              onSeeked={() => onSeeked?.(videoRef.current?.currentTime ?? 0)}
              onPlay={onPlay}
              onPause={onPause}
              onRateChange={capRate}
              onTimeUpdate={() => onTime?.(videoRef.current?.currentTime ?? 0)}
              onEnded={onEnded}
            />
          </VideoSkin>
        </VideoPlayer>
      </SeekLimitContext>
    </I18nProvider>
  );
}
