import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { teamListUseQuery, createCashierUseMutation, createBranchAdminUseMutation, resetMemberPasswordUseMutation, reassignCashierUseMutation, deactivateUseMutation, workspaceUseQuery, useUtils } = vi.hoisted(() => ({ teamListUseQuery: vi.fn(), createCashierUseMutation: vi.fn(), createBranchAdminUseMutation: vi.fn(), resetMemberPasswordUseMutation: vi.fn(), reassignCashierUseMutation: vi.fn(), deactivateUseMutation: vi.fn(), workspaceUseQuery: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { team: { list: { useQuery: teamListUseQuery }, createCashier: { useMutation: createCashierUseMutation }, createBranchAdmin: { useMutation: createBranchAdminUseMutation }, resetMemberPassword: { useMutation: resetMemberPasswordUseMutation }, reassignCashierBranch: { useMutation: reassignCashierUseMutation }, deactivate: { useMutation: deactivateUseMutation } }, workspace: { current: { useQuery: workspaceUseQuery } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/select", () => ({ Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>, SelectValue: () => <span /> }));
vi.mock("lucide-react", () => ({ KeyRound: () => null, ShieldCheck: () => null, UserPlus: () => null, UserRoundX: () => null, UsersRound: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TeamPage from "./TeamPage";

describe("halaman pengguna tenant", () => {
  beforeEach(() => {
    teamListUseQuery.mockReturnValue({ data: { members: [{ id: 7, role: "cashier", status: "active", name: "Kasir Utama", email: "kasir@usaha.com", branchId: 10, branchName: "Cabang Utama" }], invitations: [] } });
    workspaceUseQuery.mockReturnValue({ data: { branches: [{ id: 10, name: "Cabang Utama" }], subscription: { planName: "Bronze 1 Bulan", branchLimit: 2, cashierLimit: 2, activeBranches: 1 } } });
    createCashierUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    createBranchAdminUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    resetMemberPasswordUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    reassignCashierUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    deactivateUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtils.mockReturnValue({ team: { list: { invalidate: vi.fn() } } });
  });
  it("menampilkan formulir pembuatan akun kasir, daftar kasir, dan state undangan kosong", () => {
    render(<TeamPage />);
    expect(screen.getByText("Admin cabang & kasir")).toBeTruthy();
    expect(screen.getByText("Buat akun pengguna")).toBeTruthy();
    expect(screen.getAllByText("Admin Cabang").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Kasir").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Kasir Utama")).toBeTruthy();
    expect(screen.getAllByText("1/2").length).toBeGreaterThanOrEqual(2);
  });
});
