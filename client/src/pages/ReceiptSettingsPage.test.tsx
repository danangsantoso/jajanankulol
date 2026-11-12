import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { settingsUseQuery, updateUseMutation, uploadLogoUseMutation, removeLogoUseMutation, useUtils } = vi.hoisted(() => ({ settingsUseQuery: vi.fn(), updateUseMutation: vi.fn(), uploadLogoUseMutation: vi.fn(), removeLogoUseMutation: vi.fn(), useUtils: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { receiptSettings: { get: { useQuery: settingsUseQuery }, update: { useMutation: updateUseMutation } }, businessLogo: { upload: { useMutation: uploadLogoUseMutation }, remove: { useMutation: removeLogoUseMutation } }, useUtils } }));
vi.mock("@/components/AppBrand", () => ({ JajanankuLogoMark: () => <svg data-brand-mark="jajananku" /> }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("@/components/ui/switch", () => ({ Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void; id?: string }) => <input {...props} type="checkbox" checked={checked} onChange={event => onCheckedChange?.(event.target.checked)} /> }));
vi.mock("lucide-react", () => ({ Bluetooth: () => null, Check: () => null, FileText: () => null, ImagePlus: () => null, Loader2: () => null, Printer: () => null, Save: () => null, Sparkles: () => null, X: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ReceiptSettingsPage from "./ReceiptSettingsPage";

describe("pengaturan struk", () => {
  const mutate = vi.fn();
  beforeEach(() => {
    settingsUseQuery.mockReturnValue({ isLoading: false, data: { template: "standard", paperWidth: "58", autoPrint: "no", receiptFooter: "Terima kasih.", businessName: "Warung Ceria", businessAddress: "Jl. Bahagia", branchName: "Utama" } });
    updateUseMutation.mockReturnValue({ mutate, isPending: false });
    uploadLogoUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    removeLogoUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtils.mockReturnValue({ receiptSettings: { get: { invalidate: vi.fn() } }, businessProfile: { get: { invalidate: vi.fn() } } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it("memilih template, ukuran kertas, cetak otomatis dan menyimpan pengaturan", () => {
    render(<ReceiptSettingsPage />);
    fireEvent.click(screen.getByText("Lengkap"));
    fireEvent.click(screen.getByText("70 mm"));
    fireEvent.click(screen.getByLabelText("Cetak otomatis setelah pembayaran"));
    fireEvent.change(screen.getByLabelText("Ucapan terima kasih"), { target: { value: "Sampai jumpa!" } });
    fireEvent.click(screen.getByText("Simpan pengaturan struk"));
    expect(mutate).toHaveBeenCalledWith({ template: "complete", paperWidth: "70", autoPrint: "yes", receiptFooter: "Sampai jumpa!" });
  });
  it("menyediakan unggah logo dan fallback logo Jajananku untuk struk", () => {
    render(<ReceiptSettingsPage />);
    expect(screen.getByText("Logo usaha pada struk")).toBeTruthy();
    expect(screen.getByText("Unggah logo")).toBeTruthy();
    expect(document.querySelector("[data-brand-mark='jajananku']")).toBeTruthy();
  });
});
