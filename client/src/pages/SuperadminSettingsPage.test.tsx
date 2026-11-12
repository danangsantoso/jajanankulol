import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUseQuery, updateUseMutation, useUtils } = vi.hoisted(() => ({ getUseQuery: vi.fn(), updateUseMutation: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { superadmin: { settings: { get: { useQuery: getUseQuery }, update: { useMutation: updateUseMutation } } }, useUtils } }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("lucide-react", () => ({ MessageCircle: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SuperadminSettingsPage from "./SuperadminSettingsPage";

describe("pengaturan WhatsApp superadmin", () => {
  const mutate = vi.fn();
  beforeEach(() => {
    getUseQuery.mockReturnValue({ data: { whatsappNumber: "6281234567890", whatsappMessage: "Halo dari Jajananku" } });
    updateUseMutation.mockReturnValue({ mutate, isPending: false });
    useUtils.mockReturnValue({ platform: { publicSettings: { invalidate: vi.fn() } }, superadmin: { settings: { get: { invalidate: vi.fn() } } } });
    mutate.mockClear();
  });

  it("merender nomor, pesan awal, dan mengirimkan nilai baru saat disimpan", () => {
    render(<SuperadminSettingsPage />);
    expect(screen.getByText("Pengaturan superadmin")).toBeTruthy();
    expect(screen.getByDisplayValue("6281234567890")).toBeTruthy();
    expect(screen.getByDisplayValue("Halo dari Jajananku")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("6281234567890"), { target: { value: "628999000111" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan pengaturan" }));
    expect(mutate).toHaveBeenCalledWith({ whatsappNumber: "628999000111", whatsappMessage: "Halo dari Jajananku" });
  });
});
