import en from "@/messages/app/en.json";
import { deletionConsequences } from "./deletion-consequences";

describe("deletionConsequences", () => {
  it("lists what goes with the record, in order, skipping empty counts", () => {
    expect(
      deletionConsequences(
        {
          chapters: 2,
          members: 0,
          trishaws: 1,
          locations: 3,
          models: undefined,
        },
        en.admin.deletion,
        "en",
      ),
    ).toEqual(["2 chapters", "1 trishaw", "3 storage locations"]);
  });

  it("says nothing when nothing else is deleted", () => {
    expect(
      deletionConsequences({ trishaws: 0 }, en.admin.deletion, "en"),
    ).toEqual([]);
  });
});
