import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_LOGO_SIZE = 1 * 1024 * 1024;

export function validateBusinessLogoDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== "string") throw new Error("Logo usaha belum tersedia.");
  const matched = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!matched) throw new Error("Gunakan logo JPG, PNG, atau WebP.");
  const [, mimeType, base64Data] = matched;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error("Format logo tidak didukung.");
  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length || buffer.length > MAX_LOGO_SIZE) throw new Error("Logo setelah dikompres maksimal 1 MB.");
  return { buffer, mimeType };
}

export async function saveBusinessLogo(dataUrl: string, userId: number, tenantId: number) {
  const { buffer, mimeType } = validateBusinessLogoDataUrl(dataUrl);
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const uploaded = await storagePut(`business-logos/${tenantId}/${userId}/logo-${Date.now()}-${nanoid(8)}.${extension}`, buffer, mimeType);
  return { ...uploaded, mimeType };
}
