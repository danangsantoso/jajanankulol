import { describe, expect, it } from "vitest";
import { DEFAULT_PACKAGE_CATALOG } from "./packageCatalog";

describe("katalog paket Jajananku", () => {
  it("menetapkan Bronze 1 bulan sebagai paket termurah dengan harga acuan pengguna", () => {
    const bronze = DEFAULT_PACKAGE_CATALOG.find(plan => plan.tier === "bronze" && plan.durationDays === 30);
    expect(bronze).toMatchObject({ name: "Bronze 1 Bulan", branchLimit: 2, cashierLimit: 2, regularPrice: 357000, salePrice: 257000, availability: "available" });
  });

  it("menaikkan kuota sesuai level Silver dan Gold", () => {
    expect(DEFAULT_PACKAGE_CATALOG.find(plan => plan.tier === "silver" && plan.durationDays === 30)).toMatchObject({ branchLimit: 5, cashierLimit: 10 });
    expect(DEFAULT_PACKAGE_CATALOG.find(plan => plan.tier === "gold" && plan.durationDays === 30)).toMatchObject({ branchLimit: 10, cashierLimit: 25 });
  });

  it("menyediakan durasi 1, 3, 6, dan 12 bulan serta Platinum coming soon", () => {
    for (const tier of ["bronze", "silver", "gold"] as const) expect(DEFAULT_PACKAGE_CATALOG.filter(plan => plan.tier === tier).map(plan => plan.durationDays)).toEqual([30, 90, 180, 365]);
    expect(DEFAULT_PACKAGE_CATALOG.find(plan => plan.tier === "platinum")).toMatchObject({ availability: "coming_soon" });
  });
});
