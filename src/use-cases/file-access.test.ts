import { fleet } from "@/features/fleet";
import { personProfiles } from "@/features/person-profiles";
import { rides } from "@/features/rides";
import { fileKindOf } from "@/lib/storage";
import { readableFile } from "./file-access";
import { accessPerson } from "./person-access";

jest.mock("@/features/fleet", () => ({ fleet: { fileReadRule: jest.fn() } }));
jest.mock("@/features/rides", () => ({ rides: { photoReadRule: jest.fn() } }));
jest.mock("@/lib/storage", () => ({ fileKindOf: jest.fn() }));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { findPhoto: jest.fn() },
}));
jest.mock("@/lib/auth-guards", () => ({
  canReadFile: (_session: unknown, rule: { kind: string }) =>
    rule.kind === "anyone",
}));
jest.mock("./person-access", () => ({ accessPerson: jest.fn() }));

const viewer = {
  user: { id: "rider-karl" },
  access: { role: null, countryAdminOf: [], memberships: [] },
};
const photo = {
  id: "file-1",
  key: "files/profilePhoto/1.webp",
  mime: "image/webp",
};

beforeEach(() => jest.clearAllMocks());

describe("readableFile", () => {
  it("serves a profile photo only to someone who may see the person", async () => {
    (personProfiles.findPhoto as jest.Mock).mockResolvedValue({
      subject: { kind: "passenger", id: "managed-greta" },
      file: photo,
    });
    (accessPerson as jest.Mock).mockResolvedValue(null);
    expect(await readableFile(viewer, "file-1")).toBeNull();

    (accessPerson as jest.Mock).mockResolvedValue({ relation: "peer" });
    expect(await readableFile(viewer, "file-1")).toEqual(photo);
    expect(fleet.fileReadRule).not.toHaveBeenCalled();
  });

  it("leaves fleet files to the fleet rules", async () => {
    (personProfiles.findPhoto as jest.Mock).mockResolvedValue(null);
    (fileKindOf as jest.Mock).mockResolvedValue("trishawPhoto");
    (fleet.fileReadRule as jest.Mock).mockResolvedValue({
      file: photo,
      rule: { kind: "anyone" },
    });
    expect(await readableFile(viewer, "file-1")).toEqual(photo);
  });

  it("leaves ride photos to the ride rules", async () => {
    (personProfiles.findPhoto as jest.Mock).mockResolvedValue(null);
    (fileKindOf as jest.Mock).mockResolvedValue("ridePhoto");
    (rides.photoReadRule as jest.Mock).mockResolvedValue({
      file: photo,
      rule: { kind: "members" },
    });
    expect(await readableFile(viewer, "file-1")).toBeNull();
    expect(fleet.fileReadRule).not.toHaveBeenCalled();
  });

  it("returns nothing for an unknown file", async () => {
    (personProfiles.findPhoto as jest.Mock).mockResolvedValue(null);
    (fileKindOf as jest.Mock).mockResolvedValue(null);
    expect(await readableFile(viewer, "nope")).toBeNull();
    expect(fleet.fileReadRule).not.toHaveBeenCalled();
  });
});
