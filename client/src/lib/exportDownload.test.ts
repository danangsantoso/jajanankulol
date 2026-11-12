// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveExportBlob } from "./exportDownload";

const originalShare = navigator.share;
const originalCanShare = navigator.canShare;

function setNavigatorValue(key: "share" | "canShare", value: unknown) {
  Object.defineProperty(navigator, key, { configurable: true, value });
}

describe("saveExportBlob", () => {
  afterEach(() => {
    setNavigatorValue("share", originalShare);
    setNavigatorValue("canShare", originalCanShare);
    vi.restoreAllMocks();
  });

  it("menggunakan dialog simpan/bagikan perangkat bila berbagi berkas tersedia", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigatorValue("canShare", vi.fn().mockReturnValue(true));
    setNavigatorValue("share", share);

    await expect(saveExportBlob(new Blob(["qr"], { type: "image/jpeg" }), "label.jpg", "Label QR")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Label QR", files: expect.any(Array) }));
  });

  it("tidak memicu unduhan ketika pengguna menutup dialog penyimpanan", async () => {
    setNavigatorValue("canShare", vi.fn().mockReturnValue(true));
    setNavigatorValue("share", vi.fn().mockRejectedValue(new DOMException("cancel", "AbortError")));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await expect(saveExportBlob(new Blob(["qr"]), "label.jpg", "Label QR")).resolves.toBe("cancelled");
    expect(click).not.toHaveBeenCalled();
  });

  it("mengunduh Blob melalui browser saat berbagi berkas tidak tersedia", async () => {
    setNavigatorValue("canShare", undefined);
    setNavigatorValue("share", undefined);
    const createObjectURL = vi.fn().mockReturnValue("blob:label");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await expect(saveExportBlob(new Blob(["qr"], { type: "application/pdf" }), "label.pdf", "Label QR")).resolves.toBe("downloaded");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
