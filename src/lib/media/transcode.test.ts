import { progressFraction, transcodeTimeoutMs } from "./transcode";

describe("progressFraction", () => {
  it("reads out_time_us", () => {
    expect(progressFraction("out_time_us=5000000", 10)).toBe(0.5);
  });
  it("caps below done", () => {
    expect(progressFraction("out_time_ms=20000000", 10)).toBe(0.99);
  });
  it("ignores other keys and N/A", () => {
    expect(progressFraction("frame=12", 10)).toBeNull();
    expect(progressFraction("out_time_us=N/A", 10)).toBeNull();
  });
});

describe("transcodeTimeoutMs", () => {
  it("is at least ten minutes and six times the duration", () => {
    expect(transcodeTimeoutMs(30)).toBe(600_000);
    expect(transcodeTimeoutMs(3_600)).toBe(21_600_000);
  });
});
