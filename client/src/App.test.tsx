import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/tooltip", () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./components/AccessGuards", () => ({ WorkspaceGuard: ({ children, adminOnly, tenantOwnerOnly, posOnly }: { children: React.ReactNode; adminOnly?: boolean; tenantOwnerOnly?: boolean; posOnly?: boolean }) => <div data-testid="workspace-guard" data-admin-only={String(!!adminOnly)} data-owner-only={String(!!tenantOwnerOnly)} data-pos-only={String(!!posOnly)}>{children}</div>, SuperadminGuard: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./components/ErrorBoundary", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./components/InstallPrompt", () => ({ default: () => null }));
vi.mock("./contexts/ThemeContext", () => ({ ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./pages/AdminDashboard", () => ({ default: () => <div>halaman-dashboard</div> }));
vi.mock("./pages/CashierPage", () => ({ default: () => <div>halaman-pos</div> }));
vi.mock("./pages/SuperadminPage", () => ({ default: () => <div>halaman-superadmin</div> }));
vi.mock("./pages/LandingPage", () => ({ default: () => <div>halaman-landing</div> }));
vi.mock("./pages/LoginPage", () => ({ default: () => <div>halaman-login</div> }));
vi.mock("./pages/NotFound", () => ({ default: () => <div>halaman-404</div> }));
vi.mock("./pages/ProductsPage", () => ({ default: () => <div /> }));
vi.mock("./pages/QrLabelsPage", () => ({ default: () => <div /> }));
vi.mock("./pages/TransactionsPage", () => ({ default: () => <div /> }));
vi.mock("./pages/FinanceReportPage", () => ({ default: () => <div /> }));
vi.mock("./pages/BranchesPage", () => ({ default: () => <div /> }));
vi.mock("./pages/TeamPage", () => ({ default: () => <div /> }));
vi.mock("./pages/BusinessProfilePage", () => ({ default: () => <div>halaman-profil-usaha</div> }));
vi.mock("./pages/SuperadminSettingsPage", () => ({ default: () => <div /> }));
vi.mock("./pages/SuperadminUsersPage", () => ({ default: () => <div>halaman-superadmin-pengguna</div> }));

import App from "./App";

describe("rute halaman untuk akun demo", () => {
  afterEach(cleanup);
  it.each([
    ["/superadmin", "halaman-superadmin"],
    ["/dashboard", "halaman-dashboard"],
    ["/pos", "halaman-pos"],
    ["/profil-usaha", "halaman-profil-usaha"],
  ])("merender %s pada target %s", (path, expected) => {
    window.history.pushState({}, "", path);
    render(<App />);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it("membungkus profil usaha dengan guard khusus admin tenant", () => {
    window.history.pushState({}, "", "/profil-usaha");
    render(<App />);
    expect(screen.getByTestId("workspace-guard").getAttribute("data-owner-only")).toBe("true");
  });

  it("membungkus daftar transaksi dengan guard admin operasional", () => {
    window.history.pushState({}, "", "/transaksi");
    render(<App />);
    expect(screen.getByTestId("workspace-guard").getAttribute("data-admin-only")).toBe("true");
    expect(screen.getByTestId("workspace-guard").getAttribute("data-owner-only")).toBe("false");
  });

  it("membungkus POS dengan guard yang menolak Admin Cabang", () => {
    window.history.pushState({}, "", "/pos");
    render(<App />);
    expect(screen.getByTestId("workspace-guard").getAttribute("data-pos-only")).toBe("true");
  });
});
