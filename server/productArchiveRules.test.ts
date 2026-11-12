import { describe, expect, it } from "vitest";
import { getProductDeletionBlockReason } from "./db";

describe("aturan hapus permanen produk", () => {
  it("menolak produk aktif dan produk yang stoknya belum kosong", () => {
    expect(getProductDeletionBlockReason({ status: "active", stock: 0 })).toBe("Arsipkan produk terlebih dahulu sebelum menghapus permanen.");
    expect(getProductDeletionBlockReason({ status: "archived", stock: 3 })).toBe("Produk hanya dapat dihapus jika stok sudah 0 unit.");
  });

  it("mengizinkan hanya produk arsip dengan stok nol untuk dilanjutkan ke penghapusan", () => {
    expect(getProductDeletionBlockReason({ status: "archived", stock: 0 })).toBeNull();
  });
});
