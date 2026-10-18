import { prefersReducedMotion } from "@/lib/motion";

const withWindow = (osReduce: boolean, motion?: string) => {
  Object.assign(globalThis, {
    window: { matchMedia: () => ({ matches: osReduce }) },
    document: { documentElement: { dataset: motion ? { motion } : {} } },
  });
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

it("stills the app when the phone asks for it", () => {
  withWindow(true);
  expect(prefersReducedMotion()).toBe(true);
});

it("stills the app when the profile asks for it, whatever the phone says", () => {
  withWindow(false, "reduce");
  expect(prefersReducedMotion()).toBe(true);
});

it("lets things move when neither asks", () => {
  withWindow(false);
  expect(prefersReducedMotion()).toBe(false);
});

it("moves nothing on the server", () => {
  expect(prefersReducedMotion()).toBe(false);
});
