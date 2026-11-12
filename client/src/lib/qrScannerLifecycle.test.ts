import { describe, expect, it, vi } from "vitest";
import { safelyStopQrScanner } from "./qrScannerLifecycle";

describe("penutupan pemindai QR", () => {
  it("menghentikan dan membersihkan pemindai yang aktif", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn();
    await safelyStopQrScanner({ stop, clear });
    expect(stop).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });
  it("tetap menyelesaikan penutupan bila stop gagal", async () => {
    const stop = vi.fn().mockRejectedValue(new Error("sudah berhenti"));
    const clear = vi.fn();
    await expect(safelyStopQrScanner({ stop, clear })).resolves.toBeUndefined();
    expect(clear).toHaveBeenCalledOnce();
  });
});
