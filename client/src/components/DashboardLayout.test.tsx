import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, workspaceUseQuery, publicSettingsUseQuery, logout } = vi.hoisted(() => ({ authMock: vi.fn(), workspaceUseQuery: vi.fn(), publicSettingsUseQuery: vi.fn(), logout: vi.fn() }));

vi.mock("@/lib/trpc", () => ({ trpc: { workspace: { current: { useQuery: workspaceUseQuery } }, platform: { publicSettings: { useQuery: publicSettingsUseQuery } } } }));
vi.mock("@/components/BranchSwitcher", () => ({ default: () => <div>Branch switcher</div> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: authMock }));

import DashboardLayout from "./DashboardLayout";

describe("DashboardLayout", () => {
  afterEach(cleanup);
  beforeEach(() => {
    authMock.mockReturnValue({ user: { id: 1, name: "Danang Santoso", role: "superadmin" }, logout });
    workspaceUseQuery.mockReturnValue({ data: undefined });
    publicSettingsUseQuery.mockReturnValue({ data: undefined });
  });

  it("tidak meminta workspace tenant pada sesi Superadmin", () => {
    render(<DashboardLayout><p>Panel Superadmin</p></DashboardLayout>);
    expect(workspaceUseQuery).toHaveBeenCalledWith(undefined, { enabled: false, retry: false });
    expect(screen.getByText("Panel Superadmin")).toBeTruthy();
    expect(screen.queryByText("Cetak QR")).toBeNull();
  });

  it("menampilkan menu Stok, Arsip Produk, dan Cetak QR untuk Admin Utama", () => {
    authMock.mockReturnValue({ user: { id: 2, name: "Admin Utama", role: "admin" }, logout });
    workspaceUseQuery.mockReturnValue({ data: { membershipRole: "tenant_admin", isTenantAdmin: true, isBranchAdmin: false, subscription: { allowed: true, state: "active", daysRemaining: 30 } } });
    render(<DashboardLayout><p>Dashboard Admin</p></DashboardLayout>);
    expect(workspaceUseQuery).toHaveBeenCalledWith(undefined, { enabled: true, retry: false });
    expect(screen.getByText("Stok")).toBeTruthy();
    expect(screen.getByText("Arsip Produk")).toBeTruthy();
    expect(screen.getByText("Cetak QR")).toBeTruthy();
    expect(screen.getByText("Cabang")).toBeTruthy();
    expect(screen.queryByText("Kasir")).toBeNull();
  });

  it("memberi Admin Cabang modul operasional tanpa menu pengelolaan cabang dan pengguna", () => {
    authMock.mockReturnValue({ user: { id: 3, name: "Admin Cabang", role: "admin" }, logout });
    workspaceUseQuery.mockReturnValue({ data: { membershipRole: "branch_admin", isTenantAdmin: false, isBranchAdmin: true, branchName: "Cabang A", subscription: { allowed: true, state: "active", daysRemaining: 30 } } });
    render(<DashboardLayout><p>Dashboard Cabang</p></DashboardLayout>);
    expect(screen.getByText("Cetak QR")).toBeTruthy();
    expect(screen.getByText("Stok")).toBeTruthy();
    expect(screen.getByText("Arsip Produk")).toBeTruthy();
    expect(screen.getByText("Transaksi")).toBeTruthy();
    expect(screen.getByText("Keuangan")).toBeTruthy();
    expect(screen.queryByText("Cabang")).toBeNull();
    expect(screen.queryByText("Pengguna")).toBeNull();
    expect(screen.queryByText("Kasir")).toBeNull();
  });

  it("membatasi Kasir hanya pada menu Kasir", () => {
    authMock.mockReturnValue({ user: { id: 4, name: "Kasir", role: "cashier" }, logout });
    workspaceUseQuery.mockReturnValue({ data: { membershipRole: "cashier", isTenantAdmin: false, isBranchAdmin: false, subscription: { allowed: true, state: "active", daysRemaining: 30 } } });
    render(<DashboardLayout><p>POS Kasir</p></DashboardLayout>);
    expect(screen.getAllByText("Kasir").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ringkasan")).toBeNull();
    expect(screen.queryByText("Produk")).toBeNull();
    expect(screen.queryByText("Stok")).toBeNull();
    expect(screen.queryByText("Arsip Produk")).toBeNull();
    expect(screen.queryByText("Cetak QR")).toBeNull();
  });

  it("mengganti logo dengan ikon menu tiga garis saat sidebar diringkas dan dapat dibuka kembali", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 600 });
    render(<DashboardLayout><p>Panel Superadmin</p></DashboardLayout>);
    expect(screen.queryByAltText("Logo Jajananku")).toBeNull();
    const expandButton = screen.getByRole("button", { name: "Buka menu sidebar" });
    expect(expandButton).toBeTruthy();
    fireEvent.click(expandButton);
    expect(screen.getByAltText("Logo Jajananku")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ringkas sidebar" })).toBeTruthy();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });
});
