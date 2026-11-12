import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUseQuery, workspaceUseQuery, createUseMutation, archiveUseMutation, useUtils } = vi.hoisted(() => ({ listUseQuery: vi.fn(), workspaceUseQuery: vi.fn(), createUseMutation: vi.fn(), archiveUseMutation: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { branches: { list: { useQuery: listUseQuery }, create: { useMutation: createUseMutation }, archive: { useMutation: archiveUseMutation } }, workspace: { current: { useQuery: workspaceUseQuery } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("lucide-react", () => ({ Archive: () => null, Building2: () => null, Plus: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BranchesPage from "./BranchesPage";

describe("halaman cabang", () => {
  beforeEach(() => {
    listUseQuery.mockReturnValue({ data: [] });
    workspaceUseQuery.mockReturnValue({ data: { subscription: { planName: "Bronze 1 Bulan", branchLimit: 2 } } });
    createUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    archiveUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtils.mockReturnValue({ branches: { list: { invalidate: vi.fn() } }, workspace: { current: { invalidate: vi.fn() } } });
  });
  it("menampilkan formulir cabang dan state kosong tenant", () => {
    render(<BranchesPage />);
    expect(screen.getByText("Manajemen cabang")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambah cabang" })).toBeTruthy();
    expect(screen.getByText("Belum ada cabang. Tambahkan cabang pertama untuk mulai beroperasi.")).toBeTruthy();
  });
});
