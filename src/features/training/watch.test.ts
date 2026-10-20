import { acceptHeartbeat, isLessonComplete, seekLimit } from "./watch";

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 16, 12, 0, seconds));

describe("acceptHeartbeat", () => {
  it("allows only five seconds on the first beat", () => {
    const state = acceptHeartbeat(
      null,
      { position: 60, furthest: 60 },
      600,
      at(0),
    );
    expect(state.furthestSeconds).toBe(5);
    expect(state.positionSeconds).toBe(5);
    expect(state.completedAt).toBeNull();
  });

  it("caps growth at twice the elapsed time plus five seconds", () => {
    const previous = {
      furthestSeconds: 100,
      positionSeconds: 100,
      heartbeatAt: at(0),
      completedAt: null,
    };
    expect(
      acceptHeartbeat(previous, { position: 200, furthest: 200 }, 600, at(15))
        .furthestSeconds,
    ).toBe(135);
    expect(
      acceptHeartbeat(previous, { position: 112, furthest: 112 }, 600, at(15))
        .furthestSeconds,
    ).toBe(112);
  });

  it("never shrinks furthest and keeps position within it", () => {
    const previous = {
      furthestSeconds: 300,
      positionSeconds: 300,
      heartbeatAt: at(0),
      completedAt: null,
    };
    const state = acceptHeartbeat(
      previous,
      { position: 20, furthest: 0 },
      600,
      at(15),
    );
    expect(state.furthestSeconds).toBe(300);
    expect(state.positionSeconds).toBe(20);
  });

  it("completes at 90 percent and keeps the first completion time", () => {
    const previous = {
      furthestSeconds: 85,
      positionSeconds: 85,
      heartbeatAt: at(0),
      completedAt: null,
    };
    const done = acceptHeartbeat(
      previous,
      { position: 91, furthest: 91 },
      100,
      at(5),
    );
    expect(done.completedAt).toEqual(at(5));
    const later = acceptHeartbeat(
      done,
      { position: 95, furthest: 95 },
      100,
      at(9),
    );
    expect(later.completedAt).toEqual(at(5));
  });

  it("never claims beyond the duration", () => {
    const previous = {
      furthestSeconds: 95,
      positionSeconds: 95,
      heartbeatAt: at(0),
      completedAt: null,
    };
    expect(
      acceptHeartbeat(previous, { position: 500, furthest: 500 }, 100, at(30))
        .furthestSeconds,
    ).toBe(100);
  });
});

describe("isLessonComplete", () => {
  it("needs 90 percent of a known duration", () => {
    expect(
      isLessonComplete({ durationSeconds: 100, furthestSeconds: 89 }),
    ).toBe(false);
    expect(
      isLessonComplete({ durationSeconds: 100, furthestSeconds: 90 }),
    ).toBe(true);
    expect(
      isLessonComplete({ durationSeconds: null, furthestSeconds: 90 }),
    ).toBe(false);
  });
});

describe("seekLimit", () => {
  it("is the furthest point until completion, then unlimited", () => {
    expect(seekLimit({ furthestSeconds: 42, completedAt: null })).toBe(42);
    expect(seekLimit({ furthestSeconds: 42, completedAt: at(0) })).toBe(
      Infinity,
    );
  });
});
