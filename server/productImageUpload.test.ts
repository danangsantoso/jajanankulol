import { describe, expect, it } from "vitest";
import { validateProductImageDataUrl } from "./productImageUpload";

describe("validasi foto produk", () => {
  it("menerima gambar WebP hasil kompresi", () => {
    expect(validateProductImageDataUrl("data:image/webp;base64,aQ==")).toMatchObject({ mimeType: "image/webp" });
  });

  it("menolak format atau ukuran gambar yang tidak sesuai", () => {
    expect(() => validateProductImageDataUrl("data:image/gif;base64,aQ==")).toThrow("JPG, PNG, atau WebP");
    expect(() => validateProductImageDataUrl("data:image/webp;base64,QUFBQQ==", 2)).toThrow("maksimal 1 MB");
  });
});
