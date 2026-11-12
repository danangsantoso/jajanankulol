import { describe, expect, it } from "vitest";
import { getCameraErrorMessage, getQrCameraAttempts, getQrScannerStartIssue, shouldRetryQrCamera } from "./qrScannerSupport";

describe("dukungan pemindai QR", () => {
  it("menolak scanner sebelum membuka modal bila HTTPS atau kamera tidak tersedia", () => {
    expect(getQrScannerStartIssue(false, true)).toContain("HTTPS");
    expect(getQrScannerStartIssue(true, false)).toContain("belum mendukung");
    expect(getQrScannerStartIssue(true, true)).toBeNull();
  });
  it("memberikan pesan izin dan kamera yang tepat tanpa menjatuhkan POS", () => {
    expect(getCameraErrorMessage({ name: "NotAllowedError" })).toContain("ditolak");
    expect(getCameraErrorMessage({ name: "NotFoundError" })).toContain("tidak ditemukan");
    expect(getCameraErrorMessage({ name: "NotReadableError" })).toContain("dipakai");
    expect(getCameraErrorMessage({ name: "NotSupportedError" })).toContain("tidak didukung");
  });

  it("memilih kamera belakang lebih dahulu dan hanya mengulang kegagalan konfigurasi", () => {
    expect(getQrCameraAttempts()).toEqual([{ facingMode: { ideal: "environment" } }, { facingMode: "environment" }, { facingMode: "user" }]);
    expect(shouldRetryQrCamera({ name: "OverconstrainedError" })).toBe(true);
    expect(shouldRetryQrCamera({ name: "NotAllowedError" })).toBe(false);
    expect(shouldRetryQrCamera({ name: "NotReadableError" })).toBe(false);
  });
});
