import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUseQuery, optionsUseQuery, createUseMutation, updateUseMutation, deleteUseMutation, resetUseMutation, useUtils } = vi.hoisted(() => ({ listUseQuery: vi.fn(), optionsUseQuery: vi.fn(), createUseMutation: vi.fn(), updateUseMutation: vi.fn(), deleteUseMutation: vi.fn(), resetUseMutation: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { superadmin: { users: { list: { useQuery: listUseQuery }, options: { useQuery: optionsUseQuery }, create: { useMutation: createUseMutation }, update: { useMutation: updateUseMutation }, deleteAccess: { useMutation: deleteUseMutation } }, accounts: { resetPassword: { useMutation: resetUseMutation } } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SuperadminUsersPage from "./SuperadminUsersPage";

describe("manajemen seluruh pengguna Superadmin", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    listUseQuery.mockReturnValue({ isLoading: false, data: [
      { id: 1, name: "Danang", email: "danang@example.com", role: "superadmin", status: "active", loginMethod: "google", lastSignedIn: new Date(), membershipId: null, membershipRole: null, membershipStatus: null, tenantId: null, tenantName: null, branchId: null, branchName: null },
      { id: 2, name: "Admin Toko", email: "admin@toko.id", role: "admin", status: "active", loginMethod: "demo_password", lastSignedIn: new Date(), membershipId: 9, membershipRole: "tenant_admin", membershipStatus: "active", tenantId: 8, tenantName: "Toko A", branchId: 4, branchName: "Pusat" },
      { id: 3, name: "Kasir", email: "kasir@toko.id", role: "cashier", status: "active", loginMethod: "demo_password", lastSignedIn: new Date(), membershipId: 10, membershipRole: "cashier", membershipStatus: "active", tenantId: 8, tenantName: "Toko A", branchId: 4, branchName: "Pusat" },
    ] });
    optionsUseQuery.mockReturnValue({ data: [{ id: 8, name: "Toko A", status: "active", branches: [{ id: 4, tenantId: 8, name: "Pusat", code: "PUSAT", status: "active" }] }] });
    createUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    updateUseMutation.mockReturnValue({ mutate: vi.fn() });
    deleteUseMutation.mockReturnValue({ mutate: vi.fn() });
    resetUseMutation.mockReturnValue({ mutate: vi.fn() });
    useUtils.mockReturnValue({ superadmin: { users: { list: { invalidate: vi.fn() } } } });
  });

  it("menampilkan role platform dan tenant dengan akun Superadmin dilindungi", () => {
    render(<SuperadminUsersPage />);
    expect(screen.getByText("Manajemen seluruh pengguna")).toBeTruthy();
    expect(screen.getAllByText("Superadmin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin Utama").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kasir").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Akun Superadmin dilindungi")).toBeTruthy();
    expect(screen.getAllByTitle("Hapus akses").length).toBe(2);
    fireEvent.click(screen.getAllByTitle("Hapus akses")[0]);
  });
});
