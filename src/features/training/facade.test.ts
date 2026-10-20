import { training } from "@/features/training";
import { domainCode } from "@/lib/domain-error";
import * as storage from "./services/storage";
import * as videos from "./services/videos";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const emitted: unknown[] = [];
jest.mock("@/lib/events", () => ({
  transaction: jest.fn((run: (tx: unknown, emit: unknown) => unknown) =>
    run({}, async (event: unknown) => {
      emitted.push(event);
    }),
  ),
}));

jest.mock("./services/videos");
jest.mock("./services/lessons");
jest.mock("./services/storage", () => ({
  ...jest.requireActual("./services/storage"),
  startSourceUpload: jest.fn(async () => "upload-1"),
  signSourceParts: jest.fn(async (_key: string, _id: string, parts: number[]) =>
    parts.map((partNumber) => ({
      partNumber,
      url: `https://s3/${partNumber}`,
    })),
  ),
  finishSourceUpload: jest.fn(),
  abortSourceUpload: jest.fn(),
  uploadedSourceParts: jest.fn(),
  sourceSize: jest.fn(),
  deleteSource: jest.fn(),
  deleteMedia: jest.fn(),
}));

const mocked = (fn: unknown) => fn as jest.Mock;

const MiB = 1024 * 1024;

const video = (over: Record<string, unknown> = {}) => ({
  id: "video-1",
  scope: "chapter",
  scopeKey: "chapter:chapter-berlin",
  countryId: null,
  chapterId: "chapter-berlin",
  chapter: { id: "chapter-berlin", name: "Berlin", countryId: "country-de" },
  country: null,
  language: "de",
  title: "Bremsen",
  description: null,
  status: "uploading",
  progress: 0,
  failureCode: null,
  sourceKey: "training/sources/abc",
  sourceMime: "video/mp4",
  sourceSize: BigInt(40 * MiB),
  uploadId: "upload-1",
  mediaKey: "abcdefghijklmnopqrstuvwxyz",
  revision: 1,
  durationSeconds: null,
  posterSeconds: null,
  ...over,
});

const code = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return domainCode(error);
  }
  return null;
};

beforeEach(() => {
  jest.clearAllMocks();
  emitted.length = 0;
  delete process.env.TRAINING_MAX_UPLOAD_BYTES;
  process.env.MEDIA_PUBLIC_URL = "https://media.example.org/";
  mocked(videos.updateVideoWhere).mockResolvedValue(true);
});

describe("newMediaKey", () => {
  it("is 26 lowercase base32 characters and never repeats", () => {
    const keys = new Set(
      Array.from({ length: 200 }, () => training.newMediaKey()),
    );
    expect(keys.size).toBe(200);
    for (const key of keys) expect(key).toMatch(/^[a-z2-7]{26}$/);
  });
});

describe("createVideo", () => {
  const input = {
    owner: { scope: "chapter" as const, chapterId: "chapter-berlin" },
    language: "de" as const,
    title: "Bremsen",
    mime: "video/mp4" as const,
    size: 40 * MiB,
  };

  it("opens a multipart upload in 16 MiB parts under the private sources prefix", async () => {
    mocked(videos.insertVideo).mockResolvedValue(video());
    await expect(training.createVideo(input, "admin-1")).resolves.toEqual({
      videoId: "video-1",
      partSize: 16 * MiB,
      partCount: 3,
    });
    const data = mocked(videos.insertVideo).mock.calls[0][0];
    expect(data.sourceKey).toBe(`training/sources/${data.mediaKey}`);
    expect(data).toMatchObject({
      scope: "chapter",
      scopeKey: "chapter:chapter-berlin",
      chapterId: "chapter-berlin",
      countryId: null,
      uploadId: "upload-1",
      sourceSize: BigInt(40 * MiB),
    });
  });

  it("refuses a file above the configured limit before touching storage", async () => {
    process.env.TRAINING_MAX_UPLOAD_BYTES = String(10 * MiB);
    expect(await code(() => training.createVideo(input, "admin-1"))).toBe(
      "uploadRejected",
    );
    expect(storage.startSourceUpload).not.toHaveBeenCalled();
  });

  it("aborts the multipart upload when the row cannot be written", async () => {
    mocked(videos.insertVideo).mockRejectedValue(new Error("db down"));
    await expect(training.createVideo(input, "admin-1")).rejects.toThrow();
    expect(storage.abortSourceUpload).toHaveBeenCalled();
  });
});

describe("signParts", () => {
  it("refuses part numbers beyond the file's own part count", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video());
    expect(
      await code(() =>
        training.signParts({ videoId: "video-1", partNumbers: [3, 4] }),
      ),
    ).toBe("uploadRejected");
  });

  it("refuses once the upload is finished", async () => {
    mocked(videos.findVideoById).mockResolvedValue(
      video({ status: "queued", uploadId: null }),
    );
    expect(
      await code(() =>
        training.signParts({ videoId: "video-1", partNumbers: [1] }),
      ),
    ).toBe("videoNotUploading");
  });
});

