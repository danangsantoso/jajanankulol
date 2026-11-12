import { describe, expect, it } from "vitest";
import { buildLabelCopies, getPdfSliceHeights } from "./labelExport";

describe("ekspor label QR", () => {
  const products = [{ id: 1, name: "Keripik", qrCode: "JJN-1", salePrice: "10000" }, { id: 2, name: "Es Teh", qrCode: "JJN-2", salePrice: "5000" }];
  it("membuat salinan label sesuai jumlah yang dipilih", () => {
    const copies = buildLabelCopies(products, { 1: 2, 2: 3 });
    expect(copies).toHaveLength(5);
    expect(copies.filter(item => item.id === 2).map(item => item.copyIndex)).toEqual([1, 2, 3]);
  });
  it("membagi kanvas panjang menjadi potongan PDF berurutan", () => {
    const slices = getPdfSliceHeights(1000, 4000);
    expect(slices.length).toBeGreaterThan(1);
    expect(slices[0]?.y).toBe(0);
    expect(slices.at(-1)?.y! + slices.at(-1)?.height).toBe(4000);
  });
});
