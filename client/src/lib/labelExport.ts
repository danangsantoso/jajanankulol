export type LabelProduct = { id: number; name: string; qrCode: string; salePrice: string };
export type LabelCopy<T extends LabelProduct> = T & { copyIndex: number };

export function buildLabelCopies<T extends LabelProduct>(products: T[], copies: Record<number, number>): LabelCopy<T>[] {
  return products.flatMap(product => Array.from({ length: Math.max(1, Math.min(99, copies[product.id] ?? 1)) }, (_, index) => ({ ...product, copyIndex: index + 1 })));
}

export function getLabelExportFilename(extension: "jpg" | "pdf") {
  return `label-qr-jajananku-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function getPdfSliceHeights(canvasWidth: number, canvasHeight: number, pageWidthMm = 210, pageHeightMm = 297, marginMm = 8) {
  const usableWidth = pageWidthMm - marginMm * 2;
  const usableHeight = pageHeightMm - marginMm * 2;
  const pixelsPerMm = canvasWidth / usableWidth;
  const sliceHeight = Math.max(1, Math.floor(usableHeight * pixelsPerMm));
  const slices: Array<{ y: number; height: number }> = [];
  for (let y = 0; y < canvasHeight; y += sliceHeight) slices.push({ y, height: Math.min(sliceHeight, canvasHeight - y) });
  return slices;
}
