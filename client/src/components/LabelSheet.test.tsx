import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LabelSheet from "./LabelSheet";
import { buildLabelCopies } from "@/lib/labelExport";

describe("lembar label QR", () => {
  it("merender salinan label yang dipilih beserta QR dan harga untuk cetak maupun ekspor", () => {
    const labels = buildLabelCopies([{ id: 1, name: "Keripik Pisang", qrCode: "JJK-001", salePrice: "10000" }], { 1: 2 });
    render(<LabelSheet labels={labels} images={{ 1: "data:image/png;base64,abc" }} />);
    expect(screen.getAllByText("Keripik Pisang")).toHaveLength(2);
    expect(screen.getAllByText("JJK-001")).toHaveLength(2);
    expect(screen.getAllByText((_, element) => element?.textContent?.replace(/\s/g, "") === "Rp10.000")).toHaveLength(2);
    expect(screen.getAllByAltText("QR Keripik Pisang")).toHaveLength(2);
  });

  it("mempertahankan teks nama produk panjang di dalam setiap label", () => {
    const name = "Roti Sourdough Normal Cranberry Cheese";
    const labels = buildLabelCopies([{ id: 1, name, qrCode: "JJN-DQ7IAJTFWC", salePrice: "30000" }], { 1: 1 });
    render(<LabelSheet labels={labels} images={{ 1: "data:image/png;base64,abc" }} />);
    expect(screen.getByRole("heading", { name })).toBeTruthy();
  });

  it("meneruskan preset ukuran ke lembar label untuk digunakan oleh gaya cetak dan ekspor", () => {
    const labels = buildLabelCopies([{ id: 1, name: "Kue Lapis", qrCode: "JJN-001", salePrice: "10000" }], { 1: 1 });
    const { container } = render(<LabelSheet labels={labels} images={{ 1: "data:image/png;base64,abc" }} size="large" />);
    expect(container.querySelector("[data-label-size='large']")).toBeTruthy();
  });
});
