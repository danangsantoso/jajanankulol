const MAX_OUTPUT_SIZE = 1 * 1024 * 1024;
const OUTPUT_DIMENSION = 512;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto produk tidak dapat dibaca."));
    reader.onerror = () => reject(new Error("Foto produk tidak dapat dibaca."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Foto produk tidak dapat dikompres.")), "image/webp", quality));
}

export async function compressProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file foto produk.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran foto asli maksimal 10 MB.");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Foto produk tidak dapat dibaca."));
      element.src = sourceUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_DIMENSION;
    canvas.height = OUTPUT_DIMENSION;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Perangkat tidak mendukung kompresi foto.");
    context.fillStyle = "#f8fffd";
    context.fillRect(0, 0, OUTPUT_DIMENSION, OUTPUT_DIMENSION);
    const scale = Math.min(OUTPUT_DIMENSION / image.naturalWidth, OUTPUT_DIMENSION / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (OUTPUT_DIMENSION - width) / 2, (OUTPUT_DIMENSION - height) / 2, width, height);
    let blob = await canvasToBlob(canvas, 0.82);
    if (blob.size > MAX_OUTPUT_SIZE) blob = await canvasToBlob(canvas, 0.62);
    if (blob.size > MAX_OUTPUT_SIZE) throw new Error("Foto terlalu besar setelah dikompres. Gunakan foto yang lebih sederhana.");
    return { dataUrl: await blobToDataUrl(blob), previewUrl: URL.createObjectURL(blob), mimeType: "image/webp" as const, size: blob.size };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
