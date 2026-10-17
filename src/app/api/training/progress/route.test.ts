import { getSession } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { recordLessonProgress } from "@/use-cases/training-access";
import { POST } from "./route";

jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/lib/app-url", () => ({ APP_URL: "https://cwa.example.org" }));
jest.mock("@/lib/auth-guards", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/rate-limit", () => ({ withinRateLimit: jest.fn(() => true) }));
jest.mock("@/use-cases/training-access", () => ({
  recordLessonProgress: jest.fn(),
}));
jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

const beat = {
  courseId: "course-1",
  lessonId: "lesson-1",
  position: 12,
  furthest: 12,
};

const post = (body: unknown, origin = "https://cwa.example.org") =>
  POST(
    new Request("https://cwa.example.org/api/training/progress", {
      method: "POST",
      headers: { origin, "content-type": "text/plain" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  jest.clearAllMocks();
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "pilot-1" } });
});

describe("POST /api/training/progress", () => {
  it("records a beat and answers 204 without caching", async () => {
    const response = await post(beat);
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(recordLessonProgress).toHaveBeenCalledWith("pilot-1", "course-1", {
      lessonId: "lesson-1",
      position: 12,
      furthest: 12,
    });
  });

  it("rejects a foreign origin before reading the session", async () => {
    expect((await post(beat, "https://evil.example")).status).toBe(403);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("rejects an anonymous request", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    expect((await post(beat)).status).toBe(401);
  });

  it("rejects a rate-limited request", async () => {
    (withinRateLimit as jest.Mock).mockReturnValueOnce(false);
    expect((await post(beat)).status).toBe(429);
    expect(recordLessonProgress).not.toHaveBeenCalled();
  });

  it("rejects malformed input", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ ...beat, position: -1 })).status).toBe(400);
  });

  it("answers 404 for a lesson the pilot can't reach", async () => {
    (recordLessonProgress as jest.Mock).mockRejectedValue(
      new DomainError("unknownTrainingLesson"),
    );
    expect((await post(beat)).status).toBe(404);
  });

  it("answers 404 without touching anything while training isn't required", async () => {
    process.env.TRAINING_REQUIRED = "false";
    try {
      expect((await post(beat)).status).toBe(404);
    } finally {
      process.env.TRAINING_REQUIRED = "true";
    }
    expect(getSession).not.toHaveBeenCalled();
    expect(recordLessonProgress).not.toHaveBeenCalled();
  });
});
