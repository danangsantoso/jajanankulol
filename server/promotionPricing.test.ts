import { describe, expect, it } from "vitest";
import { calculatePromotionPricing } from "./promotionPricing";

describe("perhitungan promo POS", () => {
  const cart = [{ productId: 1, quantity: 2, unitPrice: 10000 }, { productId: 2, quantity: 1, unitPrice: 8000 }];

  it("menerapkan diskon persentase hanya pada produk yang ditetapkan", () => {
    const result = calculatePromotionPricing(cart, [{ id: 1, name: "Diskon roti", type: "discount", discountType: "percentage", discountValue: 10, bundlePrice: null, items: [{ productId: 1, quantity: 1 }] }]);
    expect(result).toMatchObject({ subtotal: 28000, discountTotal: 2000, total: 26000 });
    expect(result.applied[0]?.name).toBe("Diskon roti");
  });

  it("menerapkan bundle pada set lengkap dan menyisakan unit lain pada harga normal", () => {
    const result = calculatePromotionPricing(cart, [{ id: 2, name: "Paket hemat", type: "bundle", discountType: null, discountValue: null, bundlePrice: 15000, items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }] }]);
    expect(result).toMatchObject({ subtotal: 28000, discountTotal: 3000, total: 25000 });
  });

  it("memilih bundle dengan penghematan lebih tinggi terlebih dahulu", () => {
    const result = calculatePromotionPricing(cart, [
      { id: 1, name: "Paket kecil", type: "bundle", discountType: null, discountValue: null, bundlePrice: 16000, items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }] },
      { id: 2, name: "Paket hemat", type: "bundle", discountType: null, discountValue: null, bundlePrice: 14000, items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }] },
    ]);
    expect(result.applied).toEqual([{ promotionId: 2, name: "Paket hemat", amount: 4000 }]);
  });
});
