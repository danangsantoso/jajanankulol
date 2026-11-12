import { describe, expect, it } from "vitest";
import { defaultLabelSize, getLabelSizePreset, labelSizePresets } from "./labelSizing";

describe("preset ukuran label", () => {
  it("menyediakan empat ukuran label dengan dimensi dan jumlah kolom berbeda", () => {
    expect(labelSizePresets.map(preset => preset.id)).toEqual(["compact", "standard", "large", "wide"]);
    expect(getLabelSizePreset("compact")).toMatchObject({ dimensions: "40 × 30 mm", columns: 4 });
    expect(getLabelSizePreset("standard")).toMatchObject({ dimensions: "58 × 34 mm", columns: 3 });
    expect(getLabelSizePreset("large")).toMatchObject({ dimensions: "70 × 40 mm", columns: 2 });
    expect(getLabelSizePreset("wide")).toMatchObject({ dimensions: "100 × 50 mm", columns: 1 });
  });

  it("menetapkan ukuran standar sebagai pilihan awal", () => {
    expect(defaultLabelSize).toBe("standard");
  });
});
