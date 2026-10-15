import { prisma } from "@/lib/prisma";
import { findPassengersOfAccount } from "./passengers";

jest.mock("@/lib/prisma", () => ({
  prisma: { passenger: { findMany: jest.fn().mockResolvedValue([]) } },
}));

// A resident whose carer books for them still has rides of their own to see.
it("reads the riders an account manages and its own rider row", async () => {
  await findPassengersOfAccount("user-erna");
  expect(
    (prisma.passenger.findMany as jest.Mock).mock.calls[0][0].where,
  ).toEqual({
    OR: [{ managedByUserId: "user-erna" }, { userId: "user-erna" }],
  });
});
