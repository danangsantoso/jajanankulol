import { nanoid } from "nanoid";
import { storagePut } from "./storage";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PRODUCT_IMAGE_SIZE = 1 * 1024 * 1024;

export function validateProductImageDataUrl(dataUrl: unknown, maxFileSize = MAX_PRODUCT_IMAGE_SIZE) {
  if (typeof dataUrl !== "string") throw new Error("Foto produk belum tersedia.");
  const matched = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!matched) throw new Error("Gunakan foto produk JPG, PNG, atau WebP.");
  const [, mimeType, base64Data] = matched;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error("Format foto produk tidak didukung.");
  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length || buffer.length > maxFileSize) throw new Error("Foto produk setelah dikompres maksimal 1 MB.");
  return { buffer, mimeType };
}

export async function saveProductImage(dataUrl: string, userId: number, tenantId: number) {
  const { buffer, mimeType } = validateProductImageDataUrl(dataUrl);
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const uploaded = await storagePut(`product-images/${tenantId}/${userId}/produk-${Date.now()}-${nanoid(8)}.${extension}`, buffer, mimeType);
  return { ...uploaded, mimeType };
}
