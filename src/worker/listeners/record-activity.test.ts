import { activity } from "@/lib/activity";
import { recordActivity } from "@/worker/listeners/record-activity";

jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));

const record = activity.record as jest.Mock;

const envelope = (approved: boolean, note: string | null = null) => ({
  id: "event-1",
  event: {
    type: "pilotApplication.decided" as const,
    applicationId: "app-1",
    chapterId: "chapter-muenchen",
    userId: "user-pernille",
    actorUserId: "user-anke",
    approved,
    note,
  },
});

beforeEach(() => jest.clearAllMocks());

describe("recordActivity", () => {
  it("records an approval against subject, actor and chapter", async () => {
    await recordActivity(envelope(true));

    expect(record).toHaveBeenCalledWith({
      userId: "user-pernille",
      actorUserId: "user-anke",
      chapterId: "chapter-muenchen",
      type: "applicationApproved",
    });
  });

  it("records a rejection, with the note when there was one", async () => {
    await recordActivity(envelope(false, "Not this season."));

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "applicationRejected",
        payload: { note: "Not this season." },
      }),
    );
  });
});
