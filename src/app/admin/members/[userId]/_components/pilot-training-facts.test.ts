import {
  courseAction,
  familyExemption,
  panelCourses,
} from "./pilot-training-facts";

describe("panelCourses", () => {
  it("lists each family once, in the order the chapters name them", () => {
    expect(
      panelCourses([
        { courses: [{ familyId: "basics", from: "ber" }] },
        {
          courses: [
            { familyId: "basics", from: "muc" },
            { familyId: "safety", from: "muc" },
          ],
        },
      ]),
    ).toEqual([
      { familyId: "basics", from: "ber" },
      { familyId: "safety", from: "muc" },
    ]);
  });
});

describe("familyExemption", () => {
  it("finds the per-course exemption and ignores the blanket one", () => {
    const rows = [{ familyId: null }, { familyId: "basics" }];
    expect(familyExemption(rows, "basics")).toBe(rows[1]);
    expect(familyExemption(rows, "safety")).toBeNull();
  });
});

describe("courseAction", () => {
  it("offers to revoke a per-course exemption", () => {
    expect(courseAction("exempt", true, false)).toBe("revoke");
    expect(courseAction("passed", true, true)).toBe("revoke");
  });

  it("offers nothing once the course is passed", () => {
    expect(courseAction("passed", false, false)).toBeNull();
  });

  it("points to the blanket exemption instead of a button", () => {
    expect(courseAction("exempt", false, true)).toBe("covered");
  });

  it("offers an exemption for an open course", () => {
    expect(courseAction("inProgress", false, false)).toBe("exempt");
    expect(courseAction("notStarted", false, false)).toBe("exempt");
  });
});
