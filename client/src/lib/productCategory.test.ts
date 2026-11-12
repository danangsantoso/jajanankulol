import { describe, expect, it } from "vitest";
import { filterProductsByCategory, filterProductsForCatalog, getProductCategory, listProductCategories } from "./productCategory";

describe("kategori produk kasir", () => {
  const products = [{ id: 1, category: "Makanan" }, { id: 2, category: "Minuman" }, { id: 3, category: "Makanan" }, { id: 4, category: null }];

  it("membuat daftar kategori unik dan selalu menyertakan semua produk", () => {
    expect(listProductCategories(products)).toEqual(["Semua", "Makanan", "Minuman", "Lainnya"]);
  });

  it("menyaring katalog berdasarkan kategori dan mempertahankan produk tanpa kategori sebagai Lainnya", () => {
    expect(filterProductsByCategory(products, "Makanan").map(product => product.id)).toEqual([1, 3]);
    expect(filterProductsByCategory(products, "Lainnya").map(product => product.id)).toEqual([4]);
    expect(filterProductsByCategory(products, "Semua")).toEqual(products);
    expect(getProductCategory({ category: "  " })).toBe("Lainnya");
  });

  it("menyaring katalog berdasarkan kategori serta nama atau kode QR tanpa peka huruf besar", () => {
    const searchableProducts = [{ id: 1, name: "Roti Cokelat", category: "Roti & Kue", qrCode: "JJN-ROTI" }, { id: 2, name: "Es Teh", category: "Minuman", qrCode: "JJN-TEH" }];
    expect(filterProductsForCatalog(searchableProducts, "Semua", "cokelat")).toEqual([searchableProducts[0]]);
    expect(filterProductsForCatalog(searchableProducts, "Roti & Kue", "jjn-roti")).toEqual([searchableProducts[0]]);
    expect(filterProductsForCatalog(searchableProducts, "Minuman", "roti")).toEqual([]);
  });
});
