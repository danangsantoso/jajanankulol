import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { profileUseQuery, completeUseMutation, useUtils, setLocation, completeOptions } = vi.hoisted(() => ({ profileUseQuery: vi.fn(), completeUseMutation: vi.fn(), useUtils: vi.fn(), setLocation: vi.fn(), completeOptions: { current: null as null | { onSuccess?: () => void } } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, loading: false }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { onboarding: { profile: { useQuery: profileUseQuery }, complete: { useMutation: completeUseMutation } }, useUtils } }));
vi.mock("wouter", () => ({ useLocation: () => ["/onboarding", setLocation] }));
vi.mock("@/components/AppBrand", () => ({ AppBrand: () => <div>Jajananku</div> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("lucide-react", () => ({ Loader2: () => null, MapPin: () => null, Phone: () => null, Store: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import OnboardingPage from "./OnboardingPage";

describe("onboarding usaha", () => {
  const mutate = vi.fn();
  beforeEach(() => {
    profileUseQuery.mockReturnValue({ data: { completed: false, businessName: "Usaha Baru", ownerName: "Dina", email: "dina@usaha.com", whatsappNumber: "", address: "", description: "", trialEndsAt: new Date() }, isLoading: false });
    completeUseMutation.mockImplementation((options: { onSuccess?: () => void }) => { completeOptions.current = options; return { mutate, isPending: false }; });
    useUtils.mockReturnValue({ workspace: { current: { invalidate: vi.fn() } } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("mengirim profil toko untuk mengaktifkan masa coba", () => {
    render(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText("Nama usaha"), { target: { value: "Warung Ceria" } });
    fireEvent.change(screen.getByLabelText("Nama pemilik"), { target: { value: "Dina Putri" } });
    fireEvent.change(screen.getByLabelText("Nomor WhatsApp"), { target: { value: "6281234567890" } });
    fireEvent.change(screen.getByLabelText("Alamat usaha"), { target: { value: "Jalan Bahagia Nomor 10" } });
    fireEvent.click(screen.getByText("Simpan & mulai masa coba"));
    expect(mutate).toHaveBeenCalledWith({ businessName: "Warung Ceria", ownerName: "Dina Putri", whatsappNumber: "6281234567890", address: "Jalan Bahagia Nomor 10", description: null });
  });

  it("mengarahkan ke dashboard setelah penyimpanan onboarding berhasil", async () => {
    render(<OnboardingPage />);
    await completeOptions.current?.onSuccess?.();
    expect(setLocation).toHaveBeenCalledWith("/dashboard");
  });
});
