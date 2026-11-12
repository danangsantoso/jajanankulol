import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { productsUseQuery, workspaceUseQuery, saveExportBlob, toDataURL, renderLabelPages, stackCanvasPages, canvasToBlob } = vi.hoisted(() => ({ productsUseQuery: vi.fn(), workspaceUseQuery: vi.fn(), saveExportBlob: vi.fn(), toDataURL: vi.fn(), renderLabelPages: vi.fn(), stackCanvasPages: vi.fn(), canvasToBlob: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { workspace: { current: { useQuery: workspaceUseQuery } }, products: { all: { useQuery: productsUseQuery } } } }));
vi.mock("@/lib/exportDownload", () => ({ saveExportBlob }));
vi.mock("qrcode", () => ({ default: { toDataURL } }));
vi.mock("@/lib/labelCanvasExport", () => ({ canvasToBlob, renderLabelPages, stackCanvasPages }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn() }));
vi.mock("@/components/PageHeading", () => ({ default: ({ title, action }: { title: string; action?: React.ReactNode }) => <><h1>{title}</h1>{action}</> }));
vi.mock("@/components/LabelSheet", () => ({ default: () => <div>Pratinjau label</div> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("lucide-react", () => ({ AlertCircle: () => null, CheckIcon: () => null, CheckSquare2: () => null, ChevronDownIcon: () => null, ChevronUpIcon: () => null, Download: () => null, FileImage: () => null, FileText: () => null, Layers3: () => null, Loader2: () => null, Minus: () => null, Plus: () => null, Printer: () => null, QrCode: () => null, RefreshCw: () => null, Square: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import QrLabelsPage from "./QrLabelsPage";

describe("halaman label QR", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  beforeEach(() => { workspaceUseQuery.mockReturnValue({ data: { branchId: 10, branchName: "Cabang Pusat", isTenantAdmin: true, isBranchAdmin: false, branches: [{ id: 10, name: "Cabang Pusat" }, { id: 11, name: "Cabang Mall" }] } }); toDataURL.mockResolvedValue("data:image/png;base64,qr"); renderLabelPages.mockResolvedValue([document.createElement("canvas")]); stackCanvasPages.mockReturnValue(document.createElement("canvas")); canvasToBlob.mockResolvedValue(new Blob(["label"], { type: "image/jpeg" })); saveExportBlob.mockResolvedValue("downloaded"); });

  it("menampilkan keadaan memuat dan gagal yang bisa dimuat ulang", () => {
    productsUseQuery.mockReturnValue({ isLoading: true, isError: false, refetch: vi.fn() });
    const { rerender } = render(<QrLabelsPage />);
    expect(screen.getByText("Memuat produk untuk label QR…")).toBeTruthy();
    const refetch = vi.fn();
    productsUseQuery.mockReturnValue({ isLoading: false, isError: true, refetch });
    rerender(<QrLabelsPage />);
    fireEvent.click(screen.getByText("Muat ulang label"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("membuat QR satu kali untuk daftar produk yang stabil", async () => {
    productsUseQuery.mockReturnValue({ isLoading: false, isError: false, refetch: vi.fn(), data: [{ id: 1, name: "Keripik", qrCode: "JJN-001", salePrice: 10000, stock: 5, status: "active" }] });
    render(<QrLabelsPage />);
    await waitFor(() => expect(toDataURL).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Keripik")).toBeTruthy();
  });

  it("meminta produk berdasarkan cabang penugasan Admin Cabang", async () => {
    workspaceUseQuery.mockReturnValue({ data: { branchId: 11, branchName: "Cabang Mall", isTenantAdmin: false, isBranchAdmin: true, branches: [{ id: 11, name: "Cabang Mall" }] } });
    productsUseQuery.mockReturnValue({ isLoading: false, isError: false, refetch: vi.fn(), data: [] });
    render(<QrLabelsPage />);
    await waitFor(() => expect(productsUseQuery).toHaveBeenLastCalledWith({ branchId: 11 }));
    expect(screen.getByText("Cabang Mall")).toBeTruthy();
  });

  it("menampilkan keadaan kosong tanpa mencoba membuat QR", () => {
    productsUseQuery.mockReturnValue({ isLoading: false, isError: false, refetch: vi.fn(), data: [] });
    render(<QrLabelsPage />);
    expect(screen.getByText(/Belum ada produk aktif untuk dibuatkan label pada Cabang Pusat/)).toBeTruthy();
    expect(toDataURL).not.toHaveBeenCalled();
  });

  it("menyimpan JPG melalui helper berkas setelah label dipilih dan QR siap", async () => {
    productsUseQuery.mockReturnValue({ isLoading: false, isError: false, refetch: vi.fn(), data: [{ id: 1, name: "Roti Sourdough Normal Cranberry Cheese", qrCode: "JJN-001", salePrice: 10000, stock: 5, status: "active" }] });
    render(<QrLabelsPage />);
    await waitFor(() => expect(toDataURL).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText("Pilih Roti Sourdough Normal Cranberry Cheese"));
    fireEvent.click(screen.getByText("Simpan JPG"));
    await waitFor(() => expect(saveExportBlob).toHaveBeenCalledTimes(1));
    expect(saveExportBlob.mock.calls[0]?.[0]).toMatchObject({ type: "image/jpeg" });
    expect(saveExportBlob.mock.calls[0]?.slice(1)).toEqual([expect.stringMatching(/\.jpg$/), "Label QR Jajananku"]);
    expect(renderLabelPages).toHaveBeenCalledWith(expect.any(Array), expect.any(Object), "standard");
    expect(canvasToBlob).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), "image/jpeg", 0.98);
  });
});
