import { describe, expect, it } from "vitest";
import { canAccessBranch, resolvePermittedBranchIds } from "./tenantAccess";

describe("akses cabang tenant", () => {
  const branches = [10, 20, 30];

  it("memberi admin tenant akses ke semua cabang aktif tenant", () => {
    expect(resolvePermittedBranchIds("tenant_admin", null, branches)).toEqual(branches);
    expect(canAccessBranch("tenant_admin", null, branches, 30)).toBe(true);
  });

  it("membatasi kasir hanya ke cabang yang ditugaskan", () => {
    expect(resolvePermittedBranchIds("cashier", 20, branches)).toEqual([20]);
    expect(canAccessBranch("cashier", 20, branches, 20)).toBe(true);
    expect(canAccessBranch("cashier", 20, branches, 10)).toBe(false);
  });

  it("membatasi admin cabang pada cabang penugasannya", () => {
    expect(resolvePermittedBranchIds("branch_admin", 20, branches)).toEqual([20]);
    expect(canAccessBranch("branch_admin", 20, branches, 20)).toBe(true);
    expect(canAccessBranch("branch_admin", 20, branches, 10)).toBe(false);
  });

  it("menolak cabang yang tidak aktif atau tidak ada pada tenant", () => {
    expect(resolvePermittedBranchIds("cashier", 99, branches)).toEqual([]);
    expect(canAccessBranch("cashier", 99, branches, 99)).toBe(false);
  });
});
