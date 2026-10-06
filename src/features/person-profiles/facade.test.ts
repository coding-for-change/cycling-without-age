import { commitUpload, deleteObject } from "@/lib/storage";
import { DomainError } from "@/lib/domain-error";
import * as services from "./services/profiles";
import {
  EMPTY_PROFILE,
  ageOn,
  getProfile,
  revokePilotStep,
  setAccessibility,
  setPhoto,
  setPilotStep,
  toPublicProfile,
  transferPassengerProfileToUser,
  updateProfile,
  withdrawHealthConsent,
} from "./facade";

jest.mock("@/lib/storage", () => ({
  commitUpload: jest.fn(),
  deleteObject: jest.fn(async () => {}),
  requestUpload: jest.fn(),
}));
jest.mock("./services/profiles", () => ({
  findProfileBySubject: jest.fn(),
  findProfilesBySubjects: jest.fn(),
  upsertProfile: jest.fn(),
  findPhotoOwner: jest.fn(),
  findStoredFileKey: jest.fn(),
  deleteStoredFile: jest.fn(),
  findPhotoFilesOf: jest.fn(),
  deleteStoredFiles: jest.fn(),
  deleteProfileOfPassenger: jest.fn(),
  moveProfileToUser: jest.fn(),
  findPilotSteps: jest.fn(),
  upsertPilotStep: jest.fn(),
  deletePilotStep: jest.fn(),
  clearPilotStepConfirmation: jest.fn(),
}));

const db = services as unknown as Record<keyof typeof services, jest.Mock>;
const GRETA = { kind: "passenger" as const, id: "managed-greta" };
const KARL = { kind: "user" as const, id: "rider-karl" };

const row = (extra: object = {}) => ({
  id: "profile-1",
  userId: null,
  passengerId: "managed-greta",
  photoFileId: null,
  photoAgreedByUserId: null,
  bio: null,
  interests: null,
  customInterests: null,
  prompts: null,
  hideAge: false,
  accessibilityTags: null,
  accessibilityNone: false,
  healthConsentAt: null,
  healthConsentByUserId: null,
  setupDismissedAt: null,
  updatedAt: new Date(),
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.upsertProfile.mockImplementation(async () => row());
});

describe("health details", () => {
  it("refuses accessibility tags before consent", async () => {
    db.findProfileBySubject.mockResolvedValue(row());
    await expect(
      setAccessibility(GRETA, { none: false, tags: ["wheelchair"] }),
    ).rejects.toEqual(new DomainError("healthConsentRequired"));
    expect(db.upsertProfile).not.toHaveBeenCalled();
  });

  it("stores tags once consent exists", async () => {
    db.findProfileBySubject.mockResolvedValue(
      row({ healthConsentAt: new Date() }),
    );
    await setAccessibility(GRETA, { none: false, tags: ["hearing"] });
    expect(db.upsertProfile).toHaveBeenCalledWith(GRETA, {
      accessibilityTags: ["hearing"],
      accessibilityNone: false,
    });
  });

  it("allows 'nothing needed' without consent, since it says nothing about health", async () => {
    await setAccessibility(GRETA, { none: true });
    expect(db.upsertProfile).toHaveBeenCalledWith(GRETA, {
      accessibilityTags: [],
      accessibilityNone: true,
    });
  });

  it("deletes the tags in the same write that withdraws consent", async () => {
    await withdrawHealthConsent(GRETA);
    expect(db.upsertProfile).toHaveBeenCalledWith(GRETA, {
      healthConsentAt: null,
      healthConsentByUserId: null,
      accessibilityTags: [],
      accessibilityNone: false,
    });
  });

  it("never reads tags back without consent", async () => {
    db.findProfileBySubject.mockResolvedValue(
      row({ accessibilityTags: ["memory"] }),
    );
    expect((await getProfile(GRETA)).accessibilityTags).toEqual([]);
  });
});

describe("toPublicProfile", () => {
  const birth = new Date("1940-06-15");

  it("shows the age, never the birthday", () => {
    const shown = toPublicProfile(EMPTY_PROFILE, birth, new Date("2026-06-14"));
    expect(shown.age).toBe(85);
    expect(JSON.stringify(shown)).not.toContain("1940");
  });

  it("hides the age on request", () => {
    expect(
      toPublicProfile({ ...EMPTY_PROFILE, hideAge: true }, birth).age,
    ).toBeNull();
  });

  it("counts the birthday itself", () => {
    expect(ageOn(birth, new Date("2026-06-15"))).toBe(86);
  });
});

