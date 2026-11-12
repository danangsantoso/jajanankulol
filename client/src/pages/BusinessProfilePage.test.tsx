import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { profileUseQuery, workspaceUseQuery, updateUseMutation, useUtils, setLocation } = vi.hoisted(() => ({
  profileUseQuery: vi.fn(),
  workspaceUseQuery: vi.fn(),
  updateUseMutation: vi.fn(),
  useUtils: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({ trpc: {
  businessProfile: { get: { useQuery: profileUseQuery }, update: { useMutation: updateUseMutation } },
  workspace: { current: { useQuery: workspaceUseQuery } },
  useUtils,
} }));
vi.mock("wouter", () => ({ useLocation: () => ["/profil-usaha", setLocation] }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("lucide-react", () => ({ Building2: () => null, CalendarClock: () => null, CheckCircle2: () => null, CircleAlert: () => null, Loader2: () => null, MapPin: () => null, Phone: () => null, Save: () => null, Store: () => null, UserRound: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BusinessProfilePage from "./BusinessProfilePage";

const profile = {
  completed: true,
  businessName: "Warung Ceria",
  ownerName: "Dina",
  email: "dina@usaha.test",
  whatsappNumber: "628111222333",
  address: "Jalan Bahagia 10",
  description: "Jajanan pasar",
  trialEndsAt: new Date("2026-08-29T12:00:00.000Z"),
  subscriptionEndsAt: null,
};

function mockWorkspace(subscription: { allowed: boolean; state: "trial" | "active" | "expired" | "suspended"; daysRemaining?: number | null; message?: string }) {
  workspaceUseQuery.mockReturnValue({ isLoading: false, data: { branchName: "Cabang Utama", subscription } });
}

describe("halaman profil usaha", () => {
  const mutate = vi.fn();
  beforeEach(() => {
    profileUseQuery.mockReturnValue({ isLoading: false, data: profile });
    mockWorkspace({ allowed: true, state: "trial", daysRemaining: 2 });
    updateUseMutation.mockReturnValue({ mutate, isPending: false });
    useUtils.mockReturnValue({ businessProfile: { get: { invalidate: vi.fn() } }, workspace: { current: { invalidate: vi.fn() } } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("memuat data profil lalu mengirim perubahan toko ke mutasi", () => {
    render(<BusinessProfilePage />);
    expect((screen.getByLabelText("Nama usaha") as HTMLInputElement).value).toBe("Warung Ceria");
    expect((screen.getByLabelText("Nomor WhatsApp") as HTMLInputElement).value).toBe("628111222333");
    fireEvent.change(screen.getByLabelText("Nama pemilik"), { target: { value: "Dina Putri" } });
    fireEvent.change(screen.getByLabelText("Deskripsi usaha (opsional)"), { target: { value: "Jajanan dan minuman" } });
    fireEvent.click(screen.getByText("Simpan perubahan"));
    expect(mutate).toHaveBeenCalledWith({ businessName: "Warung Ceria", ownerName: "Dina Putri", whatsappNumber: "628111222333", address: "Jalan Bahagia 10", description: "Jajanan dan minuman" });
  });

  it("menampilkan status trial, tanggal berakhir, dan sisa hari", () => {
    render(<BusinessProfilePage />);
    expect(screen.getAllByText("Masa coba aktif").length).toBeGreaterThan(0);
    expect(screen.getByText("2 hari tersisa")).toBeTruthy();
    expect(screen.getByText(/Berakhir pada/)).toBeTruthy();
  });

  it("menampilkan status langganan aktif dan masa aktif berakhir", () => {
    mockWorkspace({ allowed: true, state: "active", daysRemaining: 30 });
    const { rerender } = render(<BusinessProfilePage />);
    expect(screen.getAllByText("Langganan aktif").length).toBeGreaterThan(0);
    expect(screen.getByText("30 hari tersisa")).toBeTruthy();
    mockWorkspace({ allowed: false, state: "expired", message: "Masa aktif paket telah berakhir." });
    rerender(<BusinessProfilePage />);
    expect(screen.getAllByText("Masa aktif berakhir").length).toBeGreaterThan(0);
    expect(screen.getByText("Pilih paket")).toBeTruthy();
  });
});
