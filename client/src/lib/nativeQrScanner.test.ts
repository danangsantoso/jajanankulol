import { afterEach, describe, expect, it, vi } from "vitest";
import { supportsNativeQrScanner } from "./nativeQrScanner";

const originalBarcodeDetector = (globalThis as typeof globalThis & { BarcodeDetector?: unknown }).BarcodeDetector;

afterEach(() => {
  (globalThis as typeof globalThis & { BarcodeDetector?: unknown }).BarcodeDetector = originalBarcodeDetector;
});

describe("dukungan pembaca QR native", () => {
  it("menggunakan pembaca native hanya jika detektor QR dan kamera tersedia", () => {
    (globalThis as typeof globalThis & { BarcodeDetector?: unknown }).BarcodeDetector = class {};
    expect(supportsNativeQrScanner()).toBe(Boolean(navigator.mediaDevices?.getUserMedia));
    (globalThis as typeof globalThis & { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
    expect(supportsNativeQrScanner()).toBe(false);
  });
});
