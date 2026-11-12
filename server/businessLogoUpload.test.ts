import { describe, expect, it } from "vitest";
import { validateBusinessLogoDataUrl } from "./businessLogoUpload";

describe("validasi logo usaha", () => {
  it("menerima logo webp dalam data URL", () => {
    const result = validateBusinessLogoDataUrl("data:image/webp;base64,SGVsbG8=");
    expect(result.mimeType).toBe("image/webp");
    expect(result.buffer.toString()).toBe("Hello");
  });
  it("menolak file non-gambar", () => expect(() => validateBusinessLogoDataUrl("data:text/plain;base64,SGVsbG8=")).toThrow("Gunakan logo"));
});
