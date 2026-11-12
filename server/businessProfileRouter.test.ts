import { describe, expect, it, vi } from "vitest";

const { getTenantScope, getOnboardingProfile, updateTenantBusinessProfile } = vi.hoisted(() => ({
  getTenantScope: vi.fn(),
  getOnboardingProfile: vi.fn(),
  updateTenantBusinessProfile: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getTenantScope,
  getOnboardingProfile,
  updateTenantBusinessProfile,
}));

import { appRouter } from "./routers";

const cashierScope = {
  tenantId: 7,
  tenantName: "Warung Ceria",
  branchId: 9,
  branchName: "Cabang Utama",
  membershipRole: "cashier" as const,
  isTenantAdmin: false,
  onboardingStatus: "complete" as const,
  branches: [],
  subscription: { allowed: true, state: "trial" as const, daysRemaining: 2 },
};

describe("businessProfile router", () => {
  it("menolak kasir ketika membaca atau memperbarui profil usaha", async () => {
    getTenantScope.mockResolvedValue(cashierScope);
    const caller = appRouter.createCaller({ user: { id: 22, role: "admin" } } as any);
    const input = { businessName: "Warung Ceria", ownerName: "Dina Putri", whatsappNumber: "6281234567890", address: "Jalan Bahagia 10", description: null };

    await expect(caller.businessProfile.get()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.businessProfile.update(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getOnboardingProfile).not.toHaveBeenCalled();
    expect(updateTenantBusinessProfile).not.toHaveBeenCalled();
  });
});
