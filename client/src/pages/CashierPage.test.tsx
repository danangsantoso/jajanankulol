import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, activeUseQuery, receiptUseQuery, checkoutUseMutation, logoutMock, setLocationMock, useUtils } = vi.hoisted(() => ({ authMock: vi.fn(), activeUseQuery: vi.fn(), receiptUseQuery: vi.fn(), checkoutUseMutation: vi.fn(), logoutMock: vi.fn(), setLocationMock: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: authMock }));
vi.mock("@/lib/trpc", () => ({ trpc: { products: { active: { useQuery: activeUseQuery }, byQr: { fetch: vi.fn() } }, promotions: { quote: { useQuery: vi.fn(() => ({ data: undefined })) } }, receiptSettings: { get: { useQuery: receiptUseQuery } }, pos: { checkout: { useMutation: checkoutUseMutation } }, useUtils } }));
vi.mock("@/components/AppBrand", () => ({ AppBrand: () => <span>Jajananku</span>, JajanankuLogoMark: () => <svg data-brand-mark="jajananku" /> }));
vi.mock("@/components/PaymentProofUploader", () => ({ default: () => <div>Unggah bukti</div> }));
vi.mock("@/components/ReceiptDocument", () => ({ ReceiptDocument: () => null, printReceipt: vi.fn() }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</>, useLocation: () => ["/pos", setLocationMock] }));
vi.mock("lucide-react", () => {
  const Icon = () => <svg />;
  return { Banknote: Icon, Camera: Icon, CheckCircle2: Icon, CircleMinus: Icon, CirclePlus: Icon, Cookie: Icon, CupSoda: Icon, Grid2X2: Icon, House: Icon, IceCreamBowl: Icon, ImagePlus: Icon, Keyboard: Icon, Loader2: Icon, LogOut: Icon, Package: Icon, QrCode: Icon, ReceiptText: Icon, Sandwich: Icon, ScanLine: Icon, Search: Icon, ShieldCheck: Icon, ShoppingBag: Icon, Trash2: Icon, Utensils: Icon, X: Icon };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import CashierPage from "./CashierPage";

describe("POS kasir seluler", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    logoutMock.mockResolvedValue(undefined);
    authMock.mockReturnValue({ user: { id: 4, name: "Kasir A", role: "cashier" }, loading: false, logout: logoutMock });
    activeUseQuery.mockReturnValue({ data: [{ id: 1, name: "Roti Cokelat Panjang", category: "Roti & Kue", qrCode: "JJN-1", salePrice: "10000", stock: 8 }, { id: 2, name: "Es Teh", category: "Minuman", qrCode: "JJN-2", salePrice: "5000", stock: 10 }], isLoading: false });
    receiptUseQuery.mockReturnValue({ data: { autoPrint: "no" } });
    checkoutUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtils.mockReturnValue({ products: { active: { invalidate: vi.fn() }, byQr: { fetch: vi.fn() } }, analytics: { dashboard: { invalidate: vi.fn() }, transactions: { invalidate: vi.fn() } } });
  });

  it("menyediakan katalog dua kolom dan navigasi bawah kasir", () => {
    const { container } = render(<CashierPage />);
    expect(screen.getByText("Roti Cokelat Panjang")).toBeTruthy();
    expect(container.querySelector("section.grid.grid-cols-2")).toBeTruthy();
    const navigation = screen.getByRole("navigation", { name: "Navigasi kasir" });
    expect(navigation).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kasir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Scan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keranjang" })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Cari nama atau kode produk"), { target: { value: "teh" } });
    expect(screen.getByText("Es Teh")).toBeTruthy();
    expect(screen.queryByText("Roti Cokelat Panjang")).toBeNull();
  });

  it("mengakhiri sesi Kasir dan menampilkan konfirmasi logout", async () => {
    const view = render(<CashierPage />);
    fireEvent.click(view.getByRole("button", { name: "Keluar dari Kasir" }));
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Anda telah logout")).toBeTruthy();
  });
});
