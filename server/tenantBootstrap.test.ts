import { describe, expect, it } from "vitest";
import { initialTenantMembershipRole, shouldCreateInitialTenant } from "./tenantBootstrap";

describe("bootstrap tenant pengguna baru", () => {
  it("membuat tenant pertama untuk akun Google non-owner sebagai Admin Utama", () => {
    expect(shouldCreateInitialTenant(false, false)).toBe(true);
    expect(initialTenantMembershipRole()).toBe("tenant_admin");
  });

  it("tidak membuat tenant baru saat login ulang sudah memiliki membership aktif", () => {
    expect(shouldCreateInitialTenant(false, true)).toBe(false);
  });

  it("tidak membuat tenant operasional untuk pemilik platform", () => {
    expect(shouldCreateInitialTenant(true, false)).toBe(false);
  });
});
