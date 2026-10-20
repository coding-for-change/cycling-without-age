import { training } from "@/features/training";
import { activity } from "@/lib/activity";
import {
  recordCoursePassed,
  recordExemptionGranted,
  recordExemptionRevoked,
} from "./training";

jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));
jest.mock("@/features/training", () => ({
  training: {
    getCourse: jest.fn(async () => ({ title: "Grundkurs" })),
    familyTitles: jest.fn(async () => new Map([["family-1", "Grundkurs"]])),
  },
}));

const record = activity.record as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("writes the pass into the pilot's history with the course title", async () => {
  await recordCoursePassed({
    id: "event-1",
    event: {
      type: "training.coursePassed",
      userId: "pilot-1",
      courseId: "course-1",
      familyId: "family-1",
      attemptId: "attempt-1",
      chapterId: "chapter-berlin",
      actorUserId: "pilot-1",
    },
  });
  expect(training.getCourse).toHaveBeenCalledWith("course-1");
  expect(record).toHaveBeenCalledWith({
    userId: "pilot-1",
    actorUserId: "pilot-1",
    chapterId: "chapter-berlin",
    type: "trainingPassed",
    payload: { name: "Grundkurs" },
  });
});

it("records a blanket exemption granted by the system without an actor", async () => {
  await recordExemptionGranted({
    id: "event-2",
    event: {
      type: "training.exemptionGranted",
      userId: "pilot-1",
      familyId: null,
      reason: "migration",
      chapterId: null,
      actorUserId: null,
    },
  });
  expect(record).toHaveBeenCalledWith({
    userId: "pilot-1",
    type: "trainingExemptionGranted",
    payload: { scope: "all", name: "", reason: "migration" },
  });
});

it("names the course when a single exemption is taken back", async () => {
  await recordExemptionRevoked({
    id: "event-3",
    event: {
      type: "training.exemptionRevoked",
      userId: "pilot-1",
      familyId: "family-1",
      chapterId: "chapter-berlin",
      actorUserId: "admin-1",
    },
  });
  expect(record).toHaveBeenCalledWith({
    userId: "pilot-1",
    actorUserId: "admin-1",
    chapterId: "chapter-berlin",
    type: "trainingExemptionRevoked",
    payload: { scope: "course", name: "Grundkurs" },
  });
});
