import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, changePasswordUseMutation, useUtils, setLocation } = vi.hoisted(() => ({ authMock: vi.fn(), changePasswordUseMutation: vi.fn(), useUtils: vi.fn(), setLocation: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: authMock }));
vi.mock("@/lib/trpc", () => ({ trpc: { auth: { changeRequiredPassword: { useMutation: changePasswordUseMutation } }, useUtils } }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("lucide-react", () => ({ KeyRound: () => null, Loader2: () => null, ShieldCheck: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("wouter", () => ({ useLocation: () => ["/ganti-password", setLocation] }));

import ChangePasswordPage from "./ChangePasswordPage";

describe("halaman perubahan kata sandi wajib", () => {
  const mutate = vi.fn();
  beforeEach(() => {
    authMock.mockReturnValue({ user: { id: 8, role: "admin", passwordChangeRequired: "yes" }, loading: false });
    changePasswordUseMutation.mockReturnValue({ mutate, isPending: false });
    useUtils.mockReturnValue({ auth: { me: { invalidate: vi.fn() } }, workspace: { current: { invalidate: vi.fn() } } });
    mutate.mockClear();
    setLocation.mockClear();
  });

  it("mengirim kata sandi awal dan kata sandi baru setelah konfirmasi cocok", () => {
    render(<ChangePasswordPage />);
    fireEvent.change(screen.getByLabelText("Kata sandi awal"), { target: { value: "AwalAman123" } });
    fireEvent.change(screen.getByLabelText("Kata sandi baru"), { target: { value: "PribadiAman456" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), { target: { value: "PribadiAman456" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan kata sandi baru" }));
    expect(mutate).toHaveBeenCalledWith({ currentPassword: "AwalAman123", newPassword: "PribadiAman456" });
  });

  it("mengalihkan akun tanpa status wajib ganti kata sandi ke dashboard", () => {
    authMock.mockReturnValue({ user: { id: 8, role: "admin", passwordChangeRequired: "no" }, loading: false });
    render(<ChangePasswordPage />);
    expect(setLocation).toHaveBeenCalledWith("/dashboard");
  });
});
