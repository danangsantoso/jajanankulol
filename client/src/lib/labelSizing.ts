export const labelSizePresets = [
  { id: "compact", name: "Mini", dimensions: "40 × 30 mm", widthMm: 40, heightMm: 30, columns: 4, qrColumnMm: 16, qrSizeMm: 14, nameFontPt: 5.6, priceFontPt: 6.8, codeFontPt: 3.7, nameLines: 4, description: "Hemat ruang untuk label produk kecil." },
  { id: "standard", name: "Standar", dimensions: "58 × 34 mm", widthMm: 58, heightMm: 34, columns: 3, qrColumnMm: 25, qrSizeMm: 22, nameFontPt: 7.7, priceFontPt: 8.5, codeFontPt: 4.6, nameLines: 3, description: "Seimbang untuk sebagian besar kemasan jajanan." },
  { id: "large", name: "Besar", dimensions: "70 × 40 mm", widthMm: 70, heightMm: 40, columns: 2, qrColumnMm: 30, qrSizeMm: 27, nameFontPt: 9, priceFontPt: 10, codeFontPt: 5.2, nameLines: 3, description: "Teks dan QR lebih mudah dibaca." },
  { id: "wide", name: "Lebar", dimensions: "100 × 50 mm", widthMm: 100, heightMm: 50, columns: 1, qrColumnMm: 42, qrSizeMm: 38, nameFontPt: 11, priceFontPt: 12, codeFontPt: 6.5, nameLines: 3, description: "Cocok untuk kemasan atau rak berukuran besar." },
] as const;

export type LabelSize = (typeof labelSizePresets)[number]["id"];

export const defaultLabelSize: LabelSize = "standard";

export function getLabelSizePreset(size: LabelSize) {
  return labelSizePresets.find(preset => preset.id === size) ?? labelSizePresets[1];
}
