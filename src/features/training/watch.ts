export const COMPLETE_RATIO = 0.9;
export const GRACE_SECONDS = 5;
export const MAX_SPEED = 2;

export type WatchState = {
  furthestSeconds: number;
  positionSeconds: number;
  heartbeatAt: Date;
  completedAt: Date | null;
};

export type Heartbeat = { position: number; furthest: number };

export function isLessonComplete(lesson: {
  durationSeconds: number | null;
  furthestSeconds: number;
}) {
  if (!lesson.durationSeconds || lesson.durationSeconds <= 0) return false;
  return lesson.furthestSeconds >= COMPLETE_RATIO * lesson.durationSeconds;
}

export const completionPoint = (durationSeconds: number) =>
  COMPLETE_RATIO * durationSeconds;

export function acceptHeartbeat(
  previous: WatchState | null,
  beat: Heartbeat,
  durationSeconds: number,
  now: Date,
): WatchState {
  const furthestBefore = previous?.furthestSeconds ?? 0;
  const elapsed = previous
    ? Math.max(0, (now.getTime() - previous.heartbeatAt.getTime()) / 1000)
    : 0;
  const allowed = furthestBefore + MAX_SPEED * elapsed + GRACE_SECONDS;
  const claimed = Math.max(beat.position, beat.furthest);
  const furthestSeconds = Math.max(
    furthestBefore,
    Math.min(claimed, allowed, durationSeconds),
  );
  const positionSeconds = Math.min(
    Math.max(0, beat.position),
    furthestSeconds,
    durationSeconds,
  );
  const completedAt =
    previous?.completedAt ??
    (isLessonComplete({ durationSeconds, furthestSeconds }) ? now : null);
  return { furthestSeconds, positionSeconds, heartbeatAt: now, completedAt };
}

export const seekLimit = (progress: {
  furthestSeconds: number;
  completedAt: Date | null;
}) => (progress.completedAt ? Infinity : progress.furthestSeconds);
