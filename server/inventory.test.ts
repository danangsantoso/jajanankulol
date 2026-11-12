import { describe, expect, it } from "vitest";

function nextStock(currentStock: number, delta: number) {
  const next = currentStock + delta;
  if (next < 0) throw new Error("Stok tidak mencukupi.");
  return next;
}

describe("aturan stok", () => {
  it("memperbolehkan penyesuaian stok yang tidak menghasilkan nilai negatif", () => {
    expect(nextStock(8, -3)).toBe(5);
    expect(nextStock(8, 4)).toBe(12);
  });

  it("menolak pengurangan stok yang melebihi persediaan", () => {
    expect(() => nextStock(2, -3)).toThrow("Stok tidak mencukupi");
  });
});
