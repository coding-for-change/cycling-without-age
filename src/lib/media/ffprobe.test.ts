import { MediaFailure } from "./failure";
import { parseProbe } from "./ffprobe";

const LIMITS = { maxDurationSeconds: 3_600 };

const video = (overrides: Record<string, unknown> = {}) => ({
  codec_type: "video",
  width: 1920,
  height: 1080,
  avg_frame_rate: "30000/1001",
  r_frame_rate: "30000/1001",
  ...overrides,
});

const audio = { codec_type: "audio" };

const probeJson = (
  streams: unknown[],
  format: Record<string, unknown> = {},
) => ({
  format: {
    format_name: "mov,mp4,m4a,3gp,3g2,mj2",
    duration: "120.5",
    ...format,
  },
  streams,
});

const failureOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof MediaFailure ? error.code : "other";
  }
  return null;
};

describe("parseProbe", () => {
  it("reads an mp4 with audio", () => {
    expect(parseProbe(probeJson([video(), audio]), LIMITS)).toEqual({
      durationSeconds: 120.5,
      width: 1920,
      height: 1080,
      fps: 30000 / 1001,
      hasAudio: true,
      formatName: "mov,mp4,m4a,3gp,3g2,mj2",
    });
  });

  it("swaps the edges of a rotated phone recording", () => {
    const info = parseProbe(
      probeJson([video({ side_data_list: [{ rotation: -90 }] })]),
      LIMITS,
    );
    expect([info.width, info.height, info.hasAudio]).toEqual([
      1080,
      1920,
      false,
    ]);
  });

  it("honours the legacy rotate tag", () => {
    const info = parseProbe(
      probeJson([video({ tags: { rotate: "90" } })]),
      LIMITS,
    );
    expect([info.width, info.height]).toEqual([1080, 1920]);
  });

  it("accepts a 4K portrait clip", () => {
    const info = parseProbe(
      probeJson([video({ width: 2160, height: 3840 })]),
      LIMITS,
    );
    expect(info.height).toBe(3840);
  });

  it("ignores cover art when looking for video", () => {
    expect(
      failureOf(() =>
        parseProbe(
          probeJson([video({ disposition: { attached_pic: 1 } }), audio]),
          LIMITS,
        ),
      ),
    ).toBe("noVideoStream");
  });

  it("accepts matroska", () => {
    const info = parseProbe(
      probeJson([video()], { format_name: "matroska,webm" }),
      LIMITS,
    );
    expect(info.formatName).toBe("matroska,webm");
  });

  it.each([
    ["avi", probeJson([video()], { format_name: "avi" }), "unsupportedFormat"],
    ["no streams", probeJson([audio]), "noVideoStream"],
    ["too long", probeJson([video()], { duration: "3600.5" }), "tooLong"],
    ["8K", probeJson([video({ width: 7680, height: 4320 })]), "tooLarge"],
    ["120 fps", probeJson([video({ avg_frame_rate: "120/1" })]), "tooLarge"],
    [
      "no duration",
      probeJson([video()], { duration: undefined }),
      "unsupportedFormat",
    ],
    ["garbage", null, "unsupportedFormat"],
  ])("rejects %s", (_name, json, code) => {
    expect(failureOf(() => parseProbe(json, LIMITS))).toBe(code);
  });

  it("allows 60 fps with rounding slack", () => {
    expect(
      parseProbe(probeJson([video({ avg_frame_rate: "60000/1001" })]), LIMITS)
        .fps,
    ).toBeCloseTo(59.94);
  });
});