describe("updateProfile", () => {
  it("rejects interests outside the curated list", async () => {
    await expect(
      updateProfile(KARL, { interests: ["skydiving" as never] }),
    ).rejects.toThrow();
  });

  it("clears an emptied bio", async () => {
    await updateProfile(KARL, { bio: "   " });
    expect(db.upsertProfile).toHaveBeenCalledWith(KARL, { bio: null });
  });
});

describe("setPhoto", () => {
  it("replaces the old photo and deletes its object", async () => {
    (commitUpload as jest.Mock).mockResolvedValue({
      id: "file-new",
      mime: "image/webp",
    });
    db.findProfileBySubject.mockResolvedValue(row({ photoFileId: "file-old" }));
    db.findStoredFileKey.mockResolvedValue({
      key: "files/profilePhoto/old.webp",
    });

    const id = await setPhoto(GRETA, {
      uploaderUserId: "daughter-lena",
      stagingKey: "staging/daughter-lena/profilePhoto/x",
      agreedByUserId: "daughter-lena",
    });

    expect(id).toBe("file-new");
    expect(db.upsertProfile).toHaveBeenCalledWith(
      GRETA,
      expect.objectContaining({
        photoFileId: "file-new",
        photoAgreedByUserId: "daughter-lena",
      }),
    );
    expect(db.deleteStoredFile).toHaveBeenCalledWith("file-old");
    expect(deleteObject).toHaveBeenCalledWith("files/profilePhoto/old.webp");
  });

  it("rejects an upload the storage layer would not accept", async () => {
    (commitUpload as jest.Mock).mockRejectedValue(
      new DomainError("uploadRejected"),
    );
    await expect(
      setPhoto(GRETA, {
        uploaderUserId: "daughter-lena",
        stagingKey: "staging/someone-else/profilePhoto/x",
        agreedByUserId: "daughter-lena",
      }),
    ).rejects.toEqual(new DomainError("uploadRejected"));
    expect(db.upsertProfile).not.toHaveBeenCalled();
  });
});

describe("transferPassengerProfileToUser", () => {
  it("moves the managed profile onto the new account", async () => {
    db.findProfileBySubject.mockImplementation(async (subject) =>
      subject.kind === "passenger" ? row() : null,
    );
    await transferPassengerProfileToUser("managed-greta", "greta");
    expect(db.moveProfileToUser).toHaveBeenCalledWith("managed-greta", "greta");
  });

  it("keeps the account's own profile and drops the managed one", async () => {
    db.findProfileBySubject.mockImplementation(async (subject) =>
      subject.kind === "passenger"
        ? row({ photoFileId: "file-managed" })
        : row({ userId: "greta", passengerId: null }),
    );
    db.findStoredFileKey.mockResolvedValue({ key: "files/x.webp" });
    await transferPassengerProfileToUser("managed-greta", "greta");
    expect(db.moveProfileToUser).not.toHaveBeenCalled();
    expect(db.deleteProfileOfPassenger).toHaveBeenCalledWith("managed-greta");
    expect(deleteObject).toHaveBeenCalledWith("files/x.webp");
  });
});

describe("pilot steps", () => {
  const PILOT = "pilot-jens";

  it("lets the pilot untick a step the chapter has not confirmed", async () => {
    db.findPilotSteps.mockResolvedValue([
      { step: "workshop", tickedAt: new Date(), confirmedAt: null },
    ]);
    await setPilotStep(PILOT, "workshop", false);
    expect(db.deletePilotStep).toHaveBeenCalledWith(PILOT, "workshop");
  });

  it("keeps a confirmed step when the pilot unticks it", async () => {
    db.findPilotSteps.mockResolvedValue([
      { step: "workshop", tickedAt: new Date(), confirmedAt: new Date() },
    ]);
    await expect(setPilotStep(PILOT, "workshop", false)).rejects.toEqual(
      new DomainError("pilotStepConfirmed"),
    );
    expect(db.deletePilotStep).not.toHaveBeenCalled();
  });

  it("revokes only the confirmation and keeps the pilot's tick", async () => {
    await revokePilotStep(PILOT, "trainingVideos");
    expect(db.clearPilotStepConfirmation).toHaveBeenCalledWith(
      PILOT,
      "trainingVideos",
    );
    expect(db.deletePilotStep).not.toHaveBeenCalled();
  });
});
