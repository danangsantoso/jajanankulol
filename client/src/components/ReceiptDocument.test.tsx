import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReceiptDocument, printReceipt, type ReceiptData, type ReceiptSettings } from "./ReceiptDocument";

const receipt: ReceiptData = { receiptNo: "JJN-0001", subtotal: 25000, total: 25000, paymentMethod: "cash", amountReceived: 30000, changeAmount: 5000, paidAt: new Date("2026-08-27T08:00:00.000Z"), cashierName: "Kasir Satu", items: [{ productName: "Keripik", quantity: 2, unitPrice: 10000, lineTotal: 20000 }, { productName: "Teh", quantity: 1, unitPrice: 5000, lineTotal: 5000 }] };
const baseSettings: ReceiptSettings = { template: "standard", paperWidth: "58", autoPrint: "no", receiptFooter: "Terima kasih sudah berbelanja.", businessName: "Warung Ceria", businessAddress: "Jl. Bahagia 10", branchName: "Cabang Utama" };

describe("dokumen struk", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.classList.remove("printing-receipt"); });

  it("menampilkan pembayaran dan kembalian pada template Standar", () => {
    render(<ReceiptDocument receipt={receipt} settings={baseSettings} />);
    expect(screen.getByText("Warung Ceria")).toBeTruthy();
    expect(screen.getByText("Pembayaran")).toBeTruthy();
    expect(screen.getByText("Kembalian")).toBeTruthy();
    expect(document.querySelector('[data-paper-width="58"]')).toBeTruthy();
  });

  it("menggunakan logo usaha saat tersedia pada template dengan branding", () => {
    render(<ReceiptDocument receipt={receipt} settings={{ ...baseSettings, businessLogoUrl: "/manus-storage/business-logos/1/logo.webp" }} />);
    expect(document.querySelector(".receipt-logo")?.getAttribute("src")).toBe("/manus-storage/business-logos/1/logo.webp");
  });

  it("menyembunyikan detail pembayaran pada template Simple", () => {
    render(<ReceiptDocument receipt={receipt} settings={{ ...baseSettings, template: "simple" }} />);
    expect(screen.getByText("Keripik")).toBeTruthy();
    expect(screen.queryByText("Pembayaran")).toBeNull();
    expect(screen.queryByText("Warung Ceria")).toBeNull();
  });

  it("menampilkan alamat dan ucapan pada template Lengkap", () => {
    render(<ReceiptDocument receipt={receipt} settings={{ ...baseSettings, template: "complete", paperWidth: "70" }} />);
    expect(screen.getByText("Jl. Bahagia 10")).toBeTruthy();
    expect(screen.getByText("Terima kasih sudah berbelanja.")).toBeTruthy();
    expect(document.querySelector('[data-paper-width="70"]')).toBeTruthy();
  });

  it("memicu dialog cetak dan membersihkan mode cetak setelah selesai", () => {
    vi.useFakeTimers();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    printReceipt();
    expect(document.body.classList.contains("printing-receipt")).toBe(true);
    vi.advanceTimersByTime(50);
    expect(print).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("afterprint"));
    expect(document.body.classList.contains("printing-receipt")).toBe(false);
  });
});
