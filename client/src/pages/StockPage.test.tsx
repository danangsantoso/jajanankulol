import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { workspaceUseQuery, productsAllUseQuery, historyUseQuery, adjustUseMutation, useUtils } = vi.hoisted(() => ({ workspaceUseQuery: vi.fn(), productsAllUseQuery: vi.fn(), historyUseQuery: vi.fn(), adjustUseMutation: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { workspace: { current: { useQuery: workspaceUseQuery } }, products: { all: { useQuery: productsAllUseQuery }, adjustStock: { useMutation: adjustUseMutation } }, stock: { history: { useQuery: historyUseQuery } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/select", () => ({ Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>, SelectValue: () => <span /> }));
vi.mock("lucide-react", () => ({ ArrowDownRight: () => null, ArrowUpRight: () => null, ClipboardList: () => null, History: () => null, Minus: () => null, PackagePlus: () => null, Plus: () => null, ShoppingBag: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import StockPage from "./StockPage";

describe("halaman stok", () => {
  beforeEach(() => {
    workspaceUseQuery.mockReturnValue({ data: { branchId: 10, isTenantAdmin: true, branches: [{ id: 10, name: "Cabang Pusat" }] } });
    productsAllUseQuery.mockReturnValue({ data: [{ id: 7, name: "Kue Cokelat", category: "Roti & Kue", stock: 12, status: "active" }] });
    historyUseQuery.mockReturnValue({ data: [{ id: 1, productId: 7, productName: "Kue Cokelat", productCategory: "Roti & Kue", type: "restock", quantity: 5, previousStock: 7, resultingStock: 12, note: "Dari supplier", createdAt: new Date("2026-08-28T01:00:00.000Z"), createdByName: "Admin" }], isLoading: false });
    adjustUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtils.mockReturnValue({ products: { all: { invalidate: vi.fn() } }, stock: { history: { invalidate: vi.fn() } } });
  });

  it("menampilkan tindakan tambah atau kurangi stok serta riwayat pergerakan unit", () => {
    render(<StockPage />);
    expect(screen.getByText("Stok & riwayat unit")).toBeTruthy();
    expect(screen.getByText("Tambah stok barang")).toBeTruthy();
    expect(screen.getByText("Kurangi")).toBeTruthy();
    expect(screen.getByText("Kue Cokelat")).toBeTruthy();
    expect(screen.getByText("Tambah stok")).toBeTruthy();
    expect(screen.getByText("7 → 12")).toBeTruthy();
  });
});