describe("markUploaded", () => {
  const parts = [1, 2, 3].map((partNumber) => ({
    partNumber,
    etag: `"etag-${partNumber}"`,
  }));

  it("queues the video and emits trainingVideo.uploaded when every byte arrived", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video());
    mocked(storage.sourceSize).mockResolvedValue(40 * MiB);
    await training.markUploaded({ videoId: "video-1", parts }, "admin-1");
    expect(storage.finishSourceUpload).toHaveBeenCalledWith(
      "training/sources/abc",
      "upload-1",
      parts,
    );
    expect(emitted).toEqual([
      {
        type: "trainingVideo.uploaded",
        videoId: "video-1",
        revision: 1,
        chapterId: "chapter-berlin",
        actorUserId: "admin-1",
      },
    ]);
  });

  it("rejects a missing part", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video());
    expect(
      await code(() =>
        training.markUploaded(
          { videoId: "video-1", parts: parts.slice(0, 2) },
          "admin-1",
        ),
      ),
    ).toBe("uploadRejected");
    expect(storage.finishSourceUpload).not.toHaveBeenCalled();
  });

  it("deletes the video when the stored size differs from the announced one", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video());
    mocked(storage.sourceSize).mockResolvedValue(41 * MiB);
    expect(
      await code(() =>
        training.markUploaded({ videoId: "video-1", parts }, "admin-1"),
      ),
    ).toBe("uploadRejected");
    expect(videos.deleteVideoById).toHaveBeenCalled();
    expect(emitted).toEqual([
      expect.objectContaining({ type: "trainingVideo.deleted" }),
    ]);
  });
});

describe("worker transitions", () => {
  it("skips a job whose revision is no longer current", async () => {
    mocked(videos.updateVideoWhere).mockResolvedValue(false);
    await expect(training.markProcessing("video-1", 1)).resolves.toBeNull();
  });

  it("caps progress below 100 until the video is ready", async () => {
    await training.setProgress("video-1", 1, 140);
    expect(mocked(videos.updateVideoWhere).mock.calls[0][1]).toEqual({
      progress: 99,
    });
  });
});

describe("retryVideo", () => {
  it("bumps the revision so the CDN never serves the failed output", async () => {
    mocked(videos.findVideoById).mockResolvedValue(
      video({ status: "failed", revision: 2, failureCode: "timeout" }),
    );
    await training.retryVideo("video-1", "admin-1");
    expect(mocked(videos.updateVideoWhere).mock.calls[0][1]).toMatchObject({
      status: "queued",
      revision: 3,
      failureCode: null,
    });
    expect(emitted).toEqual([
      expect.objectContaining({ type: "trainingVideo.uploaded", revision: 3 }),
    ]);
  });

  it("only retries a failed video", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video({ status: "ready" }));
    expect(await code(() => training.retryVideo("video-1", "admin-1"))).toBe(
      "videoNotFailed",
    );
  });
});

describe("playbackOf", () => {
  it("points at the revision's master playlist and stamped posters on the public CDN", () => {
    expect(
      training.playbackOf({
        status: "ready",
        mediaKey: "key",
        revision: 4,
        posterSeconds: 3,
      }),
    ).toEqual({
      src: "https://media.example.org/training/v/key/4/master.m3u8",
      poster: "https://media.example.org/training/v/key/4/poster-3000.webp",
      posterSmall:
        "https://media.example.org/training/v/key/4/poster-3000-480.webp",
    });
  });

  it("has nothing to play before the video is ready", () => {
    expect(
      training.playbackOf({
        status: "processing",
        mediaKey: "key",
        revision: 1,
        posterSeconds: null,
      }),
    ).toBeNull();
  });
});

describe("videoAuthority", () => {
  it("hands a chapter video to its chapter and a global one to no one but superadmins", async () => {
    mocked(videos.findVideoById).mockResolvedValueOnce(video());
    await expect(training.videoAuthority("video-1")).resolves.toEqual({
      chapters: [{ chapterId: "chapter-berlin", countryId: "country-de" }],
      countryIds: [],
    });
    mocked(videos.findVideoById).mockResolvedValueOnce(
      video({ scope: "global", chapterId: null, chapter: null }),
    );
    await expect(training.videoAuthority("video-1")).resolves.toEqual({
      chapters: [],
      countryIds: [],
    });
  });
});

describe("deleteVideo", () => {
  it("carries everything the purge needs, because the row is gone by then", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video({ status: "ready" }));
    await training.deleteVideo("video-1", "admin-1");
    expect(emitted).toEqual([
      {
        type: "trainingVideo.deleted",
        videoId: "video-1",
        mediaKey: "abcdefghijklmnopqrstuvwxyz",
        sourceKey: "training/sources/abc",
        uploadId: "upload-1",
        chapterId: "chapter-berlin",
        actorUserId: "admin-1",
      },
    ]);
  });
});
