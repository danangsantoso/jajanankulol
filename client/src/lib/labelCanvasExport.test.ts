import { describe, expect, it } from "vitest";
import { getLabelPageCapacity, splitLabelsIntoPages } from "./labelCanvasExport";

const labels = Array.from({ length: 33 }, (_, index) => ({ id: index + 1, name: `Produk ${index + 1}`, qrCode: `JJN-${index + 1}`, salePrice: "10000", copyIndex: 1 }));

describe("generator kanvas label", () => {
  it("menentukan kapasitas A4 sesuai preset ukuran", () => {
    expect(getLabelPageCapacity("compact")).toBe(32);
    expect(getLabelPageCapacity("standard")).toBe(21);
    expect(getLabelPageCapacity("large")).toBe(12);
    expect(getLabelPageCapacity("wide")).toBe(5);
  });

  it("memisahkan seluruh label ke halaman A4 tanpa melewatkan label", () => {
    const pages = splitLabelsIntoPages(labels, "standard");
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(21);
    expect(pages[1]).toHaveLength(12);
    expect(pages.flat().map(label => label.id)).toEqual(labels.map(label => label.id));
  });
});
