import { describe, expect, it } from "vitest";
import { canDeactivateMember, resolveInvitationClaim } from "./tenantInvitationLifecycle";

describe("siklus undangan pengguna tenant", () => {
  it("mengklaim undangan kasir hanya saat email login cocok dan menugaskan cabang", () => {
    const result = resolveInvitationClaim({ email: "kasir@usaha.com", status: "pending", role: "cashier", branchId: 12 }, "KASIR@usaha.com");
    expect(result).toEqual({ shouldClaim: true, membershipRole: "cashier", membershipBranchId: 12 });
  });

  it("memberi admin tenant akses lintas cabang saat undangan admin diklaim", () => {
    const result = resolveInvitationClaim({ email: "admin@usaha.com", status: "pending", role: "tenant_admin", branchId: 12 }, "admin@usaha.com");
    expect(result).toEqual({ shouldClaim: true, membershipRole: "tenant_admin", membershipBranchId: null });
  });

  it("menolak klaim yang tidak cocok dan hanya mengizinkan penonaktifan kasir aktif", () => {
    expect(resolveInvitationClaim({ email: "kasir@usaha.com", status: "pending", role: "cashier", branchId: 12 }, "lain@usaha.com").shouldClaim).toBe(false);
    expect(canDeactivateMember({ role: "cashier", status: "active" })).toBe(true);
    expect(canDeactivateMember({ role: "tenant_admin", status: "active" })).toBe(false);
    expect(canDeactivateMember({ role: "cashier", status: "inactive" })).toBe(false);
  });
});
