import { describe, expect, it } from "vitest";
import { resolveProductBranchId, type TenantScope } from "./db";

function createScope(overrides: Partial<TenantScope> = {}) {
  return {
    tenantId: 1,
    tenantName: "Usaha Uji",
    branchId: 10,
    branchName: "Cabang Pusat",
    membershipRole: "tenant_admin",
    isTenantAdmin: true,
    isBranchAdmin: false,
    onboardingStatus: "complete",
    branches: [{ id: 10, name: "Cabang Pusat", code: "PUSAT", address: null, status: "active" }, { id: 11, name: "Cabang Mall", code: "MALL", address: null, status: "active" }],
    subscription: { allowed: true, message: null, state: "active", planId: 1, planName: "Gold", tier: "gold", branchLimit: 10, cashierLimit: 25, activeBranches: 2, activeCashiers: 0 },
    ...overrides,
  } as TenantScope;
}

describe("pemilihan cabang produk", () => {
  it("mengizinkan Admin Utama memilih cabang aktif lain yang berada di tenant yang sama", () => {
    expect(resolveProductBranchId(createScope(), 11)).toBe(11);
  });

  it("mengunci Admin Cabang ke cabangnya walaupun input membawa cabang lain", () => {
    const scope = createScope({ membershipRole: "branch_admin", isTenantAdmin: false, isBranchAdmin: true, branches: [{ id: 10, name: "Cabang Pusat", code: "PUSAT", address: null, status: "active" }] });
    expect(resolveProductBranchId(scope, 11)).toBe(10);
  });

  it("menolak cabang yang tidak tersedia di tenant", () => {
    expect(() => resolveProductBranchId(createScope(), 99)).toThrow("Cabang produk tidak valid");
  });
});
