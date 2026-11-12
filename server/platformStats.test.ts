import { describe, expect, it } from "vitest";
import { summarizePlatformStats } from "./platformStats";

describe("ringkasan statistik platform", () => {
  it("menghitung tenant dan pengguna aktif beserta distribusi role tanpa menduplikasi anggota", () => {
    expect(summarizePlatformStats({
      tenants: [{ status: "active", subscriptionStatus: "trial" }, { status: "active", subscriptionStatus: "active" }, { status: "suspended", subscriptionStatus: "suspended" }],
      users: [{ id: 1, status: "active", role: "superadmin" }, { id: 2, status: "active", role: "admin" }, { id: 3, status: "active", role: "admin" }, { id: 4, status: "inactive", role: "cashier" }],
      memberships: [{ userId: 2, status: "active", role: "tenant_admin" }, { userId: 2, status: "active", role: "tenant_admin" }, { userId: 3, status: "active", role: "branch_admin" }, { userId: 4, status: "inactive", role: "cashier" }],
    })).toEqual({
      tenants: { total: 3, active: 2, trial: 1, suspended: 1 },
      users: { total: 4, active: 3, superadmin: 1, adminUtama: 1, adminCabang: 1, kasir: 0 },
    });
  });
});
