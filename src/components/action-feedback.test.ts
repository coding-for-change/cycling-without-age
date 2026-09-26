import { toast } from "sonner";
import { reportSave } from "./action-feedback";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/native/haptics", () => ({
  haptics: { success: jest.fn(), error: jest.fn() },
}));

const labels = {
  saved: "Saved",
  undo: "Undo",
  undone: "Undone",
  errors: { generic: "Something went wrong" },
};
const report = jest.fn();
const success = toast.success as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("reportSave", () => {
  it("offers Undo after an ordinary save", () => {
    const undo = jest.fn();
    reportSave({ ok: true }, { report, labels, undo });
    expect(success).toHaveBeenCalledWith("Saved", {
      action: { label: "Undo", onClick: undo },
    });
  });

  it("says Saved without Undo when the save cannot be undone", () => {
    reportSave({ ok: true }, { report, labels });
    expect(success).toHaveBeenCalledWith("Saved", { action: undefined });
  });

  it("says Undone after the undo itself", () => {
    reportSave({ ok: true }, { report, labels, undoing: true });
    expect(success).toHaveBeenCalledWith("Undone", { action: undefined });
  });
});
