import { describe, expect, it, vi } from "vitest";
import { getCameraPermissionState, PHOTO_ACCESS_EXPLANATION, requestCameraPermission } from "./devicePermissions";

describe("izin perangkat", () => {
  it("membaca status kamera dan menangani browser tanpa Permission API", async () => {
    expect(await getCameraPermissionState({ query: vi.fn().mockResolvedValue({ state: "granted" }) } as never)).toBe("granted");
    expect(await getCameraPermissionState(undefined)).toBe("unsupported");
  });

  it("meminta kamera lalu menghentikan stream setelah izin diberikan", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    expect(await requestCameraPermission({ getUserMedia } as never)).toBe("granted");
    expect(stop).toHaveBeenCalledOnce();
    expect(PHOTO_ACCESS_EXPLANATION).toContain("galeri");
  });
});
