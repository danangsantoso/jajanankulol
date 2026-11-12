import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { plansUseQuery, publicSettingsUseQuery, setLocation } = vi.hoisted(() => ({ plansUseQuery: vi.fn(), publicSettingsUseQuery: vi.fn(), setLocation: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { platform: { plans: { useQuery: plansUseQuery }, publicSettings: { useQuery: publicSettingsUseQuery } } } }));
vi.mock("@/lib/format", () => ({ formatRupiah: (value: number | string) => `Rp${Number(value).toLocaleString("id-ID")}` }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("lucide-react", () => ({ ArrowRight: () => null, BarChart3: () => null, Building2: () => null, CheckCircle2: () => null, CircleDollarSign: () => null, Download: () => null, MessageCircle: () => null, ScanLine: () => null, Share: () => null, Sparkles: () => null, Store: () => null, UsersRound: () => null }));
vi.mock("wouter", () => ({ useLocation: () => ["/", setLocation] }));

import LandingPage from "./LandingPage";

const catalog = [
  { id: 1, name: "Bronze 1 Bulan", tier: "bronze", durationDays: 30, branchLimit: 2, cashierLimit: 2, regularPrice: 357000, salePrice: 257000, availability: "available" },
  { id: 2, name: "Bronze 3 Bulan", tier: "bronze", durationDays: 90, branchLimit: 2, cashierLimit: 2, regularPrice: 1071000, salePrice: 699000, availability: "available" },
  { id: 3, name: "Silver 1 Bulan", tier: "silver", durationDays: 30, branchLimit: 5, cashierLimit: 10, regularPrice: 597000, salePrice: 397000, availability: "available" },
  { id: 4, name: "Gold 1 Bulan", tier: "gold", durationDays: 30, branchLimit: 10, cashierLimit: 25, regularPrice: 997000, salePrice: 697000, availability: "available" },
  { id: 5, name: "Gold 12 Bulan", tier: "gold", durationDays: 365, branchLimit: 10, cashierLimit: 25, regularPrice: 11964000, salePrice: 6599000, availability: "available" },
  { id: 6, name: "Platinum · Coming Soon", tier: "platinum", durationDays: 30, branchLimit: 25, cashierLimit: 75, regularPrice: 0, salePrice: null, availability: "coming_soon" },
];

describe("kartu paket tiga level", () => {
  afterEach(cleanup);
  beforeEach(() => {
    setLocation.mockReset();
    publicSettingsUseQuery.mockReturnValue({ data: {} });
    plansUseQuery.mockReturnValue({ data: catalog });
  });
  it("menampilkan tepat tiga kartu level dan dropdown durasi", () => {
    render(<LandingPage />);
    expect(screen.getByText("Tiga level paket, durasi fleksibel.")).toBeTruthy();
    expect(screen.getByText("Paket Bronze")).toBeTruthy();
    expect(screen.getByText("Paket Silver")).toBeTruthy();
    expect(screen.getByText("Paket Gold")).toBeTruthy();
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Pilih paket" })).toHaveLength(3);
    expect(screen.getByLabelText("Paket Platinum Coming Soon")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Segera hadir" })).toBeNull();
  });
  it("memperbarui harga dan promo ketika durasi Bronze diganti", () => {
    render(<LandingPage />);
    expect(screen.getByText("Rp257.000")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Durasi paket Bronze"), { target: { value: "2" } });
    expect(screen.getByText("Rp699.000")).toBeTruthy();
    expect(screen.getByText("Hemat Rp372.000")).toBeTruthy();
  });
  it("mengirim konteks durasi yang dipilih ke WhatsApp", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    publicSettingsUseQuery.mockReturnValue({ data: { whatsappNumber: "628123456789" } });
    render(<LandingPage />);
    fireEvent.change(screen.getByLabelText("Durasi paket Bronze"), { target: { value: "2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Pilih & hubungi" })[0]!);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("Bronze%203%20Bulan"), "_blank", "noopener,noreferrer");
    open.mockRestore();
  });
  it("mengarahkan ke login bila kontak WhatsApp belum disetel", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Pilih paket" })[0]!);
    expect(setLocation).toHaveBeenCalledWith("/login");
  });

  it("menyediakan tombol unduh aplikasi beserta petunjuk browser bila prompt belum tersedia", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Unduh aplikasi" }));
    expect(screen.getByText("Pasang Jajananku dari menu browser.")).toBeTruthy();
    expect(screen.getByText(/Tambahkan ke layar utama/)).toBeTruthy();
    expect(screen.getByLabelText("Ikon Bagikan Safari")).toBeTruthy();
    expect(screen.getByLabelText("Petunjuk pemasangan iPhone dan iPad")).toBeTruthy();
  });
});
