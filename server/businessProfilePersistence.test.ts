import { describe, expect, it } from "vitest";
import { branches, tenants, users } from "../drizzle/schema";
import { persistTenantBusinessProfile } from "./db";

describe("persistTenantBusinessProfile", () => {
  it("memperbarui data usaha dan alamat cabang tanpa mengubah status onboarding atau trial", async () => {
    const writes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    const tx = {
      update: (table: unknown) => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => { writes.push({ table, values }); },
        }),
      }),
    };

    await persistTenantBusinessProfile(tx, {
      tenantId: 11,
      userId: 22,
      branchId: 33,
      businessName: "Warung Ceria Baru",
      ownerName: "Dina Putri",
      whatsappNumber: "6281234567890",
      address: "Jalan Bahagia 20",
      description: "Jajanan pasar dan minuman",
    });

    expect(writes).toHaveLength(3);
    expect(writes[0]).toEqual({ table: tenants, values: {
      name: "Warung Ceria Baru",
      ownerName: "Dina Putri",
      whatsappNumber: "6281234567890",
      businessAddress: "Jalan Bahagia 20",
      businessDescription: "Jajanan pasar dan minuman",
    } });
    expect(writes[0]?.values).not.toHaveProperty("onboardingStatus");
    expect(writes[0]?.values).not.toHaveProperty("trialEndsAt");
    expect(writes[1]).toEqual({ table: users, values: { name: "Dina Putri" } });
    expect(writes[2]).toEqual({ table: branches, values: { address: "Jalan Bahagia 20" } });
  });
});
