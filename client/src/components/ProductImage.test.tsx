import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductImage } from "./ProductImage";

describe("ProductImage", () => {
  afterEach(() => cleanup());

  it("menggunakan logo Jajananku lokal ketika foto produk belum tersedia", () => {
    render(<ProductImage alt="Foto produk" />);
    expect(screen.getByRole("img", { name: "Foto produk" }).querySelector('[data-brand-mark="jajananku"]')).not.toBeNull();
  });

  it("menampilkan foto produk ketika URL tersedia", () => {
    render(<ProductImage alt="Foto produk" src="/manus-storage/produk.webp" />);
    expect(screen.getByAltText("Foto produk").getAttribute("src")).toBe("/manus-storage/produk.webp?image_attempt=0");
  });

  it("mencoba ulang foto produk sekali sebelum memakai logo bawaan", () => {
    render(<ProductImage alt="Foto produk" src="/manus-storage/produk.webp" />);
    fireEvent.error(screen.getByAltText("Foto produk"));
    expect(screen.getByAltText("Foto produk").getAttribute("src")).toBe("/manus-storage/produk.webp?image_attempt=1");
    fireEvent.error(screen.getByAltText("Foto produk"));
    expect(screen.getByRole("img", { name: "Foto produk" }).querySelector('[data-brand-mark="jajananku"]')).not.toBeNull();
  });

  it("memulihkan foto produk ketika URL baru diterima setelah kegagalan", () => {
    const rendered = render(<ProductImage alt="Foto produk" src="/manus-storage/lama.webp" />);
    fireEvent.error(screen.getByAltText("Foto produk"));
    fireEvent.error(screen.getByAltText("Foto produk"));
    rendered.rerender(<ProductImage alt="Foto produk" src="/manus-storage/baru.webp" />);
    expect(screen.getByAltText("Foto produk").getAttribute("src")).toBe("/manus-storage/baru.webp?image_attempt=0");
  });
});
