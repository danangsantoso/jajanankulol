import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { workspaceUseQuery, productsUseQuery, promotionsListUseQuery, saveUseMutation, deleteUseMutation, useUtils } = vi.hoisted(() => ({ workspaceUseQuery: vi.fn(), productsUseQuery: vi.fn(), promotionsListUseQuery: vi.fn(), saveUseMutation: vi.fn(), deleteUseMutation: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { workspace: { current: { useQuery: workspaceUseQuery } }, products: { all: { useQuery: productsUseQuery } }, promotions: { list: { useQuery: promotionsListUseQuery }, save: { useMutation: saveUseMutation }, delete: { useMutation: deleteUseMutation } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/select", () => ({ Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>, SelectValue: () => <span /> }));
vi.mock("lucide-react", () => ({ CalendarClock: () => null, Layers3: () => null, Percent: () => null, Save: () => null, Tag: () => null, Trash2: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PromotionsPage from "./PromotionsPage";

describe("halaman promo", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T12:00:00.000Z"));
    workspaceUseQuery.mockReturnValue({ data: { branchId: 10, branches: [{ id: 10, name: "Cabang Pusat" }] } });
    productsUseQuery.mockReturnValue({ data: [{ id: 7, name: "Roti Cokelat", salePrice: "10000", status: "active" }] });
    promotionsListUseQuery.mockReturnValue({ data: [{ id: 1, name: "Hemat akhir pekan", status: "active", type: "discount", discountType: "percentage", discountValue: 10, bundlePrice: null, startsAt: new Date("2026-08-28T00:00:00.000Z"), endsAt: new Date("2026-08-29T00:00:00.000Z"), items: [{ productId: 7, productName: "Roti Cokelat", quantity: 1 }] }, { id: 2, name: "Promo lama", status: "active", type: "bundle", discountType: null, discountValue: null, bundlePrice: 15000, startsAt: new Date("2020-08-01T00:00:00.000Z"), endsAt: new Date("2020-08-02T00:00:00.000Z"), items: [{ productId: 7, productName: "Roti Cokelat", quantity: 2 }] }], isLoading: false });
    saveUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    deleteUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtils.mockReturnValue({ promotions: { list: { invalidate: vi.fn() } } });
    window.scrollTo = vi.fn();
  });

  it("menyediakan input diskon, bundling, periode, dan promo cabang", () => {
    render(<PromotionsPage />);
    expect(screen.getByText("Promo & bundling")).toBeTruthy();
    expect(screen.getByText("Diskon")).toBeTruthy();
    expect(screen.getByText("Bundling")).toBeTruthy();
    expect(screen.getByLabelText("Pilih Roti Cokelat")).toBeTruthy();
    expect(screen.getByText("Hemat akhir pekan")).toBeTruthy();
    expect(screen.queryByText("Promo lama")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Riwayat berakhir/i }));
    expect(screen.getByText("Promo lama")).toBeTruthy();
  });

  it("memuat detail promo ke formulir saat admin menekan Edit", () => {
    render(<PromotionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit promo")).toBeTruthy();
    expect(screen.getByDisplayValue("Hemat akhir pekan")).toBeTruthy();
    expect(screen.getByDisplayValue("10")).toBeTruthy();
    expect((screen.getByLabelText("Pilih Roti Cokelat") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Simpan perubahan" })).toBeTruthy();
  });
});
