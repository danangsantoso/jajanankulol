import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { productsAllUseQuery, createUseMutation, updateUseMutation, archiveUseMutation, adjustUseMutation, productImageUseMutation, workspaceUseQuery, useUtils } = vi.hoisted(() => ({ productsAllUseQuery: vi.fn(), createUseMutation: vi.fn(), updateUseMutation: vi.fn(), archiveUseMutation: vi.fn(), adjustUseMutation: vi.fn(), productImageUseMutation: vi.fn(), workspaceUseQuery: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { products: { all: { useQuery: productsAllUseQuery }, create: { useMutation: createUseMutation }, update: { useMutation: updateUseMutation }, archive: { useMutation: archiveUseMutation }, adjustStock: { useMutation: adjustUseMutation } }, productImages: { upload: { useMutation: productImageUseMutation } }, workspace: { current: { useQuery: workspaceUseQuery } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title, action }: { title: string; action?: React.ReactNode }) => <><h1>{title}</h1>{action}</> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/select", () => ({ Select: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => <div data-disabled={String(disabled)}>{children}</div>, SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>, SelectValue: () => <span /> }));
vi.mock("lucide-react", () => ({ Archive: () => null, Edit3: () => null, ImagePlus: () => null, Loader2: () => null, PackagePlus: () => null, Plus: () => null, RefreshCw: () => null, X: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ProductsPage from "./ProductsPage";

describe("lokasi cabang produk dan stok", () => {
  beforeEach(() => {
    workspaceUseQuery.mockReturnValue({ data: { branchId: 10, branchName: "Cabang Pusat", isTenantAdmin: true, isBranchAdmin: false, branches: [{ id: 10, name: "Cabang Pusat" }, { id: 11, name: "Cabang Mall" }] } });
    productsAllUseQuery.mockReturnValue({ data: [], isLoading: false });
    [createUseMutation, updateUseMutation, archiveUseMutation, adjustUseMutation, productImageUseMutation].forEach(mutation => mutation.mockReturnValue({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }));
    useUtils.mockReturnValue({ products: { all: { invalidate: vi.fn() } } });
  });

  it("menampilkan pilihan cabang dan memuat stok dari cabang aktif awal", async () => {
    render(<ProductsPage />);
    expect(screen.getByText("Lokasi produk & stok")).toBeTruthy();
    expect(screen.getByText("Cabang Pusat")).toBeTruthy();
    expect(screen.getByText("Cabang Mall")).toBeTruthy();
    await waitFor(() => expect(productsAllUseQuery).toHaveBeenLastCalledWith({ branchId: 10 }));
    expect(screen.getByText("Menampilkan produk aktif dan stok: Cabang Pusat")).toBeTruthy();
    fireEvent.click(screen.getByText("Tambah produk"));
    expect(screen.getByRole("dialog").tagName).toBe("FORM");
    expect(screen.getByText("Foto persegi untuk POS")).toBeTruthy();
    expect(screen.getByText("Pilih foto")).toBeTruthy();
  });

  it("menampilkan kegagalan pemuatan produk dan menyediakan aksi muat ulang", () => {
    const refetch = vi.fn();
    productsAllUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: { message: "Kolom foto belum tersedia" }, refetch });
    render(<ProductsPage />);
    expect(screen.getByText("Produk belum dapat dimuat")).toBeTruthy();
    fireEvent.click(screen.getByText("Muat ulang produk"));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
