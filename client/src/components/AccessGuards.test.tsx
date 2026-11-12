import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, workspaceUseQuery } = vi.hoisted(() => ({ authMock: vi.fn(), workspaceUseQuery: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: authMock }));
vi.mock("@/lib/trpc", () => ({ trpc: { workspace: { current: { useQuery: workspaceUseQuery } } } }));
vi.mock("./DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div> }));
vi.mock("wouter", () => ({ Redirect: ({ to }: { to: string }) => <span>redirect:{to}</span> }));
vi.mock("lucide-react", () => ({ Loader2: () => <span>loading</span> }));

import { SuperadminGuard, WorkspaceGuard } from "./AccessGuards";

describe("guard akses", () => {
  beforeEach(() => {
    authMock.mockReturnValue({ loading: false, user: { id: 1, role: "cashier" } });
    workspaceUseQuery.mockReturnValue({ isLoading: false, data: { isTenantAdmin: false }, error: null });
  });

  it("mengalihkan pengguna tanpa sesi ke halaman login", () => {
    authMock.mockReturnValue({ loading: false, user: null });
    render(<WorkspaceGuard><div>konten</div></WorkspaceGuard>);
    expect(screen.getByText("redirect:/login")).toBeTruthy();
  });

  it("mengalihkan akun yang wajib mengganti kata sandi dari ruang kerja dan superadmin", () => {
    authMock.mockReturnValue({ loading: false, user: { id: 1, role: "admin", passwordChangeRequired: "yes" } });
    const { rerender } = render(<WorkspaceGuard><div>konten</div></WorkspaceGuard>);
    expect(screen.getByText("redirect:/ganti-password")).toBeTruthy();
    authMock.mockReturnValue({ loading: false, user: { id: 2, role: "superadmin", passwordChangeRequired: "yes" } });
    rerender(<SuperadminGuard><div>platform</div></SuperadminGuard>);
    expect(screen.getByText("redirect:/ganti-password")).toBeTruthy();
  });

  it("membatasi kasir dari halaman khusus admin tenant", () => {
    render(<WorkspaceGuard adminOnly><div>konten admin</div></WorkspaceGuard>);
    expect(screen.getByText("redirect:/pos")).toBeTruthy();
  });

  it("merender POS kasir tanpa pembungkus sidebar dashboard", () => {
    workspaceUseQuery.mockReturnValue({ isLoading: false, data: { membershipRole: "cashier", isTenantAdmin: false, isBranchAdmin: false }, error: null });
    render(<WorkspaceGuard posOnly><div>POS mandiri</div></WorkspaceGuard>);
    expect(screen.getByText("POS mandiri")).toBeTruthy();
    expect(screen.queryByTestId("layout")).toBeNull();
  });

  it("mengizinkan admin tenant dan superadmin pada ruangnya masing-masing", () => {
    workspaceUseQuery.mockReturnValue({ isLoading: false, data: { isTenantAdmin: true }, error: null });
    const { rerender } = render(<WorkspaceGuard adminOnly><div>konten admin</div></WorkspaceGuard>);
    expect(screen.getByTestId("layout")).toBeTruthy();
    authMock.mockReturnValue({ loading: false, user: { id: 1, role: "superadmin" } });
    rerender(<SuperadminGuard><div>platform</div></SuperadminGuard>);
    expect(screen.getByText("platform")).toBeTruthy();
  });

  it("menolak admin tenant dan kasir dari ruang superadmin", () => {
    const { rerender } = render(<SuperadminGuard><div>platform</div></SuperadminGuard>);
    expect(screen.getByText("redirect:/dashboard")).toBeTruthy();
    authMock.mockReturnValue({ loading: false, user: { id: 1, role: "admin" } });
    rerender(<SuperadminGuard><div>platform</div></SuperadminGuard>);
    expect(screen.getByText("redirect:/dashboard")).toBeTruthy();
  });
});
