import type { ProbeInfo } from "./ffprobe";

export type Rendition = {
  height: number;
  width: number;
  videoKbps: number;
  maxKbps: number;
  bufKbps: number;
  audioKbps: number;
};

export const AUDIO_KBPS = 128;

export const LADDER = [
  { height: 360, videoKbps: 800 },
  { height: 720, videoKbps: 2800 },
  { height: 1080, videoKbps: 5000 },
] as const;

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export function renditionsFor(source: ProbeInfo): Rendition[] {
  const shortEdge = Math.min(source.width, source.height);
  const portrait = source.height > source.width;
  const fitting = LADDER.filter((rung) => rung.height <= shortEdge);
  const rungs = fitting.length
    ? fitting
    : [{ height: even(shortEdge), videoKbps: LADDER[0].videoKbps }];

  return rungs.map((rung) => {
    const longEdge = even(
      (rung.height * Math.max(source.width, source.height)) / shortEdge,
    );
    return {
      width: portrait ? rung.height : longEdge,
      height: portrait ? longEdge : rung.height,
      videoKbps: rung.videoKbps,
      maxKbps: Math.round(rung.videoKbps * 1.07),
      bufKbps: rung.videoKbps * 2,
      audioKbps: AUDIO_KBPS,
    };
  });
}

export const renditionName = (rendition: Rendition) =>
  `${Math.min(rendition.width, rendition.height)}p`;

export function buildHlsArgs({
  input,
  outDir,
  source,
  threads,
}: {
  input: string;
  outDir: string;
  source: ProbeInfo;
  threads: number;
}): string[] {
  const renditions = renditionsFor(source);
  const gop = String(2 * Math.max(1, Math.round(source.fps)));

  const maps = renditions.flatMap(() => [
    "-map",
    "0:v:0",
    ...(source.hasAudio ? ["-map", "0:a:0"] : []),
  ]);

  const perStream = renditions.flatMap((rendition, index) => [
    `-filter:v:${index}`,
    `scale=${rendition.width}:${rendition.height}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1`,
    `-b:v:${index}`,
    `${rendition.videoKbps}k`,
    `-maxrate:v:${index}`,
    `${rendition.maxKbps}k`,
    `-bufsize:v:${index}`,
    `${rendition.bufKbps}k`,
  ]);

  const audio = source.hasAudio
    ? ["-c:a", "aac", "-b:a", `${AUDIO_KBPS}k`, "-ar", "48000", "-ac", "2"]
    : [];

  const streamMap = renditions
    .map((rendition, index) =>
      [
        `v:${index}`,
        ...(source.hasAudio ? [`a:${index}`] : []),
        `name:${renditionName(rendition)}`,
      ].join(","),
    )
    .join(" ");

  return [
    "-nostdin",
    "-hide_banner",
    "-y",
    "-protocol_whitelist",
    "file",
    "-filter_threads",
    String(threads),
    "-threads",
    String(threads),
    "-i",
    input,
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-dn",
    "-sn",
    ...maps,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-g",
    gop,
    "-keyint_min",
    gop,
    "-sc_threshold",
    "0",
    ...perStream,
    ...audio,
    "-f",
    "hls",
    "-hls_time",
    "6",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_type",
    "fmp4",
    "-hls_flags",
    "independent_segments",
    "-hls_fmp4_init_filename",
    "init.mp4",
    "-hls_segment_filename",
    `${outDir}/%v/seg_%04d.m4s`,
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    streamMap,
    "-progress",
    "pipe:1",
    "-nostats",
    "-threads",
    String(threads),
    `${outDir}/%v/index.m3u8`,
  ];
}

export const posterSecond = (durationSeconds: number) =>
  Math.min(3, durationSeconds * 0.1);

export const buildPosterArgs = ({
  input,
  seconds,
  output,
}: {
  input: string;
  seconds: number;
  output: string;
}): string[] => [
  "-nostdin",
  "-hide_banner",
  "-y",
  "-protocol_whitelist",
  "file",
  "-ss",
  seconds.toFixed(3),
  "-i",
  input,
  "-map_metadata",
  "-1",
  "-an",
  "-dn",
  "-sn",
  "-frames:v",
  "1",
  "-f",
  "image2",
  "-c:v",
  "png",
  output,
];
