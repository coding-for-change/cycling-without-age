import {
  buildHlsArgs,
  buildPosterArgs,
  posterSecond,
  renditionsFor,
} from "./ffmpeg-args";
import type { ProbeInfo } from "./ffprobe";

const source = (overrides: Partial<ProbeInfo> = {}): ProbeInfo => ({
  durationSeconds: 60,
  width: 1920,
  height: 1080,
  fps: 30,
  hasAudio: true,
  formatName: "mov,mp4",
  ...overrides,
});

const valueAfter = (args: string[], flag: string) =>
  args[args.indexOf(flag) + 1];

describe("renditionsFor", () => {
  it("keeps the full ladder for 1080p", () => {
    expect(renditionsFor(source()).map((r) => [r.width, r.height])).toEqual([
      [640, 360],
      [1280, 720],
      [1920, 1080],
    ]);
  });

  it("never upscales", () => {
    expect(
      renditionsFor(source({ width: 1280, height: 720 })).map((r) => r.height),
    ).toEqual([360, 720]);
  });

  it("limits a portrait clip by its short edge", () => {
    expect(
      renditionsFor(source({ width: 1080, height: 1920 })).map((r) => [
        r.width,
        r.height,
      ]),
    ).toEqual([
      [360, 640],
      [720, 1280],
      [1080, 1920],
    ]);
  });

  it("keeps a tiny clip at its own even height", () => {
    expect(
      renditionsFor(source({ width: 321, height: 241 })).map((r) => [
        r.width,
        r.height,
      ]),
    ).toEqual([[322, 242]]);
  });
});

describe("buildHlsArgs", () => {
  const args = buildHlsArgs({
    input: "/s/in",
    outDir: "/s/out",
    source: source({ width: 1280, height: 720 }),
    threads: 2,
  });

  it("hardens the input", () => {
    expect(args.slice(0, 11)).toEqual([
      "-nostdin",
      "-hide_banner",
      "-y",
      "-protocol_whitelist",
      "file",
      "-filter_threads",
      "2",
      "-threads",
      "2",
      "-i",
      "/s/in",
    ]);
    expect(valueAfter(args, "-map_metadata")).toBe("-1");
    expect(args).toEqual(expect.arrayContaining(["-dn", "-sn"]));
  });

  it("sets a two-second GOP", () => {
    expect(valueAfter(args, "-g")).toBe("60");
    expect(valueAfter(args, "-keyint_min")).toBe("60");
    expect(valueAfter(args, "-sc_threshold")).toBe("0");
  });

  it("maps video and audio per rendition", () => {
    expect(valueAfter(args, "-var_stream_map")).toBe(
      "v:0,a:0,name:360p v:1,a:1,name:720p",
    );
    expect(args.filter((arg) => arg === "0:a:0")).toHaveLength(2);
    expect(args.at(-1)).toBe("/s/out/%v/index.m3u8");
    expect(valueAfter(args, "-hls_segment_type")).toBe("fmp4");
    expect(valueAfter(args, "-threads")).toBe("2");
  });

  it("caps decoder and filter threads before the input", () => {
    const input = args.indexOf("-i");
    expect(valueAfter(args, "-filter_threads")).toBe("2");
    expect(args.indexOf("-filter_threads")).toBeLessThan(input);
    expect(args.indexOf("-threads")).toBeLessThan(input);
    expect(args.lastIndexOf("-threads")).toBeGreaterThan(input);
  });

  it("drops audio maps for a silent clip", () => {
    const silent = buildHlsArgs({
      input: "i",
      outDir: "o",
      source: source({ hasAudio: false, fps: 25 }),
      threads: 1,
    });
    expect(valueAfter(silent, "-var_stream_map")).toBe(
      "v:0,name:360p v:1,name:720p v:2,name:1080p",
    );
    expect(silent).not.toContain("0:a:0");
    expect(silent).not.toContain("aac");
    expect(valueAfter(silent, "-g")).toBe("50");
  });
});

describe("poster", () => {
  it("picks 10% of a short clip and 3s otherwise", () => {
    expect(posterSecond(10)).toBe(1);
    expect(posterSecond(600)).toBe(3);
  });

  it("seeks before the input and grabs one frame", () => {
    const args = buildPosterArgs({
      input: "in",
      seconds: 1.5,
      output: "p.png",
    });
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
    expect(valueAfter(args, "-frames:v")).toBe("1");
    expect(args.at(-1)).toBe("p.png");
  });
});
