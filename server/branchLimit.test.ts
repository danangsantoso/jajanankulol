import { describe, expect, it } from "vitest";
import { canCreateBranchForPackage, packageBranchLimitMessage } from "./branchLimit";

describe("kuota cabang paket", () => {
  it("mengizinkan cabang sebelum kuota dan menolak saat kuota tercapai", () => {
    expect(canCreateBranchForPackage(1, 2)).toBe(true);
    expect(canCreateBranchForPackage(2, 2)).toBe(false);
    expect(canCreateBranchForPackage(4, 5)).toBe(true);
  });

  it("menyebutkan batas paket pada pesan penolakan", () => {
    expect(packageBranchLimitMessage(10)).toContain("10 cabang aktif");
  });
});
