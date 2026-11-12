import { describe, expect, it, vi } from "vitest";
import { branches, tenants, users } from "../drizzle/schema";
import { persistTenantOnboarding } from "./db";

describe("persistTenantOnboarding", () => {
  it("menyimpan data toko, status complete, pemilik, dan alamat cabang dalam satu runner transaksi", async () => {
    const writes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    const tx = {
      update: (table: unknown) => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => { writes.push({ table, values }); },
        }),
      }),
    };
    await persistTenantOnboarding(tx, { tenantId: 11, userId: 22, branchId: 33, businessName: "Warung Ceria", ownerName: "Dina Putri", whatsappNumber: "6281234567890", address: "Jalan Bahagia 10", description: "Jajanan pasar" });
    expect(writes).toHaveLength(3);
    expect(writes[0]).toMatchObject({ table: tenants, values: { name: "Warung Ceria", ownerName: "Dina Putri", whatsappNumber: "6281234567890", businessAddress: "Jalan Bahagia 10", businessDescription: "Jajanan pasar", onboardingStatus: "complete" } });
    expect(writes[0]?.values.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(writes[1]).toEqual({ table: users, values: { name: "Dina Putri" } });
    expect(writes[2]).toEqual({ table: branches, values: { address: "Jalan Bahagia 10" } });
  });
});
