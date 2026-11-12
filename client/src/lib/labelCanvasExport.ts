import type { LabelCopy } from "@/lib/labelExport";
import { getLabelSizePreset, type LabelSize } from "@/lib/labelSizing";

type CanvasLabel = LabelCopy<{ id: number; name: string; qrCode: string; salePrice: string }>;

const pageWidthMm = 210;
const pageHeightMm = 297;
const marginMm = 8;
const pixelsPerMm = 8;

export function getLabelPageCapacity(size: LabelSize) {
  const preset = getLabelSizePreset(size);
  const gap = size === "compact" ? 2.5 : 3;
  const usableHeight = pageHeightMm - marginMm * 2;
  const rows = Math.max(1, Math.floor((usableHeight + gap) / (preset.heightMm + gap)));
  return preset.columns * rows;
}

export function splitLabelsIntoPages(labels: CanvasLabel[], size: LabelSize) {
  const capacity = getLabelPageCapacity(size);
  return Array.from({ length: Math.ceil(labels.length / capacity) }, (_, index) => labels.slice(index * capacity, (index + 1) * capacity));
}

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.stroke();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function rupiah(value: string) {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

function getWrappedLines(context: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let finalLine = kept[maxLines - 1] ?? "";
  while (finalLine.length && context.measureText(`${finalLine}…`).width > maxWidth) finalLine = finalLine.slice(0, -1);
  kept[maxLines - 1] = `${finalLine}…`;
  return kept;
}

export async function renderLabelPages(labels: CanvasLabel[], images: Record<number, string>, size: LabelSize) {
  const preset = getLabelSizePreset(size);
  const pages = splitLabelsIntoPages(labels, size);
  const qrImages = await Promise.all(Array.from(new Set(labels.map(label => label.id))).map(async id => [id, await loadImage(images[id] ?? "")] as const));
  const qrById = Object.fromEntries(qrImages);
  const gapMm = size === "compact" ? 2.5 : 3;
  const pageWidthPx = pageWidthMm * pixelsPerMm;
  const pageHeightPx = pageHeightMm * pixelsPerMm;
  const cardWidthPx = preset.widthMm * pixelsPerMm;
  const cardHeightPx = preset.heightMm * pixelsPerMm;
  const gapPx = gapMm * pixelsPerMm;
  const marginPx = marginMm * pixelsPerMm;
  const gridWidthPx = preset.columns * cardWidthPx + (preset.columns - 1) * gapPx;
  const startX = (pageWidthPx - gridWidthPx) / 2;
  const qrColumnPx = preset.qrColumnMm * pixelsPerMm;
  const qrSizePx = preset.qrSizeMm * pixelsPerMm;
  const nameFontPx = preset.nameFontPt * (pixelsPerMm / 2.835);
  const priceFontPx = preset.priceFontPt * (pixelsPerMm / 2.835);
  const codeFontPx = preset.codeFontPt * (pixelsPerMm / 2.835);

  return pages.map(pageLabels => {
    const canvas = document.createElement("canvas");
    canvas.width = pageWidthPx;
    canvas.height = pageHeightPx;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Kanvas ekspor tidak tersedia");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageWidthPx, pageHeightPx);
    pageLabels.forEach((label, index) => {
      const column = index % preset.columns;
      const row = Math.floor(index / preset.columns);
      const x = startX + column * (cardWidthPx + gapPx);
      const y = marginPx + row * (cardHeightPx + gapPx);
      const padding = 2 * pixelsPerMm;
      context.strokeStyle = "#4eafa3";
      context.lineWidth = Math.max(2, 0.35 * pixelsPerMm);
      drawRoundedRect(context, x, y, cardWidthPx, cardHeightPx, 3 * pixelsPerMm);
      const qrX = x + (qrColumnPx - qrSizePx) / 2;
      const qrY = y + (cardHeightPx - qrSizePx) / 2;
      context.fillStyle = "#effcf9";
      context.fillRect(qrX - 2 * pixelsPerMm, qrY - 2 * pixelsPerMm, qrSizePx + 4 * pixelsPerMm, qrSizePx + 4 * pixelsPerMm);
      context.imageSmoothingEnabled = false;
      context.drawImage(qrById[label.id], qrX, qrY, qrSizePx, qrSizePx);
      const textX = x + qrColumnPx + padding;
      const textWidth = cardWidthPx - qrColumnPx - padding * 2;
      const brandFontPx = Math.max(7, nameFontPx * 0.54);
      context.fillStyle = "#087c70";
      context.font = `800 ${brandFontPx}px Arial, sans-serif`;
      context.fillText("JAJANANKU", textX, y + padding + brandFontPx);
      context.fillStyle = "#103d37";
      context.font = `900 ${nameFontPx}px Arial, sans-serif`;
      const lines = getWrappedLines(context, label.name, textWidth, preset.nameLines);
      const lineHeight = nameFontPx * 1.12;
      const nameStartY = y + padding + brandFontPx + nameFontPx * 1.36;
      lines.forEach((line, lineIndex) => context.fillText(line, textX, nameStartY + lineIndex * lineHeight));
      context.fillStyle = "#c57c00";
      context.font = `900 ${priceFontPx}px Arial, sans-serif`;
      const priceY = Math.min(y + cardHeightPx - padding - codeFontPx * 2.15, nameStartY + lines.length * lineHeight + priceFontPx * 1.18);
      context.fillText(rupiah(label.salePrice), textX, priceY);
      context.fillStyle = "#476760";
      context.font = `${codeFontPx}px monospace`;
      context.fillText(label.qrCode, textX, y + cardHeightPx - padding - codeFontPx * 0.2, textWidth);
    });
    return canvas;
  });
}

export function stackCanvasPages(pages: HTMLCanvasElement[]) {
  const canvas = document.createElement("canvas");
  const gap = 12;
  canvas.width = pages[0]?.width ?? 1;
  canvas.height = Math.max(1, pages.reduce((height, page) => height + page.height, 0) + Math.max(0, pages.length - 1) * gap);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Kanvas gabungan tidak tersedia");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  let y = 0;
  pages.forEach(page => { context.drawImage(page, 0, y); y += page.height + gap; });
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Berkas ekspor kosong")), type, quality));
}
