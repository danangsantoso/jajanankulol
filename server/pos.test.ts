import { describe, expect, it } from "vitest";
import { calculateChange, calculateCheckout, calculateFinanceSummary, calculateNextStock, requireQrisProof } from "./pos";
import { checkoutSale } from "./db";

describe("perhitungan POS", () => {
  it("menghitung omzet, HPP, dan laba dari keranjang", () => {
    const result = calculateCheckout([
      { quantity: 2, unitPrice: 10000, unitCost: 6000 },
      { quantity: 1, unitPrice: 5000, unitCost: 3000 },
    ]);

    expect(result).toEqual({ subtotal: 25000, cost: 15000, profit: 10000 });
  });

  it("menolak nominal tunai yang kurang dan menghitung kembalian", () => {
    expect(() => calculateChange(10000, 9000)).toThrow("belum mencukupi");
    expect(calculateChange(10000, 15000)).toBe(5000);
  });

  it("menghitung ringkasan laba-rugi dan komposisi pembayaran", () => {
    expect(calculateFinanceSummary(
      [{ total: 10000, paymentMethod: "cash" }, { total: 15000, paymentMethod: "qris" }],
      [{ quantity: 2, unitCost: 6000 }, { quantity: 1, unitCost: 3000 }],
    )).toEqual({ revenue: 25000, cost: 15000, profit: 10000, transactions: 2, paymentBreakdown: { cash: 10000, qris: 15000 } });
  });

  it("menerapkan aturan stok yang dipakai backend", () => {
    expect(calculateNextStock(4, -2)).toBe(2);
    expect(() => calculateNextStock(1, -2)).toThrow("Stok tidak mencukupi");
  });

  it("mewajibkan bukti foto untuk pembayaran QRIS", () => {
    expect(() => requireQrisProof("qris")).toThrow("Unggah foto bukti transfer");
    expect(() => requireQrisProof("qris", "/manus-storage/bukti.jpg")).not.toThrow();
    expect(() => requireQrisProof("cash")).not.toThrow();
  });

  it("menolak checkout QRIS tanpa bukti sebelum mengakses database", async () => {
    await expect(checkoutSale({ cashierId: 1, paymentMethod: "qris", items: [] })).rejects.toThrow("Unggah foto bukti transfer");
  });
});
