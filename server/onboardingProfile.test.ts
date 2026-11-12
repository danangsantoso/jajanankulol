import { describe, expect, it } from "vitest";
import { buildOnboardingTenantUpdate, getPostOnboardingPath } from "./onboardingProfile";

describe("profil onboarding tenant", () => {
  it("membangun data tenant lengkap dengan status selesai dan waktu penyimpanan", () => {
    const completedAt = new Date("2026-08-26T01:15:00.000Z");
    expect(buildOnboardingTenantUpdate({ businessName: " Warung Ceria ", ownerName: " Dina Putri ", whatsappNumber: "6281234567890", address: " Jalan Bahagia 10 ", description: " Jajanan pasar " }, completedAt)).toEqual({ name: "Warung Ceria", ownerName: "Dina Putri", whatsappNumber: "6281234567890", businessAddress: "Jalan Bahagia 10", businessDescription: "Jajanan pasar", onboardingStatus: "complete", onboardingCompletedAt: completedAt });
  });

  it("mengarahkan akun pending ke onboarding dan akun lengkap ke dashboard", () => {
    expect(getPostOnboardingPath(false)).toBe("/onboarding");
    expect(getPostOnboardingPath(true)).toBe("/dashboard");
  });
});
