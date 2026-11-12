import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { assertCashierQuota, buildPackageAssignment, resolveReportingBranchId } from "./packagePolicy";

describe("alur paket per usaha dan kredensial kasir", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");
  const bronze = { id: 1, name: "Bronze 1 Bulan", tier: "bronze" as const, durationDays: 30, branchLimit: 2, cashierLimit: 2 };
  const silver = { id: 2, name: "Silver 3 Bulan", tier: "silver" as const, durationDays: 90, branchLimit: 5, cashierLimit: 10 };
  const gold = { id: 3, name: "Gold 12 Bulan", tier: "gold" as const, durationDays: 365, branchLimit: 10, cashierLimit: 25 };

  it("membuat penetapan paket yang terpisah untuk setiap tenant", () => {
    const tenantA = buildPackageAssignment(101, bronze, 1, now);
    const tenantB = buildPackageAssignment(202, gold, 1, now);
    expect(tenantA.subscriptionInsert).toMatchObject({ tenantId: 101, planId: 1, branchLimit: 2, cashierLimit: 2 });
    expect(tenantB.subscriptionInsert).toMatchObject({ tenantId: 202, planId: 3, branchLimit: 10, cashierLimit: 25 });
    expect(tenantA.endsAt).not.toEqual(tenantB.endsAt);
  });

  it.each([[bronze, 2], [silver, 10], [gold, 25]])("menegakkan kuota kasir %s", (plan, limit) => {
    expect(() => assertCashierQuota(limit - 1, plan.cashierLimit, plan.name)).not.toThrow();
    expect(() => assertCashierQuota(limit, plan.cashierLimit, plan.name)).toThrow(`Kuota ${limit} kasir aktif`);
  });

  it("memastikan kata sandi buatan admin dapat digunakan kasir tanpa disimpan terbuka", () => {
    const password = "KasirAman123";
    const passwordHash = hashPassword(password);
    expect(passwordHash).not.toContain(password);
    expect(verifyPassword(password, passwordHash)).toBe(true);
    expect(verifyPassword("kata-sandi-salah", passwordHash)).toBe(false);
  });

  it("mengizinkan Admin Utama memilih semua atau satu cabang dan mengunci Admin Cabang", () => {
    expect(resolveReportingBranchId({ isTenantAdmin: true, assignedBranchId: 10, availableBranchIds: [10, 20], requestedBranchId: null })).toBeNull();
    expect(resolveReportingBranchId({ isTenantAdmin: true, assignedBranchId: 10, availableBranchIds: [10, 20], requestedBranchId: 20 })).toBe(20);
    expect(resolveReportingBranchId({ isTenantAdmin: false, assignedBranchId: 10, availableBranchIds: [10], requestedBranchId: null })).toBe(10);
    expect(() => resolveReportingBranchId({ isTenantAdmin: true, assignedBranchId: 10, availableBranchIds: [10, 20], requestedBranchId: 99 })).toThrow("Cabang filter tidak valid");
  });
});
