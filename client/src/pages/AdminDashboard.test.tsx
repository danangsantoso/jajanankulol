import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardUseQuery, workspaceUseQuery } = vi.hoisted(() => ({ dashboardUseQuery: vi.fn(), workspaceUseQuery: vi.fn() }));

vi.mock("@/lib/trpc", () => ({ trpc: { analytics: { dashboard: { useQuery: dashboardUseQuery } }, workspace: { current: { useQuery: workspaceUseQuery } } } }));
vi.mock("@/components/PageHeading", () => ({ default: () => null }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => children, CardContent: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/ui/select", () => ({ Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange: (value: string) => void }) => <div><button onClick={() => onValueChange("10")}>Filter Cabang Utama</button>{children}</div>, SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, SelectValue: () => <span /> }));
vi.mock("@/lib/format", () => ({ formatRupiah: (value: number) => `Rp ${value}`, formatDateTime: () => "waktu" }));
vi.mock("lucide-react", () => ({ ArrowUpRight: () => null, CalendarDays: () => null, CreditCard: () => null, PackageOpen: () => null, ReceiptText: () => null, TriangleAlert: () => null }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));

import AdminDashboard from "./AdminDashboard";

const dashboardData = {
  daily: { periodSales: 10000, periodTransactions: 1, periodLabel: "Hari ini", topItems: [], lowStock: [], recentTransactions: [] },
  weekly: { periodSales: 70000, periodTransactions: 7, periodLabel: "Minggu ini", topItems: [], lowStock: [], recentTransactions: [] },
  monthly: { periodSales: 300000, periodTransactions: 30, periodLabel: "Bulan ini", topItems: [], lowStock: [], recentTransactions: [] },
} as const;

describe("AdminDashboard", () => {
  beforeEach(() => {
    dashboardUseQuery.mockImplementation(({ period }: { period: keyof typeof dashboardData }) => ({ data: dashboardData[period], isLoading: false }));
    workspaceUseQuery.mockReturnValue({ data: { isTenantAdmin: true, branchId: 10, branchName: "Cabang Utama", branches: [{ id: 10, name: "Cabang Utama" }] } });
    dashboardUseQuery.mockClear();
  });

  it("mengirim periode baru ke kueri dashboard dan merender ringkasan responsnya", () => {
    render(<AdminDashboard />);
    expect(dashboardUseQuery).toHaveBeenLastCalledWith({ period: "daily", branchId: null });
    expect(screen.getByText("Hari ini · Semua cabang")).toBeTruthy();
    expect(screen.getByText("Rp 10000")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Filter Cabang Utama" }));
    expect(dashboardUseQuery).toHaveBeenLastCalledWith({ period: "daily", branchId: 10 });
    expect(screen.getByText("Hari ini · Cabang Utama")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mingguan" }));
    expect(dashboardUseQuery).toHaveBeenLastCalledWith({ period: "weekly", branchId: 10 });
    expect(screen.getByText("Minggu ini · Cabang Utama")).toBeTruthy();
    expect(screen.getByText("Rp 70000")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Bulanan" }));
    expect(dashboardUseQuery).toHaveBeenLastCalledWith({ period: "monthly", branchId: 10 });
    expect(screen.getByText("Bulan ini · Cabang Utama")).toBeTruthy();
    expect(screen.getByText("Rp 300000")).toBeTruthy();
  });
});
