import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loginPasswordUseMutation, workspaceUseQuery, useUtils, useAuthMock, setLocation } = vi.hoisted(() => ({ loginPasswordUseMutation: vi.fn(), workspaceUseQuery: vi.fn(), useUtils: vi.fn(), useAuthMock: vi.fn(), setLocation: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { auth: { loginPassword: { useMutation: loginPasswordUseMutation } }, workspace: { current: { useQuery: workspaceUseQuery } }, useUtils } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("lucide-react", () => ({ ArrowLeft: () => null, KeyRound: () => null, Loader2: () => null, LockKeyhole: () => null, ShieldCheck: () => null, Sparkles: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("wouter", () => ({ useLocation: () => ["/login", setLocation] }));

import LoginPage from "./LoginPage";

describe("halaman login pelanggan", () => {
  const mutate = vi.fn();
  let mutationOptions: { onSuccess?: (data: { user: unknown; redirectPath: string }) => Promise<void> } = {};
  afterEach(cleanup);
  beforeEach(() => {
    loginPasswordUseMutation.mockImplementation(options => { mutationOptions = options; return { mutate, isPending: false }; });
    useAuthMock.mockReturnValue({ user: null, loading: false });
    workspaceUseQuery.mockReturnValue({ data: undefined, isLoading: false });
    useUtils.mockReturnValue({ auth: { me: { setData: vi.fn(), invalidate: vi.fn() } }, workspace: { current: { invalidate: vi.fn() } } });
    mutate.mockClear(); setLocation.mockClear();
  });
  it("menampilkan CTA Google tanpa kredensial contoh", () => {
    render(<LoginPage />);
    expect(screen.getByText("Lanjutkan dengan Google")).toBeTruthy();
    expect(screen.queryByText("Akun contoh")).toBeNull();
    expect(screen.queryByText(/@jajananku\.com/i)).toBeNull();
    expect(screen.queryByText(/admin tenant/i)).toBeNull();
    expect(screen.queryByText(/superadmin/i)).toBeNull();
  });
  it("menampilkan logo Google pada tombol autentikasi", () => {
    render(<LoginPage />);
    const button = screen.getByRole("button", { name: /lanjutkan dengan google/i });
    expect(button.querySelector("svg")).toBeTruthy();
  });
  it("mengirim email dan kata sandi ke mutasi login umum", () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@usaha.com" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "KataSandi123" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk ke aplikasi" }));
    expect(mutate).toHaveBeenCalledWith({ email: "admin@usaha.com", password: "KataSandi123" });
  });
  it("mengikuti redirectPath hasil autentikasi", async () => {
    render(<LoginPage />);
    await mutationOptions.onSuccess?.({ user: { id: 1, role: "admin" }, redirectPath: "/dashboard" });
    expect(setLocation).toHaveBeenCalledWith("/dashboard");
  });
  it.each([
    ["superadmin", "/superadmin"],
    ["admin", "/dashboard"],
    ["cashier", "/pos"],
  ])("mengalihkan sesi aktif role %s tanpa menampilkan login", async (role, expectedPath) => {
    useAuthMock.mockReturnValue({ user: { id: 1, role }, loading: false });
    workspaceUseQuery.mockReturnValue({ data: { onboardingStatus: "complete" }, isLoading: false });
    render(<LoginPage />);
    expect(screen.queryByText("Lanjutkan dengan Google")).toBeNull();
    expect(screen.getByText("Membuka ruang kerja Anda…")).toBeTruthy();
    await waitFor(() => expect(setLocation).toHaveBeenCalledWith(expectedPath));
  });
  it("mengarahkan admin dengan onboarding tertunda ke formulir toko", async () => {
    useAuthMock.mockReturnValue({ user: { id: 2, role: "admin" }, loading: false });
    workspaceUseQuery.mockReturnValue({ data: { onboardingStatus: "pending" }, isLoading: false });
    render(<LoginPage />);
    await waitFor(() => expect(setLocation).toHaveBeenCalledWith("/onboarding"));
  });
  it("mengarahkan akun dengan kata sandi awal ke halaman ganti password sebelum dashboard", async () => {
    useAuthMock.mockReturnValue({ user: { id: 3, role: "admin", passwordChangeRequired: "yes" }, loading: false });
    workspaceUseQuery.mockReturnValue({ data: { onboardingStatus: "complete" }, isLoading: false });
    render(<LoginPage />);
    await waitFor(() => expect(setLocation).toHaveBeenCalledWith("/ganti-password"));
  });
  it("tidak menampilkan formulir saat sesi masih dimuat", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    render(<LoginPage />);
    expect(screen.getByText("Membuka ruang kerja Anda…")).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });
});
