import { describe, expect, it } from "vitest";
import { validatePaymentProofDataUrl } from "./paymentProofUpload";

describe("validasi unggah bukti QRIS", () => {
  it("menerima data URL foto yang didukung", () => {
    const dataUrl = `data:image/png;base64,${Buffer.from("foto-bukti").toString("base64")}`;
    const result = validatePaymentProofDataUrl(dataUrl);
    expect(result.mimeType).toBe("image/png");
    expect(result.buffer.toString()).toBe("foto-bukti");
  });

  it("menolak format selain foto yang diizinkan dan foto di atas batas ukuran", () => {
    expect(() => validatePaymentProofDataUrl("data:application/pdf;base64,ZmFrZQ==")).toThrow("Gunakan foto berformat");
    const tooLarge = `data:image/jpeg;base64,${Buffer.from("empat").toString("base64")}`;
    expect(() => validatePaymentProofDataUrl(tooLarge, 3)).toThrow("Ukuran foto bukti maksimal");
  });
});
