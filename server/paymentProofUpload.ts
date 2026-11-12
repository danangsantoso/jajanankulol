import type { Express } from "express";
import { nanoid } from "nanoid";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validatePaymentProofDataUrl(dataUrl: unknown, maxFileSize = MAX_FILE_SIZE) {
  if (typeof dataUrl !== "string") throw new Error("Foto bukti transfer belum tersedia.");
  const matched = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!matched) throw new Error("Gunakan foto berformat JPG, PNG, atau WebP.");
  const [, mimeType, base64Data] = matched;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error("Format foto tidak didukung.");
  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length || buffer.length > maxFileSize) throw new Error("Ukuran foto bukti maksimal 5 MB.");
  return { buffer, mimeType };
}

export function registerPaymentProofRoutes(app: Express, maxFileSize = MAX_FILE_SIZE) {
  app.post("/api/payment-proofs", async (req, res) => {
    let user = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    if (!user || (user.role !== "superadmin" && user.role !== "admin" && user.role !== "cashier")) {
      return res.status(401).json({ message: "Silakan masuk sebagai admin atau kasir." });
    }

    let proof: ReturnType<typeof validatePaymentProofDataUrl>;
    try {
      proof = validatePaymentProofDataUrl(req.body?.dataUrl, maxFileSize);
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Foto bukti tidak valid." });
    }
    const { buffer, mimeType } = proof;

    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    const uploaded = await storagePut(
      `payment-proofs/${user.id}/qris-${Date.now()}-${nanoid(8)}.${extension}`,
      buffer,
      mimeType,
    );
    return res.status(201).json({ ...uploaded, mimeType });
  });
}
